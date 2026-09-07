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
 * Arrangement: two places along the wall, not one heap.
 *
 * Left is where the delivery was worked through: the parcels tallest against
 * the wall, the can boxes pulled out beside them at an angle, a packet of
 * ramen dropped between the two and cup noodles set down further out. The
 * heights fall as the pile spreads away from the wall, which is the shape a
 * stack takes when somebody is unloading it rather than stacking it.
 *
 * Right is smaller on purpose — the two sides must not balance — and holds
 * what has not been carried in yet: the water where it was put down, the bags
 * behind and beside it, the eggs propped against the bags. They touch rather
 * than pile up, so each one can still be read. It stops well below the postbox
 * so the wall keeps its empty space.
 *
 * Nothing reaches the door line and the walk to the shutter is left open
 * between the two. The packaging is invented; nothing carries a real
 * courier's or a real brand's mark.
 *
 * The packaging is invented. Nothing here carries a real courier's or a real
 * drinks company's mark.
 */
export type PropName =
  | 'parcelStack'
  | 'zeroCola'
  | 'packetRamen'
  | 'bag'
  | 'eggs'
  | 'waterPack'
  | 'cupRamen'

/** Back to front, which is also the order they are painted in. */
export const PROP_NAMES: readonly PropName[] = [
  'parcelStack',
  'zeroCola',
  'packetRamen',
  'bag',
  'eggs',
  'waterPack',
  'cupRamen',
]

const P = '/assets/images/alley'

export const PROP_ART: Readonly<Record<PropName, string>> = {
  parcelStack: `${P}/alley_prop_parcel_stack.webp`,
  zeroCola: `${P}/alley_prop_zero_cola.webp`,
  packetRamen: `${P}/alley_prop_packet_ramen.webp`,
  bag: `${P}/alley_prop_bag.webp`,
  eggs: `${P}/alley_prop_eggs.webp`,
  waterPack: `${P}/alley_prop_water_pack.webp`,
  cupRamen: `${P}/alley_prop_cup_ramen.webp`,
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
    // Left: the delivery corner. Tall at the wall, stepping down and out.
    parcelStack: { left: 14.8, bottom: 24.8, width: 10.8, tilt: -2 },
    zeroCola: { left: 23.4, bottom: 22.4, width: 6.6, tilt: -6 },
    packetRamen: { left: 17.6, bottom: 19.9, width: 4.8, tilt: 11 },
    cupRamen: { left: 28.6, bottom: 20.4, width: 5.2, tilt: -4 },
    // Right: what came in and has not been carried inside yet. Fewer things.
    bag: { left: 70.2, bottom: 23.8, width: 6.8, tilt: -5 },
    eggs: { left: 74.8, bottom: 21.6, width: 5.4, tilt: 7 },
    waterPack: { left: 64.4, bottom: 21.2, width: 6.2, tilt: 3 },
  },
  enterY: 84,
  doorway: { x: 49.95, y: 45.15, w: 19.7, h: 48.9 },
}

export const ALLEY_PORTRAIT: AlleyPlate = {
  base: { src: `${DIR}/alley_base_mobile.webp`, w: 1170, h: 2080 },
  shutter: { left: 22, top: 34.2, width: 56 },
  sign: { left: 33, top: 20, width: 34 },
  props: {
    parcelStack: { left: 3.5, bottom: 25.2, width: 21, tilt: -2 },
    zeroCola: { left: 13, bottom: 22.4, width: 13, tilt: -6 },
    packetRamen: { left: 9, bottom: 19.8, width: 9.5, tilt: 9 },
    cupRamen: { left: 21.8, bottom: 20.4, width: 10, tilt: -4 },
    bag: { left: 71.5, bottom: 24.4, width: 13.5, tilt: -5 },
    eggs: { left: 77.5, bottom: 21.8, width: 11, tilt: 7 },
    waterPack: { left: 67, bottom: 20.6, width: 12, tilt: 3 },
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
  zeroCola: { src: `${DIR}/alley_prop_zero_cola.webp`, w: 449, h: 480 },
  packetRamen: { src: `${DIR}/alley_prop_packet_ramen.webp`, w: 335, h: 432 },
  bag: { src: `${DIR}/alley_prop_bag.webp`, w: 352, h: 449 },
  eggs: { src: `${DIR}/alley_prop_eggs.webp`, w: 448, h: 287 },
  waterPack: { src: `${DIR}/alley_prop_water_pack.webp`, w: 386, h: 483 },
  cupRamen: { src: `${DIR}/alley_prop_cup_ramen.webp`, w: 408, h: 442 },
} as const

/** Files the entrance cannot open without. */
export const ALLEY_CRITICAL = ['base', 'shutter'] as const
