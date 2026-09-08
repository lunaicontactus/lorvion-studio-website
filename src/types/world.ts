import type { OutlineShape } from '@/data/outlines'

/** A rectangle in world space. Origin is the world's top-left corner. */
export interface WorldRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type ZoneId =
  | 'entry'
  | 'posterWall'
  | 'archive'
  | 'shelf'
  | 'mainDesk'
  | 'centreFloor'
  | 'workbench'
  | 'restArea'
  | 'tvArea'
  | 'fridgeArea'
  | 'secretDoor'

export interface Zone {
  readonly id: ZoneId
  readonly label: string
  readonly rect: WorldRect
  /**
   * Solid furniture, recorded for the movement STEP 3 did not build. Nothing
   * reads it yet; it is not a hit area and it blocks nothing today.
   */
  readonly blocks?: WorldRect
}

/**
 * What kind of thing it is. The interaction a thing runs is chosen from this,
 * not from its id, so a second television would need no new code.
 */
export type ObjectKind = 'screen' | 'desk' | 'paper' | 'door' | 'storage' | 'appliance'

/** What touching a thing does. */
export type ObjectAction =
  | { kind: 'panel'; panelId: string }
  | { kind: 'project'; projectId: string }
  | { kind: 'exit' }

export interface WorldObject {
  readonly id: string
  readonly label: string
  readonly zone: ZoneId
  readonly kind: ObjectKind
  /**
   * False while the thing is in the room but has nothing behind it yet. It
   * still draws and still says so when touched; it does not pretend to open.
   */
  readonly enabled: boolean
  readonly action: ObjectAction
  /** Hit area in world space. The outline may be tighter than this. */
  readonly rect: WorldRect
  readonly sfx?: string
  /** Shown in the fallback menu so the room is never the only way through. */
  readonly inMenu?: boolean
  /** Locked things say so instead of opening. */
  readonly locked?: boolean
  /** Drawn into the room. Only for things the painting does not already show. */
  readonly art?: string
  /**
   * Silhouette traced while the pointer is on it. `rect` is the hit region and
   * may be looser; this is the shape of the object inside it.
   */
  readonly outline?: OutlineShape
}

export interface WorldLayout {
  readonly width: number
  readonly height: number
  /** Where the camera opens, in world space. */
  readonly start: { readonly x: number; readonly y: number }
  /** Floor band, for the same unbuilt movement. Nothing reads it yet. */
  readonly floor: { readonly top: number; readonly bottom: number }
  readonly zones: readonly Zone[]
  readonly objects: readonly WorldObject[]
  /**
   * The painted window opening. Kept as a landmark for staging; the drawn
   * sky that used to sit in it was removed, so nothing renders here.
   */
  readonly window: WorldRect
}
