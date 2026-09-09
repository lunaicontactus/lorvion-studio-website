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
