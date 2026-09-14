/**
 * The only description of what a mini-game can do next.
 *
 * It is a table rather than a scattering of `if (state === …)` because of
 * what the scattering costs: every game that manages its own modal ends up
 * with its own idea of whether it is paused, and the two ideas disagree the
 * first time somebody presses Escape while the result is up. One table, one
 * answer, and anything not in it does not happen.
 *
 * Nothing here touches the DOM or the clock. It is a set of names and the
 * arrows between them, so it can be argued with in a unit test.
 */
import { log } from '@/systems/log'

export type GameState = 'CLOSED' | 'READY' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'RESULT'

/**
 * Where each state may go.
 *
 * Read it as the visitor's evening: they open a game (READY), press start
 * (COUNTDOWN), it begins (PLAYING), they lose the window (PAUSED), come back
 * (PLAYING), it ends (RESULT), and they either go again (COUNTDOWN) or leave
 * (CLOSED). Closing is allowed from anywhere, because the ✕ is always there
 * and a door that is sometimes locked is worse than no door.
 */
export const TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  CLOSED: ['READY'],
  READY: ['COUNTDOWN', 'CLOSED'],
  // A countdown can be lost the same way a round can — somebody alt-tabs
  // during "3, 2, 1" — so it pauses rather than ploughing on.
  COUNTDOWN: ['PLAYING', 'PAUSED', 'CLOSED'],
  PLAYING: ['PAUSED', 'RESULT', 'CLOSED'],
  // Out of a pause: back to the round, or away. Not straight to a result:
  // giving up is leaving, and a score for a round that was not played is a
  // score nobody earned.
  PAUSED: ['PLAYING', 'CLOSED'],
  RESULT: ['COUNTDOWN', 'CLOSED'],
}

export function may(from: GameState, to: GameState): boolean {
  return TRANSITIONS[from].includes(to)
}

/**
 * A small state machine that refuses anything the table does not allow.
 *
 * Refusing is silent in production and loud in development: a transition that
 * cannot happen is a bug in the caller, and the useful thing is to see it
 * while writing the caller rather than to throw it at a visitor mid-round.
 */
export class GameStateMachine {
  #state: GameState = 'CLOSED'
  #onChange: (to: GameState, from: GameState) => void

  constructor(onChange: (to: GameState, from: GameState) => void = () => {}) {
    this.#onChange = onChange
  }

  get state(): GameState {
    return this.#state
  }

  is(...states: readonly GameState[]): boolean {
    return states.includes(this.#state)
  }

  /** Move, if the table allows it. Returns whether it moved. */
  to(next: GameState): boolean {
    if (next === this.#state) return false
    if (!may(this.#state, next)) {
      log.debug(`game: ignored ${this.#state} → ${next}`)
      return false
    }
    const from = this.#state
    this.#state = next
    this.#onChange(next, from)
    return true
  }
}
