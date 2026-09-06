/**
 * The alley layers.
 *
 * The shutter has to land inside the doorway that is painted into the base
 * plate, and the base is cover-fitted, so a layer positioned against the
 * viewport drifts off the doorway as the window changes shape. Everything above
 * the base is therefore placed in percentages of the *plate* — the box the base
 * image actually occupies once cover has been applied — which the scene sizes
 * on every resize.
 *
 * The percentages below were read off the artwork itself: on the landscape
 * plate the doorway opening runs x 40.1-59.8%, y 20.7-69.6% with the blank sign
 * bracket at y 11-18% and the pavement from y 72%; on the portrait plate x
 * 33-67%, y 36-68.5%, bracket y 29-33.5%, pavement from y 71%.
 */

/** Placement in percentages of the plate. Height comes from the art's own ratio. */
export interface LayerPlacement {
  readonly left: number
  readonly width: number
  /** Anchor from the top, or from the bottom when `bottom` is given instead. */
  readonly top?: number
  readonly bottom?: number
  /** A few degrees, so nothing looks lined up by hand. */
  readonly tilt?: number
}

/**
 * What is outside the shutter.
 *
 * A studio that works late leaves evidence: parcels that arrived and were put
 * down, water for the week, cans for the small hours. That is the whole
 * subject — the lane should say someone is in there working, before it says
 * anything else.
 *
 * The fire-spirit pot is gone. It was the brightest, most fantastical thing in
 * the frame and it took the scene; what remains is a delivery-week pile with a
 * couple of small stickers on it, which is as much identity as a doorway needs.
 *
 * Arrangement, against the left wall with the door line kept clear: the parcel
 * stack tallest and furthest back, the can boxes lower and turned the other
 * way in front of it, the water to their right and closer still. No two share
 * a baseline, a width or an angle.
 *
 * The packaging is invented. Nothing here carries a real courier's or a real
 * drinks company's mark.
 */
export type PropName = 'parcelStack' | 'waterPack' | 'zeroCola'

export const PROP_NAMES: readonly PropName[] = ['parcelStack', 'waterPack', 'zeroCola']

const P = '/assets/images/alley'

export const PROP_ART: Readonly<Record<PropName, string>> = {
  parcelStack: `${P}/alley_prop_parcel_stack.webp`,
  waterPack: `${P}/alley_prop_water_pack.webp`,
  zeroCola: `${P}/alley_prop_zero_cola.webp`,
}

export interface AlleyPlate {
  /** Intrinsic size of the base image; the plate keeps this ratio. */
  readonly base: { readonly src: string; readonly w: number; readonly h: number }
  readonly shutter: LayerPlacement
  readonly sign: LayerPlacement
  /** Traces of a working week on the pavement — parcels waiting, one opened,
   *  card flattened against the wall, water and cans by the door. Not
   *  clickable yet; they are separate layers so STEP 4 can make them so. */
  readonly props: Readonly<Record<PropName, LayerPlacement>>
  /** Where the ENTER button sits, as a percentage down the plate. */
  readonly enterY: number
  /** Centre of the painted doorway. The camera pushes in towards this point
   *  and the interior light and silhouette are staged around it. */
  readonly doorway: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
}

const DIR = '/assets/images/alley'

export const ALLEY_LANDSCAPE: AlleyPlate = {
  base: { src: `${DIR}/alley_base_desktop.webp`, w: 2560, h: 1440 },
  shutter: { left: 36.4, top: 18.5, width: 27.2 },
  sign: { left: 42, top: 7, width: 16 },
  // Put down where they were carried in, not arranged: the door line stays
  // clear and nothing shares a baseline.
  props: {
    parcelStack: { left: 11.5, bottom: 20, width: 11, tilt: -1.5 },
    waterPack: { left: 23.9, bottom: 17.4, width: 6.6, tilt: 1.5 },
    zeroCola: { left: 18.2, bottom: 16.2, width: 7.6, tilt: -3 },
  },
  enterY: 84,
  doorway: { x: 49.95, y: 45.15, w: 19.7, h: 48.9 },
}

export const ALLEY_PORTRAIT: AlleyPlate = {
  base: { src: `${DIR}/alley_base_mobile.webp`, w: 1170, h: 2080 },
  shutter: { left: 22, top: 34.2, width: 56 },
  sign: { left: 33, top: 20, width: 34 },
  props: {
    parcelStack: { left: 4, bottom: 20, width: 23, tilt: -1.5 },
    waterPack: { left: 18, bottom: 12.5, width: 14, tilt: 1.5 },
    zeroCola: { left: 8, bottom: 15, width: 18, tilt: -3 },
  },
  enterY: 82,
  doorway: { x: 50, y: 52.25, w: 34, h: 32.5 },
}

/** Intrinsic sizes of the shared cut-outs, used to derive each layer's height. */
export const ALLEY_ART = {
  /** `drum` is how much of the shutter's height is the roll housing at the top.
   *  The housing stays put; only the slats below it roll up into it. */
  shutter: { src: `${DIR}/alley_shutter.webp`, w: 1100, h: 1211, drum: 0.175 },
  sign: { src: `${DIR}/alley_sign.webp`, w: 760, h: 481 },
  parcelStack: { src: `${DIR}/alley_prop_parcel_stack.webp`, w: 496, h: 491 },
  waterPack: { src: `${DIR}/alley_prop_water_pack.webp`, w: 386, h: 483 },
  zeroCola: { src: `${DIR}/alley_prop_zero_cola.webp`, w: 449, h: 480 },
} as const

/** Files the entrance cannot open without. */
export const ALLEY_CRITICAL = ['base', 'shutter'] as const
