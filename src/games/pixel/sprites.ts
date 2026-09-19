/**
 * The cast, in pixels (WORLD 2.1).
 *
 * The games do not have new characters: they have the same five, drawn from
 * the same approved frames the garage uses, brought down to a handheld's
 * size. Each frame is reduced to a few dozen pixels tall, its colours
 * stepped to a small set (so a face is three or four flat colours, as a
 * sprite's would be), its edge made hard, and a one-pixel dark outline put
 * round it so it reads against any ground. Nothing about a face is redrawn;
 * the pixels are the frame's own, just fewer of them.
 *
 * Results are cached per frame and height: a game pays for it once.
 */
import { loadImage } from '@/systems/assets'

export interface PixelSprite {
  readonly canvas: HTMLCanvasElement
  readonly w: number
  readonly h: number
  /**
   * Where the source frame's pixels landed, for drawing something at a
   * measured point of the frame (POKO's eyes): sprite x = pad + (x − sx) · k.
   */
  readonly map?: { readonly sx: number; readonly sy: number; readonly k: number; readonly pad: number }
}

export interface PixelizeOptions {
  /** How many steps each colour channel is quantised to. */
  readonly levels?: number
  /** The outline colour, or null for none. */
  readonly outline?: string | null
  /** Trim transparent margins before sizing, so the height is the figure's. */
  readonly trim?: boolean
}

const cache = new Map<string, Promise<PixelSprite | null>>()

/** An approved frame, as a pixel sprite `height` pixels tall. */
export function pixelize(src: string, height: number, opts: PixelizeOptions = {}): Promise<PixelSprite | null> {
  const key = `${src}@${height}:${opts.levels ?? 6}:${opts.outline ?? '#120d14'}:${opts.trim ?? true}`
  const hit = cache.get(key)
  if (hit) return hit
  const p = loadImage(src).then((loaded) => {
    if (!loaded.ok || !loaded.image) return null
    return fromImage(loaded.image, height, opts)
  })
  cache.set(key, p)
  return p
}

export function fromImage(img: HTMLImageElement | HTMLCanvasElement, height: number, opts: PixelizeOptions = {}): PixelSprite {
  const levels = opts.levels ?? 6
  const outline = opts.outline === undefined ? '#120d14' : opts.outline
  const iw = 'naturalWidth' in img ? img.naturalWidth : img.width
  const ih = 'naturalHeight' in img ? img.naturalHeight : img.height
  // 1. Where the figure actually is.
  let sx = 0, sy = 0, sw = iw, sh = ih
  if (opts.trim ?? true) {
    const probe = document.createElement('canvas')
    const pw = Math.min(iw, 256)
    const ph = Math.max(1, Math.round(ih * (pw / iw)))
    probe.width = pw
    probe.height = ph
    const p = probe.getContext('2d', { willReadFrequently: true })!
    p.drawImage(img, 0, 0, pw, ph)
    const d = p.getImageData(0, 0, pw, ph).data
    let x0 = pw, y0 = ph, x1 = -1, y1 = -1
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        if (d[(y * pw + x) * 4 + 3]! > 24) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    if (x1 >= x0 && y1 >= y0) {
      const k = iw / pw
      sx = Math.floor(x0 * k)
      sy = Math.floor(y0 * k)
      sw = Math.ceil((x1 - x0 + 1) * k)
      sh = Math.ceil((y1 - y0 + 1) * k)
    }
  }
  // 2. Down to size, averaged (smoothing on for the reduction itself).
  const pad = outline ? 1 : 0
  const h = Math.max(1, height)
  const w = Math.max(1, Math.round(sw * (h / sh)))
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const s = small.getContext('2d', { willReadFrequently: true })!
  s.imageSmoothingEnabled = true
  s.imageSmoothingQuality = 'high'
  s.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  const data = s.getImageData(0, 0, w, h)
  const px = data.data
  // 3. Hard edges and a few flat colours.
  const step = 255 / Math.max(1, levels - 1)
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3]! < 110) {
      px[i + 3] = 0
      continue
    }
    px[i + 3] = 255
    px[i] = Math.round(Math.round(px[i]! / step) * step)
    px[i + 1] = Math.round(Math.round(px[i + 1]! / step) * step)
    px[i + 2] = Math.round(Math.round(px[i + 2]! / step) * step)
  }
  s.putImageData(data, 0, 0)
  // 4. The outline, one pixel, round the whole figure.
  const out = document.createElement('canvas')
  out.width = w + pad * 2
  out.height = h + pad * 2
  const o = out.getContext('2d')!
  if (outline) {
    const solid = o.createImageData(out.width, out.height)
    const [r, g, b] = hex(outline)
    const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3]! > 0
    for (let y = -1; y <= h; y++) {
      for (let x = -1; x <= w; x++) {
        if (at(x, y)) continue
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
          const i = ((y + pad) * out.width + (x + pad)) * 4
          solid.data[i] = r
          solid.data[i + 1] = g
          solid.data[i + 2] = b
          solid.data[i + 3] = 255
        }
      }
    }
    o.putImageData(solid, 0, 0)
  }
  o.drawImage(small, pad, pad)
  return { canvas: out, w: out.width, h: out.height, map: { sx, sy, k: h / sh, pad } }
}

/** The same sprite, facing the other way. */
export function mirrored(sprite: PixelSprite): PixelSprite {
  const c = document.createElement('canvas')
  c.width = sprite.w
  c.height = sprite.h
  const x = c.getContext('2d')!
  x.translate(sprite.w, 0)
  x.scale(-1, 1)
  x.drawImage(sprite.canvas, 0, 0)
  return { canvas: c, w: sprite.w, h: sprite.h }
}

/**
 * A sprite drawn from rows of characters, for the things the games need
 * that no delivered picture is: a ghost, a heart, a star, a crate. Each
 * character is a colour from `palette`; `.` and space are clear.
 */
export function fromRows(rows: readonly string[], palette: Readonly<Record<string, string>>): PixelSprite {
  const h = rows.length
  const w = Math.max(...rows.map((r) => r.length))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const x = c.getContext('2d')!
  rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) {
      const col = palette[row[i]!]
      if (!col) continue
      x.fillStyle = col
      x.fillRect(i, y, 1, 1)
    }
  })
  return { canvas: c, w, h }
}

function hex(c: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c)
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : [0, 0, 0]
}
