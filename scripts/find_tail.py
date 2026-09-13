"""Find the phantom tail on the centre line of the back.

Every one of these models grows one in the same place and none of the
references has one. It is always on the mid-line, always on the back, and
always below the waist, so it can be found without being looked for by eye:
walk up the centre line, take how far back the surface reaches in each slice,
and report the slices that reach further than the smooth trend around them.
"""
import sys
import numpy as np
import trimesh


def find(path, x_band=0.030, y_lo=0.08, y_hi=0.34, step=0.01):
    g = list(trimesh.load(path, process=False).geometry.values())[0]
    V = np.unique(np.round(np.asarray(g.vertices), 6), axis=0)
    near = V[np.abs(V[:, 0]) < x_band]
    ys, depth = [], []
    for lo in np.arange(y_lo, y_hi, step):
        m = (near[:, 1] >= lo) & (near[:, 1] < lo + step)
        if m.sum() < 5:
            continue
        ys.append(lo + step / 2)
        depth.append(np.percentile(near[m][:, 2], 2))
    ys, depth = np.array(ys), np.array(depth)
    if len(ys) < 5:
        raise SystemExit('not enough of a centre line to read')
    # A smooth trend through the slices; the tail is what sticks out past it.
    trend = np.convolve(depth, np.ones(5) / 5, mode='same')
    trend[:2], trend[-2:] = depth[:2], depth[-2:]
    excess = trend - depth          # positive where the surface reaches further back
    k = int(np.argmax(excess))
    print(f'{path.split("/")[-1]}')
    for y, d_, t, e in zip(ys, depth, trend, excess):
        flag = '  <== tail' if e > 0.004 else ''
        print(f'  y {y:.3f}  back reach {d_:+.4f}  trend {t:+.4f}  excess {e * 1000:5.1f}mm{flag}')
    print(f'centre  0.0,{ys[k]:.3f},{depth[k]:.4f}   excess {excess[k] * 1000:.1f}mm')


if __name__ == '__main__':
    find(sys.argv[1])
