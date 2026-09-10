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
  workFor: [6000, 14000], sitFor: [8000, 18000],
  social: 0.5, stubborn: 0.2, talkative: 3, home: 'mid-floor',
}

const PROFILES: Readonly<Record<string, BehaviourProfile>> = {
  // Curious. Goes to look at what everyone else is doing, and at the visitor.
  momo: {
    idle: 3, wander: 5, work: 3, sit: 1, look: 4,
    favours: ['pc', 'workbench'], pace: 1, idleFor: [2600, 8000], waveChance: 0.45,
    workFor: [5000, 12000], sitFor: [7000, 15000],
    // Goes over to see what somebody else is doing. Usually says something.
    social: 0.8, stubborn: 0.1, talkative: 4, home: 'mid-floor',
  },
  // Unhurried. Near the food, sitting more than standing, in no rush anywhere.
  nunu: {
    idle: 6, wander: 2, work: 1, sit: 4, look: 2,
    favours: ['fridge'], pace: 0.78, idleFor: [5000, 14000], waveChance: 0.18,
    workFor: [4000, 9000], sitFor: [14000, 32000],
    // Notices you eventually. Answers in one syllable.
    social: 0.3, stubborn: 0.4, talkative: 2, home: 'rug',
  },
  // The one who actually builds things. At the bench, then the desk, then back.
  ruki: {
    idle: 2, wander: 3, work: 7, sit: 1, look: 2,
    favours: ['workbench', 'pc', 'cabinet'], pace: 1, idleFor: [2200, 7000], waveChance: 0.25,
    workFor: [12000, 26000], sitFor: [6000, 12000],
    // Mid-job, and it shows. Looks up, but not straight away.
    social: 0.25, stubborn: 0.7, talkative: 3, home: 'workbench-a',
  },
  // Trouble. Short trips, changes its mind, hangs about near the locked door.
  yomi: {
    idle: 2, wander: 6, work: 1, sit: 1, look: 5,
    favours: ['secret-door'], pace: 1.15, idleFor: [1800, 6000], waveChance: 0.55,
    workFor: [3000, 7000], sitFor: [5000, 11000],
    // Approaches first, every time, and is delighted to be interrupted.
    social: 0.9, stubborn: 0.05, talkative: 5, home: 'right-floor',
  },
  // Watches. Stays put a long time, mostly by the television or the shelf.
  poko: {
    idle: 6, wander: 2, work: 2, sit: 3, look: 3,
    favours: ['tv', 'shelf'], pace: 0.88, idleFor: [6000, 16000], waveChance: 0.22,
    workFor: [6000, 13000], sitFor: [12000, 28000],
    // Will look over. Rarely crosses the room to do it.
    social: 0.35, stubborn: 0.3, talkative: 2, home: 'tv-left',
  },
}

export function behaviourFor(characterId: string): BehaviourProfile {
  return PROFILES[characterId] ?? DEFAULT
}
