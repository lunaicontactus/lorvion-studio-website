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
  | 'radioArea'
  | 'fridgeArea'
  | 'secretDoor'

export interface Zone {
  readonly id: ZoneId
  readonly label: string
  readonly rect: WorldRect
  /** Solid furniture the crew cannot walk through. Absent means open floor. */
  readonly blocks?: WorldRect
}

/** What touching a thing does. */
export type ObjectAction =
  | { kind: 'panel'; panelId: string }
  | { kind: 'project'; projectId: string }
  | { kind: 'exit' }

export interface WorldObject {
  readonly id: string
  readonly label: string
  readonly zone: ZoneId
  readonly action: ObjectAction
  /** Hit area in world space; drawn furniture uses the same box. */
  readonly rect: WorldRect
  readonly sfx?: string
  /** Shown in the fallback menu so the room is never the only way through. */
  readonly inMenu?: boolean
  /** Locked things say so instead of opening. */
  readonly locked?: boolean
}

export interface WorldLayout {
  readonly width: number
  readonly height: number
  /** Where the camera opens, in world space. */
  readonly start: { readonly x: number; readonly y: number }
  /** Floor band the crew walks on: y from `top` to `bottom`. */
  readonly floor: { readonly top: number; readonly bottom: number }
  readonly zones: readonly Zone[]
  readonly objects: readonly WorldObject[]
  /** The window the night sky is painted into. */
  readonly window: WorldRect
}
