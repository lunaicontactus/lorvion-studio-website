/**
 * Who each of the crew is, as numbers.
 *
 * The point of five of them is not five moving sprites — it is that the room
 * reads as somebody's workplace, where one person is always at the bench and
 * another is always near the fridge. So personality lives here, in weights and
 * preferences the one state machine reads, and not in five branches of it.
 *
 * The weights are relative pulls, not percentages: `work: 5` against
 * `idle: 3` means a character picks work about five times for every three
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
  // MOMO, the lead (응가): the middle of the room and the planning desk.
  // Talks to everyone, bounces about, never far from the next idea.
  momo: {
    idle: 3, wander: 5, work: 3, sit: 2, look: 4,
    favours: ['pc', 'workbench', 'parcel'], pace: 1, idleFor: [2600, 8000], waveChance: 0.5,
    workFor: [5000, 12000], sitFor: [7000, 15000],
    social: 0.85, stubborn: 0.1, talkative: 5, home: 'mid-floor',
  },
  // NUNU, development (김로드): the PC. Long stretches of work, the odd doze.
  nunu: {
    idle: 2, wander: 1, work: 8, sit: 2, look: 2,
    favours: ['pc', 'cabinet'], pace: 0.85, idleFor: [3000, 9000], waveChance: 0.2,
    workFor: [14000, 30000], sitFor: [9000, 18000],
    social: 0.3, stubborn: 0.75, talkative: 3, home: 'pc-front',
  },
  // RUKI, research (최미나이): the shelf and the records. Looks things up,
  // checks them, comes back to check again.
  ruki: {
    idle: 2, wander: 3, work: 5, sit: 2, look: 5,
    favours: ['shelf', 'cabinet', 'pc'], pace: 1, idleFor: [2200, 7000], waveChance: 0.3,
    workFor: [9000, 20000], sitFor: [8000, 16000],
    social: 0.5, stubborn: 0.4, talkative: 3, home: 'shelf-front',
  },
  // POKO, story (조피티): the story bench. Writes, stares into space, wanders
  // to the television for ideas.
  poko: {
    idle: 5, wander: 2, work: 5, sit: 3, look: 3,
    favours: ['workbench', 'tv'], pace: 0.88, idleFor: [5000, 14000], waveChance: 0.25,
    workFor: [9000, 20000], sitFor: [10000, 24000],
    social: 0.4, stubborn: 0.35, talkative: 3, home: 'workbench-a',
  },
  // YOMI, music (이수노): the radio corner. Listens, sways, writes melodies.
  yomi: {
    idle: 4, wander: 2, work: 3, sit: 4, look: 2,
    favours: ['radio', 'tv'], pace: 0.95, idleFor: [4000, 11000], waveChance: 0.4,
    workFor: [7000, 15000], sitFor: [10000, 22000],
    social: 0.55, stubborn: 0.3, talkative: 4, home: 'radio-side',
  },
  // REVEN, the studio cat: the cushions, the fridge, and whoever is working.
  // Sits most of the time; wanders off without a reason.
  reven: {
    idle: 3, wander: 4, work: 0, sit: 6, look: 2,
    favours: ['fridge', 'radio'], pace: 1.1, idleFor: [2500, 9000], waveChance: 0.3,
    workFor: [2000, 4000], sitFor: [14000, 34000],
    social: 0.7, stubborn: 0.2, talkative: 2, home: 'big-cushion',
  },
}

export function behaviourFor(characterId: string): BehaviourProfile {
  return PROFILES[characterId] ?? DEFAULT
}
