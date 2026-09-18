/**
 * The secret door's lock (PHASE 11).
 *
 * Three games, one star in each, and the door in the bookcase opens. The
 * stars are what the games recorded (src/games/scores.ts); the save's
 * `secretProgress` is how far the *room* has acknowledged it — the count it
 * has shown, and whether the unlock has been celebrated — so the light and
 * the sound happen once, and a reload finds the door open without opening
 * it again.
 */
import { allProgress, type Progress } from '@/games/scores'
import { save } from '@/systems/storage'

/** The three, in the order the signpost points. */
export const SECRET_GAMES: readonly string[] = ['mugunghwa', 'snack', 'parcel']

export interface SecretState {
  /** How many of the three have a star. */
  readonly have: number
  readonly need: number
  readonly unlocked: boolean
  /** The room has already shown the door opening. */
  readonly celebrated: boolean
}

/** How many of the games have earned at least one star. */
export function starsAmong(progress: Readonly<Record<string, Progress>>): number {
  return SECRET_GAMES.filter((id) => (progress[id]?.stars ?? 0) >= 1).length
}

export function secretState(): SecretState {
  const have = starsAmong(allProgress(SECRET_GAMES))
  return {
    have,
    need: SECRET_GAMES.length,
    unlocked: have >= SECRET_GAMES.length,
    celebrated: save.data.secretProgress >= SECRET_GAMES.length,
  }
}

/** The room has shown this much. */
export function acknowledge(have: number): void {
  const n = Math.max(0, Math.min(SECRET_GAMES.length, have))
  if (save.data.secretProgress === n) return
  save.update((d) => {
    d.secretProgress = n
  })
}
