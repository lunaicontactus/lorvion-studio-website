/**
 * The silhouettes the hover outline is drawn from.
 *
 * Every path was measured off the painted room, not invented: a coordinate
 * grid was rendered over the panorama, the object's edges were read from it,
 * and the result was drawn back over the artwork to check. Paths are in
 * objectBoundingBox units (0..1 of the object's own rectangle), so one shape
 * serves both plates and any zoom.
 *
 * Keep a shape honest to the thing it traces. A television whose outline
 * sprouts legs it does not have is worse than no outline at all.
 */
export type OutlineShape =
  | 'rect'
  | 'poster'
  | 'monitor'
  | 'monitorPortrait'
  | 'tv'
  | 'fridge'
  | 'arch'
  | 'cabinet'
  | 'shelf'

/** A rectangle with corners rounded by `rx`/`ry` in bounding-box units. */
function roundedRect(rx: number, ry = rx, top = 0, bottom = 1): string {
  const b = bottom
  return (
    `M${rx},${top} H${1 - rx} Q1,${top} 1,${top + ry} V${b - ry} Q1,${b} ${1 - rx},${b} ` +
    `H${rx} Q0,${b} 0,${b - ry} V${top + ry} Q0,${top} ${rx},${top} Z`
  )
}

export const OUTLINE_PATHS: Readonly<Record<OutlineShape, string>> = {
  /** Plain furniture: a soft-cornered box. */
  rect: roundedRect(0.02, 0.02),
  /** Paper pinned flat to the plaster. */
  poster: roundedRect(0.025, 0.018),
  /**
   * The desk PC: the monitor's cream body, and the keyboard in front of it as
   * a second subpath. Two strokes, one object, no invented stand.
   */
  monitor:
    `${roundedRect(0.075, 0.09, 0, 0.795)} ` +
    'M0.13,0.84 H0.885 Q0.927,0.84 0.927,0.885 V0.955 Q0.927,1 0.885,1 ' +
    'H0.13 Q0.086,1 0.086,0.955 V0.885 Q0.086,0.84 0.13,0.84 Z',
  /** The same PC on the portrait plate, where the body sits lower. */
  monitorPortrait:
    `${roundedRect(0.075, 0.085, 0, 0.852)} ` +
    'M0.125,0.859 H0.856 Q0.899,0.859 0.899,0.895 V0.964 Q0.899,1 0.856,1 ' +
    'H0.125 Q0.082,1 0.082,0.964 V0.895 Q0.082,0.859 0.125,0.859 Z',
  /** The wooden television: one rounded frame. It stands on a shelf, not legs. */
  tv: roundedRect(0.074, 0.116),
  /** The fridge door: generous top corners, a tighter foot. */
  fridge:
    'M0.146,0 H0.854 Q1,0 1,0.072 V0.94 Q1,0.985 0.94,0.985 H0.06 ' +
    'Q0,0.985 0,0.94 V0.072 Q0,0 0.146,0 Z',
  /** The secret door: the arch springs a quarter of the way up. */
  arch: 'M0,1 V0.25 Q0,0 0.5,0 Q1,0 1,0.25 V1 Z',
  /** A chest of drawers. */
  cabinet: roundedRect(0.03, 0.026),
  /** A shelf bay between two uprights. */
  shelf: roundedRect(0.02, 0.009),
}

/**
 * How far the hit area is grown beyond the artwork, in world pixels. The hit
 * rectangle and the outline are deliberately separate: a small object stays
 * easy to click without its outline swelling to match.
 */
export const HIT_PADDING = 12
