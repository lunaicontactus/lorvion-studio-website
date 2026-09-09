# Dokkaebi 3D models

Two directories, because this repository already separates what ships from
what is merely kept:

    assets/models/dokkaebi/source/              Meshy originals. NOT deployed.
    public/assets/models/dokkaebi/optimized/    Web GLB. Served at
                                                /assets/models/dokkaebi/optimized/…

Everything under `public/` is copied verbatim into `dist/` and published to
eungarage.com, so a raw Meshy export — multi-megabyte, 4K textures, often FBX
or OBJ alongside the GLB — must not live there. It goes in `source/`, and the
decimated, texture-compressed GLB goes in `optimized/`.

`dist/` is 8.5MB today. A single unoptimised character can be larger than the
whole site, so check the size of what you put in `optimized/` before
committing it.

## Generation approval gate

Meshy calls spend real credits. These rules hold for every session:

1. **No generation without an explicit "생성해" from the user.** Connecting,
   listing tools, reading task status of an existing task and checking the
   balance are free; anything that makes a model is not.
2. **One dokkaebi at a time.** Never a batch.
3. **No automatic variations.** One prompt, one model, then stop.
4. **Reuse first.** Before generating, check `source/` and the existing
   Meshy workspace (`meshy_list_models`) for something that already fits.
5. **Review before the next one.** The first result is looked at by the user
   before a second generation is started.
6. **No credit-consuming retry without asking.** A failed or disappointing
   result is reported, not silently re-rolled.
7. **No retry loops.** An error is reported once. It is never handled by
   calling the same tool again.

Credit-spending tools in `@meshy-ai/meshy-mcp-server`: `meshy_text_to_3d`,
`meshy_text_to_3d_refine`, `meshy_image_to_3d`, `meshy_multi_image_to_3d`,
`meshy_text_to_image`, `meshy_image_to_image`, `meshy_remesh`,
`meshy_retexture`, `meshy_rig`, `meshy_animate`, `meshy_creative_lab`.

Free: `meshy_check_balance`, `meshy_get_task_status`, `meshy_list_tasks`,
`meshy_list_models`, `meshy_cancel_task`, `meshy_download_model`.
