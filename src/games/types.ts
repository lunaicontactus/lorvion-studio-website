/**
 * What a mini-game is, as far as the room is concerned.
 *
 * A game is something that can be mounted into a box, told to start, pause,
 * resume and go away, and that will say when it is over. Everything around
 * that — the ready screen, the pause on losing focus, the result and the best
 * score, getting back to the garage — belongs to the runner, so a game only
 * has to be a game.
 */
export type EndReason = 'time' | 'caught' | 'quit'

export interface GameResult {
  readonly score: number
  readonly reason: EndReason
  /** One line for the result screen: why it ended, in the game's own words. */
  readonly detail: string
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
}

export interface GameInstance {
  start(): void
  pause(): void
  resume(): void
  destroy(): void
}

export interface GameDef {
  readonly id: string
  readonly title: string
  /** One sentence. */
  readonly hint: string
  /** What the buttons do, for the ready screen. Keyboard first, touch second. */
  readonly controls: readonly { readonly keys: string; readonly touch: string; readonly does: string }[]
  readonly seconds: number
  mount(host: GameHost): GameInstance
}
