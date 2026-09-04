/**
 * Easter eggs, described rather than coded.
 *
 * Keeping them as data means STEP 17 wires one engine instead of scattering
 * special cases through the room, and the cooldowns stay visible in one place.
 */
import type { ReactionIcon } from '@/types/character'

export type EggTrigger =
  | { readonly kind: 'repeatClick'; readonly targetId: string; readonly times: number }
  | { readonly kind: 'phase'; readonly phase: string }
  | { readonly kind: 'toggleMax'; readonly targetId: string }
  | { readonly kind: 'characterPair'; readonly ids: readonly [string, string] }

export type EggReward =
  | { readonly kind: 'reaction'; readonly icon: ReactionIcon }
  | { readonly kind: 'spawnDokkaFire' }
  | { readonly kind: 'characterBlocks'; readonly characterId: string }
  | { readonly kind: 'revealShadow' }

export interface EasterEggConfig {
  readonly id: string
  readonly trigger: EggTrigger
  readonly reward: EggReward
  /** Milliseconds before this can fire again. */
  readonly cooldownMs: number
  /** Once fired, never again for this visitor. */
  readonly onceOnly: boolean
}

export const EASTER_EGGS: readonly EasterEggConfig[] = [
  {
    id: 'light-switch-three',
    trigger: { kind: 'repeatClick', targetId: 'light-switch', times: 3 },
    reward: { kind: 'spawnDokkaFire' },
    cooldownMs: 60_000,
    onceOnly: false,
  },
  {
    id: 'fridge-raid',
    trigger: { kind: 'repeatClick', targetId: 'fridge', times: 4 },
    reward: { kind: 'characterBlocks', characterId: 'yomi' },
    cooldownMs: 45_000,
    onceOnly: false,
  },
  {
    id: 'fan-max',
    trigger: { kind: 'toggleMax', targetId: 'fan' },
    reward: { kind: 'reaction', icon: 'spark' },
    cooldownMs: 30_000,
    onceOnly: false,
  },
  {
    id: 'late-night-shadow',
    trigger: { kind: 'phase', phase: 'lateNight' },
    reward: { kind: 'revealShadow' },
    cooldownMs: 0,
    onceOnly: true,
  },
] as const
