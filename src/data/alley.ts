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
 * bracket at y 11-18%; on the portrait plate x 33-67%, y 36-68.5% with the
 * bracket at y 29-33.5%.
 */

/** Placement in percentages of the plate. Height comes from the art's own ratio. */
export interface LayerPlacement {
  readonly left: number
  readonly width: number
  /** Anchor from the top, or from the bottom when `bottom` is given instead. */
  readonly top?: number
  readonly bottom?: number
}

export interface AlleyPlate {
  /** Intrinsic size of the base image; the plate keeps this ratio. */
  readonly base: { readonly src: string; readonly w: number; readonly h: number }
  readonly shutter: LayerPlacement
  readonly sign: LayerPlacement
  readonly props: LayerPlacement
  /** Where the ENTER button sits, as a percentage down the plate. */
  readonly enterY: number
  /** How far the shutter travels to clear the doorway, in multiples of itself. */
  readonly lift: number
}

const DIR = '/assets/images/alley'

export const ALLEY_LANDSCAPE: AlleyPlate = {
  base: { src: `${DIR}/alley_base_desktop.webp`, w: 2560, h: 1440 },
  shutter: { left: 36.4, top: 18.5, width: 27.2 },
  sign: { left: 42, top: 7, width: 16 },
  // Foreground scale: about twice the pots painted against the wall, no more,
  // or the miniature set stops reading as miniature.
  props: { left: 6, bottom: 1.5, width: 33 },
  enterY: 84,
  lift: 1.06,
}

export const ALLEY_PORTRAIT: AlleyPlate = {
  base: { src: `${DIR}/alley_base_mobile.webp`, w: 1170, h: 2080 },
  shutter: { left: 22, top: 34.2, width: 56 },
  sign: { left: 33, top: 20, width: 34 },
  props: { left: 10, bottom: 1.5, width: 62 },
  enterY: 82,
  lift: 1.06,
}

/** Intrinsic sizes of the shared cut-outs, used to derive each layer's height. */
export const ALLEY_ART = {
  shutter: { src: `${DIR}/alley_shutter.webp`, w: 1100, h: 1211 },
  sign: { src: `${DIR}/alley_sign.webp`, w: 760, h: 481 },
  props: { src: `${DIR}/alley_props.webp`, w: 2400, h: 543 },
} as const

/** Files the entrance cannot open without. */
export const ALLEY_CRITICAL = ['base', 'shutter'] as const
