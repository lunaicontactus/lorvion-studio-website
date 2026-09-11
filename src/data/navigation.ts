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
   * wall, so using it means turning away from the camera; the parcel on the
   * floor is the one thing looked at sideways.
   */
  readonly facing?: 'front' | 'back' | 'left' | 'right'
  /**
   * What this point is for. `work` means there is a work animation to play
   * here; `watch` means standing and looking at the thing, which the
   * television and the shelf want and the fridge does not.
   */
  readonly kind?: 'use' | 'work' | 'watch'
}

/**
 * Somewhere it is reasonable to sit down. Not anywhere: a dokkaebi sitting in
 * the middle of the floor looks lost, and one sitting inside the fridge looks
 * broken.
 */
export interface SitPoint {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly facing: 'front' | 'left' | 'right'
  /** Relative pull. The rug is a nicer place to sit than the bare boards. */
  readonly weight: number
}

export interface NavGraph {
  /**
   * The band the feet stay inside — both lanes, not just the front one.
   *
   * It has to reach the back lane or a dokkaebi sent there is clamped short
   * of its own destination, walks on the spot until it gives up, and does
   * that every time. Half an hour of watching showed them covering ground at
   * 46 units a second while playing a walk built for a hundred.
   */
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
  readonly sits: readonly SitPoint[]
}

/**
 * Read off the painted floor: the boards start where the furniture bases end
 * and stop at the raised beam across the front.
 *
 * Two depths, not one. The front lane is the boards; the back lane runs along
 * the bases of the things standing on the floor, so a walk between the two
 * back points passes behind the plant pot (see src/data/occlusion.ts) and the
 * room hides the dokkaebi's legs the way a room should. The back lane stops
 * short of the desk: under it there is only 230 units of headroom and a
 * dokkaebi standing there is a hat behind a beam.
 */
const LANDSCAPE: NavGraph = {
  floor: { top: 960, bottom: 1075 },
  /**
   * 160, from 210. At 210 a dokkaebi stood taller than the desk and its
   * head reached the shelf: five of them filled the room the way giant dolls
   * fill a shoebox. At 160 the head is level with the desk top and the
   * fridge handle, which is what a small creature in a workshop looks like.
   * The stride scales with the figure, so the speed does too: 89 units per
   * cycle at 210 is 67.8 at 160, and 100 units a second becomes 76.
   */
  height: 160,
  speed: 76,
  // Several of these stand in front of the same object. A workbench two and a
  // half metres wide has room for two, and a television has room for three;
  // the fridge door has room for one, and a queue at it is a joke the room
  // gets to make. Each point is booked separately (src/systems/crowd.ts), so
  // "the bench is taken" is a fact about a place to stand and not about the
  // furniture.
  points: [
    // The rest end. Without these the crew lived in the right two thirds of
    // the room and the whole cushion corner stood empty, which the camera
    // does not show at once but a picture of the whole room does.
    { id: 'rest-floor', x: 1058, y: 1044 },
    { id: 'left-floor', x: 1268, y: 1030 },
    { id: 'pc-front', x: 1578, y: 1012, objectId: 'pc', facing: 'back', kind: 'work' },
    { id: 'mid-floor', x: 1860, y: 1042 },
    { id: 'workbench-a', x: 2116, y: 1006, objectId: 'workbench', facing: 'back', kind: 'work' },
    { id: 'workbench-b', x: 2252, y: 1006, objectId: 'workbench', facing: 'back', kind: 'work' },
    { id: 'fridge-front', x: 2470, y: 1020, objectId: 'fridge', facing: 'back', kind: 'use' },
    { id: 'right-floor', x: 2652, y: 1036 },
    { id: 'tv-left', x: 2790, y: 1030, objectId: 'tv', facing: 'back', kind: 'watch' },
    { id: 'tv-right', x: 2900, y: 1030, objectId: 'tv', facing: 'back', kind: 'watch' },
    // The locked door. Nothing opens here, which is the point: YOMI's whole
    // character is being interested in it, and without somewhere to stand
    // that preference did nothing at all for fifteen minutes of watching.
    { id: 'secret-front', x: 3306, y: 1016, objectId: 'secret-door', facing: 'back', kind: 'watch' },
    // Beside the parcel. Not a place anybody wanders to: only somebody
    // summoned when the box is opened stands here, looking at it.
    { id: 'parcel-side', x: 3010, y: 1066, objectId: 'parcel', facing: 'right', kind: 'watch' },
    { id: 'behind-left', x: 2030, y: 966 },
    { id: 'behind-right', x: 2440, y: 966 },
  ],
  // Read off the painting: the rug, the cushions on the left, and the boards
  // beside the bench. Nothing in a doorway and nothing inside the furniture.
  sits: [
    { id: 'big-cushion', x: 862, y: 1048, facing: 'right', weight: 3 },
    { id: 'rug', x: 2360, y: 1046, facing: 'front', weight: 3 },
    { id: 'cushions', x: 1330, y: 1040, facing: 'right', weight: 3 },
    { id: 'by-the-bench', x: 1740, y: 1036, facing: 'front', weight: 2 },
    { id: 'right-boards', x: 2720, y: 1042, facing: 'left', weight: 1 },
  ],
}

/**
 * The upper room of the portrait plate. The fridge is downstairs behind a
 * wall, so it is not a destination here; the machine is the same, the room is
 * smaller.
 */
const PORTRAIT: NavGraph = {
  floor: { top: 1580, bottom: 1660 },
  /**
   * Deliberately out of scale with the room, by a fifth.
   *
   * Tied strictly to the portrait plate a dokkaebi is 58 CSS px tall at 360px
   * wide, and at that size it is scenery rather than somebody. Compared on a
   * phone at 1.00 / 1.15 / 1.20 / 1.25: 1.20 reads clearly at 70px and still
   * belongs to the furniture, where 1.25 starts to loom. Checked at 360, 390
   * and 430 — it overlaps no hit area at any of them.
   */
  // 150, from 198, for the same reason as the landscape room; 76 = 100 x 150/198.
  height: 150,
  speed: 76,
  points: [
    { id: 'left-floor', x: 352, y: 1630 },
    { id: 'pc-front', x: 518, y: 1612, objectId: 'pc', facing: 'back', kind: 'work' },
    { id: 'mid-floor', x: 700, y: 1638 },
    { id: 'workbench-a', x: 858, y: 1606, objectId: 'workbench', facing: 'back', kind: 'work' },
    { id: 'workbench-b', x: 972, y: 1606, objectId: 'workbench', facing: 'back', kind: 'work' },
  ],
  sits: [
    { id: 'floor', x: 430, y: 1640, facing: 'front', weight: 2 },
    // Not 'left-floor'. That is the name of the standing point six units
    // away, and two different places with one name are one place as far as
    // the booking is concerned: claiming the seat locked the floor beside it,
    // and looking up either by name found whichever came first.
    { id: 'left-cushion', x: 250, y: 1636, facing: 'right', weight: 1 },
  ],
}

export function navFor(portrait: boolean): NavGraph {
  return portrait ? PORTRAIT : LANDSCAPE
}

/** The points that stand in front of something, in the order they appear. */
export function objectPoints(graph: NavGraph): readonly Waypoint[] {
  return graph.points.filter((p) => p.objectId !== undefined)
}

/** A named point, wherever it is — a standing place or a place to sit. */
export function pointNamed(graph: NavGraph, id: string): { x: number; y: number } | null {
  const p = graph.points.find((w) => w.id === id) ?? graph.sits.find((w) => w.id === id)
  return p ? { x: p.x, y: p.y } : null
}
