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
