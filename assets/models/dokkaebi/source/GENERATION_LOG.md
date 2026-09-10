# Meshy generation log

## MOMO — first prototype

    date        2026-09-09
    task_id     01a085eb-84af-7601-9018-3653a3affbb2
    tool        meshy_multi_image_to_3d
    status      SUCCEEDED
    credits     30

Inputs (in `input/`, cut from `momo_tpose_master_1448x1086.png`):

    momo_t_front.png   688x853   figure 502x667   T-pose
    momo_t_left.png    561x838   figure 379x656   profile, arm forward
    momo_t_back.png    684x848   figure 500x664   T-pose

Parameters:

    ai_model            latest (meshy-7)
    pose_mode           t-pose
    model_type          standard
    should_texture      true
    texture_resolution  2k
    enable_pbr          false
    topology            triangle
    target_polycount    30000        <- IGNORED, see below
    remove_lighting     true
    target_formats      ["glb"]

Result: 1,399,230 triangles / 1,868,187 vertices, 75.5 MB GLB, one material,
one 2048x2048 base colour JPEG. No skin, no animations.

`target_polycount` had no effect because `should_remesh` defaults to false on
meshy-6/meshy-7. To get the polycount honoured at generation time, pass
`should_remesh: true` as well.

Almost all of the geometry is in the fur: local decimation
(`gltf-transform weld` then `simplify`) stalls at ~771k triangles regardless of
the error tolerance, because the fur is a mass of short strands with UV seams
that meshoptimizer will not collapse across.

The raw output is not committed — 75 MB does not belong in a repository that
deploys from it. What is committed is everything needed to make it again: the
master art, the three cut views, and the parameters above.


## MOMO — remesh to 30k (option A)

    date        2026-09-09
    task_id     01a08615-3c11-7079-bacc-e67ea37e9e72
    tool        meshy_remesh
    status      SUCCEEDED
    credits     5

    input_task_id     01a085eb-84af-7601-9018-3653a3affbb2
    target_polycount  30000
    topology          triangle
    origin_at         bottom
    target_formats    ["glb"]

Result: 28,330 triangles / 62,381 vertices, 2.07 MB, origin on the floor
(y min = 0), height 1.82 units. Polycount hit the target exactly.

Two things it does not give you:

**No base colour.** The remesh output carries geometry, new UVs and a baked
2048 normal map — and no material and no base colour texture. The original
atlas cannot be reused because the remesh re-unwraps: sampling the old texture
through the new UVs lands everywhere at once. Colouring it needs
`meshy_retexture` (10 credits) or a hand bake.

**The face does not survive.** At 28k the eyes flatten into hollow dents, the
nose and mouth go, and the fur becomes jagged spikes. The raw model has a
correct face — brows, glossy eyes, nose, smile, blush — so this is decimation
damage, not a generation fault. See the renders in this session.

Almost the whole polygon budget is fur. A character whose silhouette is 60%
hair cannot be decimated to 30k and stay recognisable.

## Note for whoever renders these

glTF UV origin is top-left: texture row = `v * height`, NOT `(1 - v) * height`.
Flipping it makes every model look like a flat pink blob with a broken face,
which cost a full round of wrong conclusions here.


## MOMO — rig (option D, approved)

    date        2026-09-09
    task_id     01a0864c-2fc8-74b2-8c4b-8a5360c7a0a2
    tool        meshy_rig
    status      SUCCEEDED
    credits     5

    input_task_id  01a08615-...  (the 28k remesh)

Rigging refuses a mesh over 300,000 faces and the master is 1,399,230, so the
28k remesh was used as the input — for its skeleton only, never its pixels.
Result: 24 joints, JOINTS_0/WEIGHTS_0 skinning, and free walking (1.07s) and
running (0.67s) clips.

`scripts/pose.py` moves that skeleton onto the master: both meshes are
normalised by their own bounding box (the remesh is 4% shorter and sits on a
different origin), every master vertex takes the joint indices and weights of
the nearest rigged vertex, and the animation is sampled by walking the node
hierarchy. So the animation plays on the mesh with the good face.

The rigged model's own clip is a static T-pose, so the standing pose is taken
from the walk cycle instead — the phase where the feet are closest together,
t = 0.844s. Arms hang, feet under the body.

Running total: 40 credits (30 generate + 5 remesh + 5 rig).


## NUNU

    date        2026-09-10
    generate    01a08a95-dbf0-711f-8257-825a142fdb5e   30 credits
    remesh      01a08a9a-7984-77da-afc0-525014c7d37f    5 credits
    rig (1st)   01a08a9c-7ebf-7276-b19a-1bed5c767291    5 credits   REJECTED
    rig (2nd)   01a08aaa-4b7f-74c3-8404-edd1fe0e717e    5 credits   used
                                                        45 credits

Same parameters as MOMO, from `input/nunu_t_{front,left,back}.png`, cut by
`scripts/cut_views.py` from the turnaround sheet. Result: 1,908,352 triangles,
2,514,063 vertices. Likeness is good from all four angles including the
three-quarter the generator was never shown.

**The first rig was broken, and the second was not.**

Meshy's rigger gave `RightHand` 11,091 of the carrier's 68,530 vertices — the
whole right side of the head. The master inherited it through the weight
transfer, and NUNU walked with a wedge of hair swinging off its shoulder.

It took a while to find because every plausible suspect was innocent: the
weight transfer was *better* than MOMO's by nearest-neighbour distance (p95
0.011 against 0.031), rest pose and inverse bind matrices agreed to within
floating point on both, and the animated hips tilt matched MOMO's to a degree
at every phase of the clip. Rendering the carrier's own mesh with its own
weights is what settled it: the defect was already there, before any of my
code touched it.

Neither obvious repair works, and it is worth writing down why:

  distance   these characters are chubby and their bones are tiny. MOMO's Head
             bone is 4% of her height and correctly owns hair half a height
             away — further than any of NUNU's bad weights reached. No
             distance threshold separates them.
  connectivity  the bad region came back as one solid blob of 11,012 vertices,
             and the real hand was not in it. There was nothing to split.

What does separate them is symmetry: LeftHand owned nothing at all. That is
now checked before every render (`weight_check` in scripts/pose.py) — the
threshold has a factor of three of room either side, since MOMO's worst
asymmetric pair is 2% of her carrier and NUNU's bad hand was 16%.

Re-rigging the identical input produced a clean rig, so the rigger is not
deterministic. One retry, five credits, no loop.

Gait: 90.8 world units per cycle against MOMO's 89.0, walked at 0.78 pace, so
eight frames must play at 6.87fps. Measured in the browser over 38 cycles:
91.0 median against 90.8 rendered.

Frames: 93, all 342x420, foot gap 2px on every one.

## RUKI

    date        2026-09-10
    generate    01a08ba6-88f5-74b4-b419-b55a1394ab88   30 credits
    remesh      01a08bab-a375-7305-a18a-a99520e7b5ac    5 credits
    rig (1st)   01a08bae-4e6b-762b-9e1f-5c2c0ff85e74    5 credits   REJECTED
    rig (2nd)   01a08bb0-6548-77c3-99c1-b2d28267e65b    5 credits   REJECTED
    rig (3rd)   01a08bb2-d780-76e4-aa34-4926391b9a3d    5 credits   REJECTED
                                                       50 credits

Result: 1,882,154 triangles. Likeness good — sage fur, red horns, the green
leopard briefs, all four angles.

**All three rigs were broken, and that is what stopped the retries.**

    1st   LeftHand 15,948 vertices, RightHand 0
    2nd   LeftHand 17,411 (28% of the mesh), RightHand 14,159 (22%)
    3rd   LeftHand 13,637 (22%), RightHand 0

The second one is why `weight_check` has two rules rather than one. It is
symmetric — both hands wrong by roughly the same amount — so the symmetry
rule that caught NUNU passed it happily. What gives it away is size: a healthy
rig leaves the head owning 93% of these characters, because they are mostly
fur and the fur is on the head. RUKI's second rig left the head 42%.

Three failures on one carrier is not the lottery, it is the carrier. RUKI's
hair is spikier than the others' and hangs down near the hands, and the
rigger keeps deciding that is what a hand is. A fourth attempt would have
been the retry loop this project does not do.

## The crew skeleton

RUKI, YOMI and POKO are driven by MOMO's skeleton. Tested before adopting:
RUKI's master rendered under MOMO's rig and under its own third rig, side by
side, at three phases of the walk — MOMO's is clean and RUKI's own drags the
hair off the shoulder.

This works because the five are one character design in five colourways at
one set of proportions, and `Skinner` normalises both meshes by their own
bounding box before matching, so it does not even require them to be the same
size. Every rig Meshy returns carries the same library walk, so nothing about
the movement is given up by sharing one.

Consequence: YOMI and POKO were generated and nothing else. No remesh, no rig
— thirty credits saved, and two more chances to draw a bad rig not taken.

    yomi    generate  01a08bb6-baa6-7430-bb92-dabd0a74d85e   30 credits
    poko    generate  01a08bbc-462b-72ed-b64e-3182ac38110b   30 credits

## Credits

    MOMO    40    (earlier session)
    NUNU    45
    RUKI    50
    YOMI    30
    POKO    30
    ----------
    total  195    of which 20 went on rigs that were thrown away

RUKI, YOMI and POKO's turnaround sheets carry FRONT / SIDE / BACK captions
under the figures. `scripts/cut_views.py` trims them at the blank band between
the feet and the lettering rather than at a fixed fraction — the toes come
within a few pixels of the caption, and any margin wide enough to be safe from
the lettering takes the feet with it.
