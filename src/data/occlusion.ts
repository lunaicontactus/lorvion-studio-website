/**
 * The things a dokkaebi can walk behind.
 *
 * The room is one painting, so there is nothing in front of the floor to hide
 * anybody: y-sort puts the crew above every hit area and that is the end of
 * it. What is missing is not depth arithmetic — it is a layer.
 *
 * Rather than cut new art, the layer redraws the room plate itself, clipped to
 * the boxes and pots that stand on the floor. Same file, same pixels, same
 * background-size — so a foreground piece cannot drift from the painting
 * behind it by a colour or a pixel, whatever happens to either.
 *
 * Only free-standing, roughly box-shaped things are listed. The stool is not
 * here: a rectangle around splayed legs would hide a dokkaebi in the gaps
 * between them, which is worse than no occlusion at all.
 *
 * Depth stays split by role, which is the part worth keeping:
 *   y-sort         who is in front of whom
 *   these rects    what the room physically hides
 *
 * The two are not separate systems, though. A foreground piece takes its
 * z-index from its own base line through the same formula the crew use, so
 * "behind the pot" and "in front of the pot" fall out of one comparison
 * instead of a special case. Laying the piece unconditionally on top hides a
 * dokkaebi standing in front of it, which is a worse lie than no occlusion.
 */

/** Where a thing sits in the room, front to back. Shared by crew and scenery. */
export function depthOf(worldY: number): number {
  return Math.min(699, 100 + Math.round(worldY / 8))
}
export interface Occluder {
  readonly id: string
  /** World rect of the painted object, matched to the plate. */
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /**
   * Feet at or above this line are behind it. Set a little above the base so
   * a dokkaebi standing level with the object is not half-swallowed.
   */
  readonly behindAbove: number
}

const LANDSCAPE: readonly Occluder[] = [
  { id: 'desk-chest-left', x: 1345, y: 842, w: 163, h: 154, behindAbove: 990 },
  { id: 'desk-pot', x: 1852, y: 850, w: 100, h: 132, behindAbove: 978 },
  { id: 'desk-chest-right', x: 1958, y: 842, w: 152, h: 152, behindAbove: 990 },
  { id: 'floor-plant', x: 2206, y: 838, w: 138, h: 161, behindAbove: 995 },
]

/** The portrait plate has none yet: its rooms are shallower and nothing on
 *  the floor stands between the camera and the walkway. */
const PORTRAIT: readonly Occluder[] = []

export function occludersFor(portrait: boolean): readonly Occluder[] {
  return portrait ? PORTRAIT : LANDSCAPE
}
