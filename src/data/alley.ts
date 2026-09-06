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
 * down, water for the week, cans for the small hours, flattened card waiting to
 * go out. That is the whole subject — the lane should say someone is in there
 * working, before it says anything else.
 *
 * The fire-spirit pot is gone. It was the brightest, most fantastical thing in
 * the frame and it took the scene; the identity that remains is one small stamp
 * on an ordinary parcel, which is as much as this doorway needs.
 *
 * Planned arrangement, left wall inward, door line kept clear:
 *   flattened card leaning on the wall, furthest out
 *   a stack of three to five parcels, tallest of the group
 *   one opened parcel beside it, flaps up, turned a few degrees
 *   the stamped parcel, small, sat on top of nothing in particular
 *   shrink-wrapped water to the right of the door
 *   a can pack next to it, lower and turned the other way
 * No two share a baseline, a size or an angle.
 *
 * `PROP_ART` is null where the picture does not exist yet. Nothing is stretched
 * or duplicated to stand in for it: the slot is laid out, the scene skips it,
 * and the file is reported as needed.
 */
export type PropName =
  | 'box'
  | 'parcelStack'
  | 'openParcel'
  | 'waterPack'
  | 'zeroCola'
  | 'flatBoxes'

export const PROP_NAMES: readonly PropName[] = [
  'box',
  'parcelStack',
  'openParcel',
  'waterPack',
  'zeroCola',
  'flatBoxes',
]

const P = '/assets/images/alley'

export const PROP_ART: Readonly<Record<PropName, string | null>> = {
  box: `${P}/alley_prop_box.webp`,
  parcelStack: null, // alley_prop_parcel_stack.webp
  openParcel: null, // alley_prop_open_parcel.webp
  waterPack: null, // alley_prop_water_pack.webp
  zeroCola: null, // alley_prop_zero_cola.webp
  flatBoxes: null, // alley_prop_flat_boxes.webp
}

export interface AlleyPlate {
  /** Intrinsic size of the base image; the plate keeps this ratio. */
  readonly base: { readonly src: string; readonly w: number; readonly h: number }
  readonly shutter: LayerPlacement
  readonly sign: LayerPlacement
  /** Traces of the crew on the pavement — a fire spirit in the pot, a club
   *  stamp on the parcel, a mended stool, worn slippers. Not clickable yet;
   *  they are separate so STEP 4 can make them so. */
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
    flatBoxes: { left: 8.6, bottom: 19, width: 6.2, tilt: 1.5 },
    parcelStack: { left: 15.4, bottom: 18.5, width: 7.4, tilt: -1 },
    openParcel: { left: 23.2, bottom: 19.5, width: 5.6, tilt: 3 },
    box: { left: 29.4, bottom: 20.5, width: 4.4, tilt: -3 },
    waterPack: { left: 66.5, bottom: 18.5, width: 7.8, tilt: 1 },
    zeroCola: { left: 75.4, bottom: 19.5, width: 6.4, tilt: -2 },
  },
  enterY: 84,
  doorway: { x: 49.95, y: 45.15, w: 19.7, h: 48.9 },
}

export const ALLEY_PORTRAIT: AlleyPlate = {
  base: { src: `${DIR}/alley_base_mobile.webp`, w: 1170, h: 2080 },
  shutter: { left: 22, top: 34.2, width: 56 },
  sign: { left: 33, top: 20, width: 34 },
  props: {
    flatBoxes: { left: 16, bottom: 21, width: 14, tilt: 2 },
    parcelStack: { left: 15, bottom: 11, width: 16, tilt: -1 },
    openParcel: { left: 2, bottom: 11.5, width: 11, tilt: 3 },
    box: { left: 3, bottom: 31, width: 9, tilt: -3 },
    waterPack: { left: 68, bottom: 21, width: 15, tilt: 1 },
    zeroCola: { left: 84, bottom: 22, width: 12, tilt: -2 },
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
  /** The dokkaebi fire hiding in the leaves, as fractions of the pot cut-out.
   *  STEP 10 puts a living flame here; until then it is just painted. */
  pot: { src: `${DIR}/alley_prop_pot.webp`, w: 466, h: 600, fire: { x: 0.665, y: 0.487, w: 0.369, h: 0.218 } },
  box: { src: `${DIR}/alley_prop_box.webp`, w: 396, h: 372 },
} as const

/** Files the entrance cannot open without. */
export const ALLEY_CRITICAL = ['base', 'shutter'] as const
