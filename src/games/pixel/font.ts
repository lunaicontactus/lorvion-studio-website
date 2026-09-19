/**
 * The games' lettering for numbers and short words (WORLD 2.1): a 3 × 5
 * bitmap face, drawn in game pixels, so a score or a timer is as chunky as
 * everything else on the screen. Korean words are not in it — those are set
 * in the shell's pixel-style frame, outside the canvas.
 */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  ' ': ['...', '...', '...', '...', '...'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  '.': ['...', '...', '...', '...', '.#.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
  x: ['...', '#.#', '.#.', '#.#', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
}

export const GLYPH = { w: 3, h: 5, gap: 1 } as const

/** How wide `text` is at `scale`, in game pixels. */
export function textWidth(text: string, scale = 1): number {
  const n = [...text].length
  return n ? (n * (GLYPH.w + GLYPH.gap) - GLYPH.gap) * scale : 0
}

/**
 * Draw `text` at (x, y), top-left, in `color`; `shadow` puts a one-pixel
 * dark copy under it, which is what makes small type read on a busy ground.
 */
export function drawText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  color: string, scale = 1, shadow: string | null = '#0b0a14',
): void {
  const put = (dx: number, dy: number, fill: string): void => {
    ctx.fillStyle = fill
    let cx = Math.round(x) + dx
    for (const ch of text.toUpperCase()) {
      const g = GLYPHS[ch] ?? GLYPHS['?']!
      g.forEach((row, gy) => {
        for (let gx = 0; gx < row.length; gx++) {
          if (row[gx] === '#') ctx.fillRect(cx + gx * scale, Math.round(y) + dy + gy * scale, scale, scale)
        }
      })
      cx += (GLYPH.w + GLYPH.gap) * scale
    }
  }
  if (shadow) put(scale, scale, shadow)
  put(0, 0, color)
}
