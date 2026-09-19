/**
 * What a mini-game is, as far as the room is concerned.
 *
 * A game is something that can be mounted into a box, told to start, pause,
 * resume and go away, and that will say when it is over. Everything around
 * that — the ready screen, the countdown, the clock, the pause on losing
 * focus, the result, the stars, the best score, getting back to the garage —
 * belongs to the runner, so a game only has to be a game.
 *
 * The line that matters: **a game never touches the shell's DOM.** It draws
 * inside the box it is handed and it calls `host.hud`, `host.sfx`, `host.end`.
 * It does not open the pause screen, does not write the timer, does not close
 * itself. Every one of those is a way for two ideas of the same state to
 * exist, and they disagree the first time somebody presses Escape.
 *
 * There are two ways to be a game here.
 *
 * The newer one — which the three canonical games use — implements `step`,
 * and the runner drives it from the room's single ticker along with the round
 * clock. That game starts no timer of its own, so it cannot leak one, and its
 * clock cannot run twice after a resume.
 *
 * The older one drives itself and leaves `step` out. `build` does this. It
 * works, it is tested, and rewriting it to prove a point would be churn — but
 * nothing new should be written that way.
 */
import type { GameInputEvent } from '@/games/input'

export type EndReason = 'time' | 'caught' | 'quit' | 'done'

export interface GameResult {
  readonly score: number
  readonly reason: EndReason
  /** One line for the result screen: why it ended, in the game's own words. */
  readonly detail: string
  /**
   * Nought to three, decided by the game. The shell only shows them: what
   * counts as a good round is the game's business and nobody else's.
   */
  readonly stars?: number
  /** Whether the round counts as finished rather than lost. */
  readonly success?: boolean
}

/** What the result screen shows. The shell fills in `best`. */
export interface ShownResult extends GameResult {
  readonly best: number
  readonly record: boolean
}

export interface GameHost {
  /** The box to render into. Sized by the runner; the game fills it. */
  readonly root: HTMLElement
  /** The visitor has asked for less motion. */
  readonly reduced: boolean
  /** A coarse pointer: show touch controls. */
  readonly touch: boolean
  /** The round is over. The runner takes it from here. */
  end(result: GameResult): void
  /** A sound by the site's own names. Silent before a gesture and when muted. */
  sfx(name: string, volume?: number): void
  /** Live numbers for the runner's header. */
  hud(score: number, secondsLeft: number): void
  /**
   * Take time off the round, for a game whose cost of a mistake is seconds.
   * The clock is the shell's, so this is how a game asks rather than keeping
   * a second one of its own. Does nothing for a game that drives itself.
   */
  penalty(ms: number): void
}

export interface GameInstance {
  start(): void
  pause(): void
  resume(): void
  destroy(): void
  /**
   * One frame, `dt` milliseconds long, driven by the runner. A game with this
   * gets the shared clock and the shared input; a game without it is on its
   * own for both. Never called while paused, in a countdown, or after the
   * round has ended.
   */
  step?(dt: number, secondsLeft: number): void
  /** Something the player did, already turned into the game's own terms. */
  onInput?(event: GameInputEvent): void
}

export interface GameDef {
  readonly id: string
  readonly title: string
  /** One sentence. */
  readonly hint: string
  /** What the buttons do, for the ready screen. Keyboard first, touch second. */
  readonly controls: readonly { readonly keys: string; readonly touch: string; readonly does: string }[]
  readonly seconds: number
  /**
   * Keys that count as the action button, for games that have one. The
   * shared input manager turns them into HOLD_START and HOLD_END.
   */
  readonly holdKeys?: readonly string[]
  /** Keys that are named controls (WORLD 2.1): `{ ArrowLeft: 'left', ' ': 'jump' }`. */
  readonly controlKeys?: Readonly<Record<string, string>>
  mount(host: GameHost): GameInstance
}
