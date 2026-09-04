import type { ZoneId } from '@/types/character'

/** What happens when a visitor activates an object in the room. */
export type ObjectAction =
  | { readonly kind: 'navigate'; readonly href: string }
  | { readonly kind: 'openPanel'; readonly panelId: string }
  | { readonly kind: 'openProject'; readonly projectId: string }
  | { readonly kind: 'miniGame'; readonly gameId: string }
  | { readonly kind: 'toggle'; readonly toggleId: string }
  | { readonly kind: 'locked'; readonly requires: number }

export interface InteractiveObjectConfig {
  readonly id: string
  /** Accessible name. Kept short — this is what a screen reader announces. */
  readonly label: string
  readonly zone: ZoneId
  readonly action: ObjectAction
  /** Appears in the always-available menu as well as in the room. */
  readonly inMainMenu: boolean
  /** Sound effect id, played only when sound is on. */
  readonly sfx?: string
}
