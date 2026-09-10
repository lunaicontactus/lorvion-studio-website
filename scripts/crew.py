"""
What differs between the five dokkaebi, as far as the render pipeline cares.

Everything else — the camera, the floor row, the crop window, the grade — is
deliberately identical for all five, because that is what makes them look like
five characters standing in one room rather than five separate cut-outs.

What is allowed to differ:

  world_height   how tall this dokkaebi stands in the room, in the room's own
                 units. NOT inherited from the source artwork's pixel size:
                 the five turnarounds were drawn on sheets of two different
                 sizes and at whatever scale suited the drawing, and reading
                 height off that would make NUNU tall because its sheet was
                 cropped tighter. Heights are a design decision, written here.

  amp            how far this one's authored poses swing. A brisk character
                 leans further over the bench than a sleepy one.

  tempo          multiplies the frames in a cycle: more frames is a slower,
                 smoother action at the same fps.

  swell          the idle breath, peak-to-trough.

The numbers are small on purpose. Five characters that each move to their own
completely different rhythm read as five different animations; five that share
a rhythm and vary around it read as five personalities.

On borrowed skeletons
---------------------
Meshy's auto-rigger fails on these characters about half the time, always the
same way: it hands a wrist a slab of the head, which then swings from the
shoulder on every step. Re-rigging usually fixes it, because the rigger is not
deterministic — but RUKI failed three times running, which is the carrier and
not the lottery. Its hair is spikier than the others' and hangs near the
hands, and the rigger keeps deciding that is what a hand is.

So RUKI, YOMI and POKO borrow MOMO's skeleton. This is not a compromise:

  - they are one character design in five colourways, at one set of
    proportions, and the transfer normalises both meshes by their own bounding
    box before matching, so it does not even need them to be the same size;
  - every rig Meshy returns carries the same library walk, so nothing about
    the movement is lost by sharing one;
  - the transfer is the same operation either way. A borrowed skeleton is not
    a worse version of an own skeleton; it is the same code with a source mesh
    that is 95% the same shape instead of 100%.

It also means three fewer remeshes and three fewer rigs — thirty credits, and
three more chances to draw a bad rig that are simply not taken.

NUNU keeps its own, because its second rig passed and its frames were already
rendered from it. Re-rendering thirty-five minutes of frames to make the
provenance tidier would buy nothing anybody can see.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Style:
    id: str
    name: str
    # One height for the whole crew; see the note above. Mirrors
    # NavGraph.height in src/data/navigation.ts.
    world_height: int = 210
    amp: float = 1.00            # authored-pose swing
    tempo: float = 1.00          # >1 = more frames = slower, smoother
    swell: float = 0.009         # idle breath
    pace: float = 1.00           # keep in step with src/data/behaviour.ts
    rig: str = 'momo'            # whose skeleton drives it; see the note above
    walk_frames: int = 8
    idle_frames: int = 4
    # action -> directions worth rendering; 'left' also writes a mirrored right
    plan: dict = field(default_factory=lambda: {
        'work': ['back', 'front'], 'sit': ['front', 'left'],
        'wave': ['front'], 'look': ['front']})


CREW = {s.id: s for s in (
    # MOMO is the one the room was tuned against; her numbers are the baseline.
    Style('momo', 'MOMO', amp=1.00, tempo=1.00, swell=0.009),
    # NUNU is slow and heavy: shallower swings, longer cycles, a deeper breath.
    Style('nunu', 'NUNU', amp=0.88, tempo=1.25, swell=0.012, pace=0.78,
          rig='nunu'),
    # RUKI works: the biggest lean over the bench, and a quick one.
    Style('ruki', 'RUKI', amp=1.12, tempo=0.90, swell=0.008),
    # YOMI is restless: sharp, fast, and never quite still.
    Style('yomi', 'YOMI', amp=1.15, tempo=0.80, swell=0.010, pace=1.15),
    # POKO watches: small movements, held a long time.
    Style('poko', 'POKO', amp=0.82, tempo=1.20, swell=0.007, pace=0.88),
)}
