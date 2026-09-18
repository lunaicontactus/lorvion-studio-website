/**
 * POKO's glasses.
 *
 * Not an asset. The pair that used to be here came over from the older game
 * and was a pair of CSS radial gradients: a white-blue lens fill 59px across
 * on an eye 25px across, a rim 12px thick, and both circles clipped flat by a
 * box only 55px tall. What that draws is a pale rectangular plate over the
 * face — goggles, not glasses — so it is gone, and this is drawn instead.
 *
 * Two small round rims, nothing inside them, and a little bridge. An SVG over
 * the frame in the frame's own coordinates: the boss box carries
 * `aspect-ratio: 292/420` and the image is `object-fit: contain`, so a viewBox
 * of 292×420 lands exactly on the drawing and there is no percentage
 * arithmetic to get wrong.
 *
 * The rim is `non-scaling-stroke`, which is the reason this is SVG: POKO is
 * between 64 and 120px wide depending on the screen, and a rim measured in
 * frame pixels would be a hairline on a phone and a bar on a desktop.
 *
 * The character itself is untouched. Nothing here writes to the sprite.
 */

/** Rim colour and weight. Dark warm brown, thin enough to read as wire. */
const RIM = '#3a2a1e'
const RIM_PX = 1.7
const HINT_PX = 1.2

/**
 * The eyes are 25×27 blobs; the lens is 1.68× the eye's width. Where they are
 * is per frame (src/games/poko/eyes.ts, measured by scripts/eye_measure.py):
 * `look` turns the head 26px either way and `walk` bobs, so one anchor for a
 * pose puts the glasses beside the eyes on half its frames.
 */
export const EYE = 25
export const LENS = Math.round(EYE * 1.68) / 2 // radius, 21px

/** Eye centres for one frame: [left x, right x, y]. */
export type Anchor = readonly [number, number, number]

/** The resting front pose, for a frame with no measurement. */
const FALLBACK_FRONT: Anchor = [107, 185, 189]

/** A pose's glasses, or `null` for a pose with no face in it. */
export type GlassesPose = 'front' | 'sideLeft' | 'sideRight' | null

/** Which drawing goes with which direction. */
export function poseFor(direction: string): GlassesPose {
  if (direction === 'back') return null
  if (direction === 'left') return 'sideLeft'
  if (direction === 'right') return 'sideRight'
  return 'front'
}

function front([l, r, y]: Anchor): string {
  return `
    <circle cx="${l}" cy="${y}" r="${LENS}"/>
    <circle cx="${r}" cy="${y}" r="${LENS}"/>
    <path d="M${l + LENS} ${y - 3} Q${(l + r) / 2} ${y - 8} ${r - LENS} ${y - 3}"/>
    <path d="M${l - LENS} ${y - 2} l-6 2"/>
    <path d="M${r + LENS} ${y - 2} l6 2"/>`
}

/**
 * Walking away. These frames are the back of the head with a sliver of face
 * at the edge and one eye 8px wide on it, so a round lens would hang off the
 * side of the head. What is drawn is the lens at the angle it would be seen
 * at — narrow, inside the silhouette — with the temple running back towards
 * the ear.
 */
function side(dir: -1 | 1, [x, , y]: Anchor): string {
  const rx = 9
  const ry = 19
  // `dir` is the way POKO is walking; the temple runs back from the lens
  // across the head, never out into the air.
  return `
    <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>
    <path d="M${x + dir * rx} ${y - 5} L${x + dir * 46} ${y - 12}"/>`
}

/** A small catch of light on the upper left of each lens. Never a flash. */
function hint(pose: Exclude<GlassesPose, null>, [l, r, y]: Anchor): string {
  const arc = (cx: number, cy: number, rx: number, ry: number): string =>
    `<path d="M${cx - rx * 0.72} ${cy - ry * 0.52} A${rx} ${ry} 0 0 1 ${cx - rx * 0.2} ${cy - ry * 0.86}"/>`
  if (pose === 'front') return arc(l, y, LENS, LENS) + arc(r, y, LENS, LENS)
  return arc(l, y, 9, 19)
}

/**
 * The glasses as a layer over one character. Owns no timer and reads no
 * clock: the game says which pose is showing and whether the boss is
 * straightening them, and that is all.
 */
export class Glasses {
  readonly el: SVGSVGElement
  #pose: GlassesPose | undefined
  #key = ''
  #warning = false

  constructor() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'poko__glasses')
    svg.setAttribute('viewBox', '0 0 292 420')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.dataset['pokoGlasses'] = ''
    this.el = svg
    this.show('front', FALLBACK_FRONT)
  }

  get pose(): GlassesPose | undefined {
    return this.#pose
  }

  /**
   * Which pose, and the eyes of the frame on screen. Redraws only when either
   * changes — a few times a second at walking pace.
   */
  show(pose: GlassesPose, anchor: Anchor | undefined): void {
    const at: Anchor = anchor ?? FALLBACK_FRONT
    const key = `${pose}:${at.join(',')}`
    if (key === this.#key) return
    this.#key = key
    this.#pose = pose
    this.el.dataset['pose'] = pose ?? 'none'
    if (!pose) {
      this.el.innerHTML = ''
      this.el.style.display = 'none'
      return
    }
    this.el.style.removeProperty('display')
    const body = pose === 'front' ? front(at) : side(pose === 'sideLeft' ? -1 : 1, at)
    this.el.innerHTML =
      `<g class="poko__glassRim" fill="none" stroke="${RIM}" stroke-width="${RIM_PX}" stroke-linecap="round"`
      + ` vector-effect="non-scaling-stroke">${body}</g>`
      + `<g class="poko__glassHint" fill="none" stroke="#fff" stroke-width="${HINT_PX}"`
      + ` stroke-linecap="round" vector-effect="non-scaling-stroke">${hint(pose, at)}</g>`
  }

  /**
   * Straightening them: a nudge of a couple of pixels and one catch of light.
   * A lens that goes white is what made the old pair look like a welding mask.
   */
  warn(on: boolean): void {
    if (on === this.#warning) return
    this.#warning = on
    this.el.classList.toggle('is-adjusting', on)
  }
}
