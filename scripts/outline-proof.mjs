/**
 * Draws every hover outline over the artwork it belongs to and screenshots the
 * result, so a mismatch is visible instead of argued about. Run:
 *   node scripts/outline-proof.mjs
 * Output: e2e/shots/outline-proof-<orientation>.png
 */
import { chromium } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(resolve(root, 'src/data/world.ts'), 'utf8')
const outlines = readFileSync(resolve(root, 'src/data/outlines.ts'), 'utf8')

// The data files are the source of truth; read the numbers straight out of them.
/** Load the path table out of the TypeScript module by stripping its types. */
const paths = await import(
  'data:text/javascript,' +
    encodeURIComponent(
      outlines
        .replace(/export type OutlineShape[\s\S]*?\n\n/, '')
        .replace(/function roundedRect\(([^)]*)\): string/, (_, a) =>
          `function roundedRect(${a.replace(/: number/g, '')})`)
        .replace(/OUTLINE_PATHS[^=]*=/, 'OUTLINE_PATHS =')
        .replace(/export const HIT_PADDING[\s\S]*$/, ''),
    )
).then((m) => m.OUTLINE_PATHS)

function objectsOf(tag) {
  const block = src.split(`export const ${tag}`)[1].split('objects: [')[1].split('\n  ],')[0]
  return [...block.matchAll(
    /\{ id: '([\w-]+)'.*?rect: \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}.*?outline: '(\w+)'/g,
  )].map((m) => ({
    id: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5], shape: m[6],
  }))
}

const worlds = [
  { name: 'landscape', tag: 'DESKTOP_WORLD', w: 3600, art: '/assets/images/garage/room_landscape.webp' },
  { name: 'portrait', tag: 'MOBILE_WORLD', w: 1100, art: '/assets/images/garage/room_portrait.webp' },
]

const browser = await chromium.launch()
mkdirSync(resolve(root, 'e2e/shots'), { recursive: true })

for (const world of worlds) {
  const objs = objectsOf(world.tag)
  const zoom = 1.6
  const tiles = objs.map((o) => {
    const m = 26
    const tw = (o.w + m * 2) * zoom
    const th = (o.h + m * 2) * zoom
    return `<figure style="width:${tw}px">
      <div class="tile" style="width:${tw}px;height:${th}px;
        background-image:url('${world.art}');
        background-position:${-(o.x - m) * zoom}px ${-(o.y - m) * zoom}px;
        background-size:${world.w * zoom}px auto;">
        <svg viewBox="0 0 1 1" preserveAspectRatio="none"
          style="left:${m * zoom}px;top:${m * zoom}px;width:${o.w * zoom}px;height:${o.h * zoom}px">
          <path d="${paths[o.shape]}" vector-effect="non-scaling-stroke"/>
        </svg>
      </div><figcaption>${o.id} · ${o.shape} · ${o.x},${o.y} ${o.w}x${o.h}</figcaption>
    </figure>`
  })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  await page.goto('http://localhost:4173/')
  await page.setContent(`<style>
    body{margin:0;background:#111;color:#fff;font:12px system-ui;
      display:flex;flex-wrap:wrap;gap:14px;padding:14px;align-items:flex-start}
    figure{margin:0}
    .tile{position:relative;image-rendering:auto;background-repeat:no-repeat;
      transform-origin:0 0}
    svg{position:absolute;overflow:visible}
    path{fill:none;stroke:rgba(255,255,255,.95);stroke-width:1.6;stroke-linejoin:round;
      filter:drop-shadow(0 0 3px rgba(255,255,255,.3))}
    figcaption{padding:4px 2px;opacity:.75}
  </style>${tiles.join('')}`)
  await page.waitForLoadState('networkidle')
  const out = resolve(root, `e2e/shots/outline-proof-${world.name}.png`)
  await page.screenshot({ path: out, fullPage: true })
  console.log(out, objs.length, 'objects')
  await page.close()
}
await browser.close()
