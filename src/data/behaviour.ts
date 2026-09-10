/**
 * Who each dokkaebi is, as numbers.
 *
 * The point of five of them is not five moving sprites — it is that the room
 * reads as somebody's workplace, where one person is always at the bench and
 * another is always near the fridge. So personality lives here, in weights and
 * preferences the one state machine reads, and not in five branches of it.
 *
 * The weights are relative pulls, not percentages: `work: 5` against
 * `idle: 3` means a dokkaebi picks work about five times for every three
 * times it decides to stand about, before anything else is taken into account.
 */
import type { BehaviourProfile } from '@/types/character'

const DEFAULT: BehaviourProfile = {
  idle: 4, wander: 3, work: 2, sit: 1, look: 2,
  favours: [], pace: 1, idleFor: [3000, 10000], waveChance: 0.35,
}

const PROFILES: Readonly<Record<string, BehaviourProfile>> = {
  // Curious. Goes to look at what everyone else is doing, and at the visitor.
  momo: {
    idle: 3, wander: 5, work: 3, sit: 1, look: 4,
    favours: ['pc', 'workbench'], pace: 1, idleFor: [2600, 8000], waveChance: 0.45,
  },
  // Unhurried. Near the food, sitting more than standing, in no rush anywhere.
  nunu: {
    idle: 6, wander: 2, work: 1, sit: 4, look: 2,
    favours: ['fridge'], pace: 0.78, idleFor: [5000, 14000], waveChance: 0.18,
  },
  // The one who actually builds things. At the bench, then the desk, then back.
  ruki: {
    idle: 2, wander: 3, work: 7, sit: 1, look: 2,
    favours: ['workbench', 'pc', 'cabinet'], pace: 1, idleFor: [2200, 7000], waveChance: 0.25,
  },
  // Trouble. Short trips, changes its mind, hangs about near the locked door.
  yomi: {
    idle: 2, wander: 6, work: 1, sit: 1, look: 5,
    favours: ['secret-door'], pace: 1.15, idleFor: [1800, 6000], waveChance: 0.55,
  },
  // Watches. Stays put a long time, mostly by the television or the shelf.
  poko: {
    idle: 6, wander: 2, work: 2, sit: 3, look: 3,
    favours: ['tv', 'shelf'], pace: 0.88, idleFor: [6000, 16000], waveChance: 0.22,
  },
}

export function behaviourFor(characterId: string): BehaviourProfile {
  return PROFILES[characterId] ?? DEFAULT
}
