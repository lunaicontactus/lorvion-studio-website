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
}

export type PropName = 'pot' | 'box' | 'stool' | 'slippers'
export const PROP_NAMES: readonly PropName[] = ['pot', 'box', 'stool', 'slippers']

export interface AlleyPlate {
  /** Intrinsic size of the base image; the plate keeps this ratio. */
  readonly base: { readonly src: string; readonly w: number; readonly h: number }
  readonly shutter: LayerPlacement
  readonly sign: LayerPlacement
  /** Scenery on the pavement in front of the wall. Decorative in STEP 2;
   *  STEP 4 turns them into hotspots, which is why they are already separate. */
  readonly props: Readonly<Record<PropName, LayerPlacement>>
  /** Where the ENTER button sits, as a percentage down the plate. */
  readonly enterY: number
}

const DIR = '/assets/images/alley'

export const ALLEY_LANDSCAPE: AlleyPlate = {
  base: { src: `${DIR}/alley_base_desktop.webp`, w: 2560, h: 1440 },
  shutter: { left: 36.4, top: 18.5, width: 27.2 },
  sign: { left: 42, top: 7, width: 16 },
  // Sat on the pavement against the wall, a little larger than the pots painted
  // on it and never in a row — a row reads as a toolbar.
  props: {
    pot: { left: 21.5, bottom: 22, width: 4.4 },
    box: { left: 27.2, bottom: 20.5, width: 4.6 },
    slippers: { left: 61.6, bottom: 21.5, width: 5.6 },
    stool: { left: 68.4, bottom: 20, width: 4.9 },
  },
  enterY: 84,
}

export const ALLEY_PORTRAIT: AlleyPlate = {
  base: { src: `${DIR}/alley_base_mobile.webp`, w: 1170, h: 2080 },
  shutter: { left: 22, top: 34.2, width: 56 },
  sign: { left: 33, top: 20, width: 34 },
  props: {
    // Left of the doorway (starts at 33%) and inside the plate overhang, so the
    // pot is not cropped on a 390px phone.
    pot: { left: 11, bottom: 23, width: 10 },
    box: { left: 22.5, bottom: 21.5, width: 10 },
    // Right of the doorway (which ends at 67%) and inside the ~9% the plate
    // overhangs a 390px phone on each side, so nothing is cropped.
    slippers: { left: 67.5, bottom: 22.5, width: 11 },
    stool: { left: 79.5, bottom: 21, width: 10 },
  },
  enterY: 82,
}

/** Intrinsic sizes of the shared cut-outs, used to derive each layer's height. */
export const ALLEY_ART = {
  /** `drum` is how much of the shutter's height is the roll housing at the top.
   *  The housing stays put; only the slats below it roll up into it. */
  shutter: { src: `${DIR}/alley_shutter.webp`, w: 1100, h: 1211, drum: 0.175 },
  sign: { src: `${DIR}/alley_sign.webp`, w: 760, h: 481 },
  pot: { src: `${DIR}/alley_prop_pot.webp`, w: 425, h: 531 },
  box: { src: `${DIR}/alley_prop_box.webp`, w: 423, h: 388 },
  stool: { src: `${DIR}/alley_prop_stool.webp`, w: 456, h: 461 },
  slippers: { src: `${DIR}/alley_prop_slippers.webp`, w: 578, h: 393 },
} as const

/** Files the entrance cannot open without. */
export const ALLEY_CRITICAL = ['base', 'shutter'] as const
