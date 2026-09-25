/**
 * MOMO's footfalls (WORLD 2.4).
 *
 * The walk cycle in src/games/delivery/game.ts is four frames at ten a
 * second; the feet come down on the first and the third. So a footfall is
 * due every fifth of a second of grounded walking — the same cadence for
 * carrying, which is slower only in speed, not in step. The sound is one
 * clip per footfall, not a loop: standing still, or in the air, there is
 * nothing to hear.
 */

/** Seconds of grounded walking between one footfall and the next. */
export const STEP_EVERY = 0.2

/** How many footfalls fall between two readings of the walk clock. */
export function footfalls(before: number, after: number): number {
  if (after <= before) return 0
  return Math.floor(after / STEP_EVERY + 1e-9) - Math.floor(before / STEP_EVERY + 1e-9)
}
