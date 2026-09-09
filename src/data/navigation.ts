/**
 * Where a dokkaebi may stand, and how it gets there.
 *
 * Not a pathfinder: one room, one strip of floor, and a handful of places
 * worth standing. The points are world coordinates, so the camera, the window
 * size and the orientation all take care of themselves — a waypoint is in
 * front of the fridge whatever the screen is doing.
 *
 * The portrait plate is two rooms stacked with a wall between them, so it has
 * its own strip and its own points. Nothing walks through that wall.
 */
export interface Waypoint {
  readonly id: string
  /** Where the feet go, in world units. */
  readonly x: number
  readonly y: number
  /** The thing this point stands in front of, if any. */
  readonly objectId?: string
  /**
   * Which way to face on arrival. Everything worth using is against the back
   * wall, so using it means turning away from the camera.
   */
  readonly facing?: 'front' | 'back'
}

export interface NavGraph {
  /** The band the feet stay inside. */
  readonly floor: { readonly top: number; readonly bottom: number }
  readonly points: readonly Waypoint[]
  /** How tall a dokkaebi stands here, in world units. */
  readonly height: number
  /**
   * World units per second. Same in both, so the pace reads the same on a
   * phone and on a desk.
   *
   * Set from the walk cycle, not from taste: the rendered stride covers 89
   * world units per cycle, and eight frames at nine a second make that cycle
   * 0.889s long. 100 units a second is what makes the feet agree with the
   * floor. Changing one of these three numbers means re-deriving the others.
   */
  readonly speed: number
}

/**
 * Read off the painted floor: the boards start where the furniture bases end
 * and stop at the raised beam across the front.
 */
const LANDSCAPE: NavGraph = {
  floor: { top: 990, bottom: 1070 },
  height: 210,
  speed: 100,
  points: [
    { id: 'left-floor', x: 1268, y: 1030 },
    { id: 'pc-front', x: 1578, y: 1012, objectId: 'pc', facing: 'back' },
    { id: 'mid-floor', x: 1860, y: 1042 },
    { id: 'workbench-front', x: 2185, y: 1006, objectId: 'workbench', facing: 'back' },
    { id: 'fridge-front', x: 2470, y: 1020, objectId: 'fridge', facing: 'back' },
    { id: 'right-floor', x: 2760, y: 1036 },
  ],
}

/**
 * The upper room of the portrait plate. The fridge is downstairs behind a
 * wall, so it is not a destination here; the machine is the same, the room is
 * smaller.
 */
const PORTRAIT: NavGraph = {
  floor: { top: 1580, bottom: 1660 },
  height: 165,
  speed: 100,
  points: [
    { id: 'left-floor', x: 250, y: 1630 },
    { id: 'pc-front', x: 518, y: 1612, objectId: 'pc', facing: 'back' },
    { id: 'mid-floor', x: 700, y: 1638 },
    { id: 'workbench-front', x: 905, y: 1606, objectId: 'workbench', facing: 'back' },
  ],
}

export function navFor(portrait: boolean): NavGraph {
  return portrait ? PORTRAIT : LANDSCAPE
}

/** The points that stand in front of something, in the order they appear. */
export function objectPoints(graph: NavGraph): readonly Waypoint[] {
  return graph.points.filter((p) => p.objectId !== undefined)
}
