"""
Drive the high-resolution master mesh with the rigged model's skeleton.

Meshy will only rig a mesh of 300,000 faces or fewer, and the master is
1,399,230 — but the master is the one with the face on it. The 28k remesh has
the skeleton and a wrecked face; the master has the face and no skeleton. So
the skeleton is moved onto the master rather than the face being given up:

  1. both meshes are put in the same normalised space (they are the same
     character in the same T-pose, but the remesh is 4% shorter and sits on
     a different origin, so neither raw coordinates nor raw scale line up)
  2. every master vertex takes the joint indices and weights of the nearest
     rigged vertex — weights vary smoothly over a surface, so nearest
     neighbour is enough and there is nothing to tune
  3. the animation is sampled at a time, joint matrices are built by walking
     the node hierarchy, and the master is deformed by those matrices

The alternative was rigging the 28k and living with the face, or paying for
another remesh at a polycount that might keep it. This costs nothing and
keeps the good geometry.
"""
import json
import struct
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

COMPONENT = {5120: 'i1', 5121: 'u1', 5122: 'i2', 5123: 'u2', 5125: 'u4', 5126: 'f4'}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class Gltf:
    def __init__(self, path):
        data = Path(path).read_bytes()
        off, chunks = 12, {}
        while off < len(data):
            clen, ctype = struct.unpack('<II', data[off:off + 8])
            off += 8
            chunks[ctype] = data[off:off + clen]
            off += clen
        self.j = json.loads(chunks[0x4E4F534A].decode('utf-8'))
        self.bin = chunks[0x004E4942]

    def acc(self, i):
        a = self.j['accessors'][i]
        bv = self.j['bufferViews'][a['bufferView']]
        start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = NCOMP[a['type']]
        arr = np.frombuffer(self.bin, dtype=np.dtype('<' + COMPONENT[a['componentType']]),
                            count=a['count'] * n, offset=start)
        return arr.reshape(a['count'], n) if n > 1 else arr

    def prim(self, mesh=0, p=0):
        return self.j['meshes'][mesh]['primitives'][p]


def _quat(q):
    x, y, z, w = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def _trs(node, extra=None):
    """The node's local matrix, optionally with a rotation added at the joint.

    `extra` goes between the translation and the node's own rotation — that is
    what "rotating a joint" means. Multiplying it on at the end instead rotates
    in the bone's own frame, which is a twist along the bone rather than a
    swing of it, and produces poses that look almost right and are not.
    """
    if 'matrix' in node:
        m = np.array(node['matrix'], np.float64).reshape(4, 4).T
        if extra is None:
            return m
        t = m[:3, 3].copy()
        m[:3, 3] = 0
        out = extra @ m
        out[:3, 3] = t
        return out
    m = np.eye(4)
    if 'scale' in node:
        m[:3, :3] = np.diag(node['scale'])
    if 'rotation' in node:
        m[:3, :3] = _quat(node['rotation']) @ m[:3, :3]
    if extra is not None:
        m = extra @ m
    if 'translation' in node:
        m[:3, 3] = node['translation']
    return m


def _slerp(a, b, t):
    d = float(np.dot(a, b))
    if d < 0:
        b, d = -b, -d
    if d > 0.9995:
        q = a + t * (b - a)
        return q / np.linalg.norm(q)
    th0 = np.arccos(d)
    th = th0 * t
    q2 = b - a * d
    q2 /= np.linalg.norm(q2)
    return a * np.cos(th) + q2 * np.sin(th)


class Rigged:
    """A rigged glTF, sampled at a time."""

    def __init__(self, path):
        g = self.g = Gltf(path)
        p = g.prim()
        self.V = g.acc(p['attributes']['POSITION']).astype(np.float64)
        self.J = g.acc(p['attributes']['JOINTS_0']).astype(np.int32)
        self.W = g.acc(p['attributes']['WEIGHTS_0']).astype(np.float64)
        skin = g.j['skins'][0]
        self.joints = skin['joints']
        self.ibm = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
        self.nodes = g.j['nodes']
        self.parent = {}
        for i, n in enumerate(self.nodes):
            for c in n.get('children', []):
                self.parent[c] = i
        anims = g.j.get('animations', [])
        self.anim = anims[0] if anims else None
        self.duration = 0.0
        if self.anim:
            for s in self.anim['samplers']:
                a = g.j['accessors'][s['input']]
                if 'max' in a:
                    self.duration = max(self.duration, float(a['max'][0]))

    def _sampled_trs(self, t):
        """Node TRS overrides at time `t`, from the animation channels."""
        out = {}
        if not self.anim:
            return out
        for ch in self.anim['channels']:
            s = self.anim['samplers'][ch['sampler']]
            node = ch['target']['node']
            path = ch['target']['path']
            times = self.g.acc(s['input']).astype(np.float64).ravel()
            vals = self.g.acc(s['output']).astype(np.float64)
            tt = float(np.clip(t, times[0], times[-1]))
            i = int(np.searchsorted(times, tt, 'right') - 1)
            i = max(0, min(i, len(times) - 2)) if len(times) > 1 else 0
            if len(times) == 1:
                v = vals[0]
            else:
                span = times[i + 1] - times[i]
                u = 0.0 if span <= 0 else (tt - times[i]) / span
                if s.get('interpolation') == 'STEP':
                    v = vals[i]
                elif path == 'rotation':
                    v = _slerp(vals[i], vals[i + 1], u)
                else:
                    v = vals[i] * (1 - u) + vals[i + 1] * u
            out.setdefault(node, {})[path] = v
        return out

    def joint_matrices(self, t):
        over = self._sampled_trs(t)
        local = []
        for i, n in enumerate(self.nodes):
            node = dict(n)
            if i in over:
                node.pop('matrix', None)
                node.update({k: list(v) for k, v in over[i].items()})
            local.append(_trs(node))
        glob = {}

        def world(i):
            if i in glob:
                return glob[i]
            p = self.parent.get(i)
            glob[i] = local[i] if p is None else world(p) @ local[i]
            return glob[i]

        return np.stack([world(j) @ self.ibm[k] for k, j in enumerate(self.joints)])


def _euler(x=0.0, y=0.0, z=0.0):
    """Degrees about X, then Y, then Z, as a 4x4."""
    rx, ry, rz = np.radians([x, y, z])
    cx, sx = np.cos(rx), np.sin(rx)
    cy, sy = np.cos(ry), np.sin(ry)
    cz, sz = np.cos(rz), np.sin(rz)
    X = np.array([[1, 0, 0, 0], [0, cx, -sx, 0], [0, sx, cx, 0], [0, 0, 0, 1]])
    Y = np.array([[cy, 0, sy, 0], [0, 1, 0, 0], [-sy, 0, cy, 0], [0, 0, 0, 1]])
    Z = np.array([[cz, -sz, 0, 0], [sz, cz, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])
    return Z @ Y @ X


def _between(a, b):
    """The rotation that takes unit vector `a` onto unit vector `b`."""
    a = a / (np.linalg.norm(a) + 1e-12)
    b = b / (np.linalg.norm(b) + 1e-12)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if c < -0.999999:
        # Opposite: any perpendicular axis will do.
        axis = np.cross(a, [1.0, 0, 0])
        if np.linalg.norm(axis) < 1e-6:
            axis = np.cross(a, [0, 1.0, 0])
        axis /= np.linalg.norm(axis)
        K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
        r = np.eye(3) + 2 * (K @ K)
    else:
        K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
        r = np.eye(3) + K + K @ K / (1 + c)
    m = np.eye(4)
    m[:3, :3] = r
    return m


class Posed(Rigged):
    """A rig driven by named joint rotations instead of a clip.

    The rigged model arrives holding a T-pose and one walk. Everything else the
    room needs — leaning over the bench, sitting down, waving, glancing across
    the room — is a handful of angles on joints that are already named
    (Hips, Spine, LeftArm, Head and the rest), so it can be written down here
    rather than bought.

    Angles are degrees applied on top of the bind pose, in the joint's own
    space. Which way is positive is not guessable from the file; it was found
    by rendering one joint at a time and looking.
    """

    def __init__(self, path):
        super().__init__(path)
        self.by_name = {n.get('name'): i for i, n in enumerate(self.nodes)}

    def aim(self, joint, child, direction, base_t=None):
        """The rotation that points `joint`'s bone at `direction` in world space.

        Guessing which euler axis swings a bone is a losing game: a rig's bones
        point wherever the rigger's solver left them, and the answer differs
        per joint. Naming the direction the limb should end up pointing is
        unambiguous, and it is what a pose actually means — "arm up and out",
        not "Z minus a hundred and twenty".
        """
        M = self.joint_matrices({}, base_t) if False else None
        world = self._world_matrices(base_t)
        j = self.by_name[joint]
        c = self.by_name[child]
        here = world[j][:3, 3]
        there = world[c][:3, 3]
        current = there - here
        want = np.array(direction, np.float64)
        # Express the swing in the joint's parent frame, where its local
        # rotation lives.
        par = self.parent.get(j)
        basis = world[par][:3, :3] if par is not None else np.eye(3)
        inv = np.linalg.inv(basis)
        return _between(inv @ current, inv @ want)

    def _world_matrices(self, base_t=None):
        over = self._sampled_trs(base_t) if base_t is not None else {}
        local = []
        for i, n in enumerate(self.nodes):
            node = dict(n)
            if i in over:
                node.pop('matrix', None)
                node.update({k: list(v) for k, v in over[i].items()})
            local.append(_trs(node))
        glob = {}

        def world(i):
            if i in glob:
                return glob[i]
            par = self.parent.get(i)
            glob[i] = local[i] if par is None else world(par) @ local[i]
            return glob[i]

        for i in range(len(self.nodes)):
            world(i)
        return glob

    def joint_matrices_for(self, angles, base_t=None):
        """Angles on top of a base pose.

        `base_t` samples the walk clip first, so a written pose starts from the
        stance the room is already showing rather than from the T-pose. Without
        it every authored pose would snap the arms back out to the sides on the
        way in.
        """
        over = self._sampled_trs(base_t) if base_t is not None else {}
        local = []
        for i, n in enumerate(self.nodes):
            node = dict(n)
            if i in over:
                node.pop('matrix', None)
                node.update({k: list(v) for k, v in over[i].items()})
            a = angles.get(n.get('name'))
            extra = None
            if a is not None:
                # Either three degrees, or a 4x4 from aim().
                extra = a if isinstance(a, np.ndarray) else _euler(*a)
            local.append(_trs(node, extra))
        glob = {}

        def world(i):
            if i in glob:
                return glob[i]
            par = self.parent.get(i)
            glob[i] = local[i] if par is None else world(par) @ local[i]
            return glob[i]

        return np.stack([world(j) @ self.ibm[k] for k, j in enumerate(self.joints)])


class Skinner:
    """Master mesh + borrowed skeleton."""

    def __init__(self, master_V, rigged: Rigged):
        self.rig = rigged
        # Same character, different scale and origin: normalise both by their
        # own bounding box before matching, then keep the transform so the
        # master can be moved into rig space and deformed there.
        def norm(V):
            lo, hi = V.min(0), V.max(0)
            c = (lo + hi) / 2
            s = float(hi[1] - lo[1])
            return (V - c) / s, c, s

        mn, mc, ms = norm(master_V)
        rn, rc, rs = norm(rigged.V)
        tree = cKDTree(rn)
        _, nn = tree.query(mn, k=1, workers=-1)
        self.J = rigged.J[nn]
        w = rigged.W[nn]
        self.W = w / np.maximum(w.sum(1, keepdims=True), 1e-9)
        # master -> rig space
        self.to_rig = lambda V: (V - mc) / ms * rs + rc
        self.from_rig = lambda V: (V - rc) / rs * ms + mc
        self.V_rig = self.to_rig(master_V)

    def deform(self, t):
        return self._apply(self.rig.joint_matrices(t))

    def deform_pose(self, angles, base_t=None):
        """Skin the master to a hand-written pose."""
        return self._apply(self.rig.joint_matrices_for(angles, base_t))

    def _apply(self, M):
        P = np.concatenate([self.V_rig, np.ones((len(self.V_rig), 1))], 1)
        out = np.zeros((len(P), 3))
        for k in range(self.J.shape[1]):
            w = self.W[:, k]
            live = w > 1e-5
            if not live.any():
                continue
            m = M[self.J[live, k]]
            out[live] += w[live, None] * np.einsum('nij,nj->ni', m[:, :3, :], P[live])
        return self.from_rig(out).astype(np.float32)
