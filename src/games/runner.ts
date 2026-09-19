/**
 * Runs one mini-game at a time, in front of the room.
 *
 * The things every game would otherwise have to remember are done here once:
 * a ready screen with the controls on it, pausing the moment the tab or the
 * window loses focus and resuming only when asked, the result with the best
 * score for this browser, and getting back to the garage with nothing left
 * ticking. A game is mounted into a box and told start / pause / resume /
 * destroy; that is the whole contract (src/games/types.ts).
 *
 * The layer is fixed over everything, takes every touch it is given so the
 * page underneath cannot scroll or zoom while a thumb is on a button, and is
 * removed from the document — not hidden — between games.
 */
import { audio } from '@/systems/audio'
import { motion } from '@/systems/motion'
import { ticker } from '@/systems/tick'
import { RoundClock } from '@/games/clock'
import { GameInput } from '@/games/input'
import { GameStateMachine, type GameState } from '@/games/state'
import { bestFor, persistent, record } from '@/games/scores'
import type { GameDef, GameInstance, GameResult } from '@/games/types'

export type RunnerState = GameState

/** How long "3, 2, 1" takes, and how long each number is up. */
const COUNT_FROM = 3
const COUNT_STEP = 700

export interface RunnerHost {
  /**
   * A game opened or closed: the room should stop or start behind it. The id
   * comes with it because not every game wants the same room — one of them
   * is played *in* the garage and needs it left alive behind the layer.
   */
  readonly onOpenChange?: (open: boolean, gameId: string) => void
  /**
   * Where leaving the game goes back to, as the button says it (PHASE 10):
   * the garage when the game was opened from the room, the playground when
   * it was opened from one of its buildings.
   */
  readonly exitLabel?: () => string
  /**
   * Leaving is a way out of a world, not a click that makes things vanish
   * (WORLD 2.1): when this is given, quitting hands the actual `close` to it,
   * and it decides when — after the screen has been covered, say.
   */
  readonly leave?: (close: () => void) => Promise<void>
}

const REASON_LABEL: Record<GameResult['reason'], string> = {
  time: '시간 종료',
  caught: '발각',
  quit: '중단',
  done: '완료',
}

export class GameRunner {
  #root: HTMLElement
  #host: RunnerHost
  #machine = new GameStateMachine()
  #def: GameDef | null = null
  #game: GameInstance | null = null
  #layer: HTMLElement | null = null
  #box: HTMLElement | null = null
  #overlay: HTMLElement | null = null
  #hudScore: HTMLElement | null = null
  #hudTime: HTMLElement | null = null
  #lastFocus: HTMLElement | null = null
  #offs: (() => void)[] = []
  /** The round clock, for games that let the runner drive them. */
  #clock: RoundClock | null = null
  #input: GameInput | null = null
  /** The one subscription. Everything in a round is stepped from here. */
  #tick: (() => void) | null = null
  #countLeft = 0
  #score = 0

  constructor(root: HTMLElement, host: RunnerHost = {}) {
    this.#root = root
    this.#host = host
  }

  get state(): RunnerState {
    return this.#machine.state
  }

  /** Seconds on the round clock, or null for a game that keeps its own. */
  get secondsLeft(): number | null {
    return this.#clock ? this.#clock.left : null
  }

  get #state(): RunnerState {
    return this.#machine.state
  }

  get isOpen(): boolean {
    return this.#state !== 'CLOSED'
  }

  open(def: GameDef): void {
    if (this.isOpen) this.close()
    this.#def = def
    this.#lastFocus = document.activeElement as HTMLElement | null
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches
    const layer = document.createElement('div')
    layer.className = 'game-layer'
    layer.dataset['game'] = def.id
    layer.innerHTML = `
      <div class="game" role="dialog" aria-modal="true" aria-labelledby="gameTitle" tabindex="-1" data-game-shell>
        <header class="game__bar">
          <h2 class="game__title" id="gameTitle">${def.title}</h2>
          <div class="game__hud" aria-live="off">
            <span class="game__hudItem"><span class="game__hudLabel">점수</span><b data-game-score>0</b></span>
            <span class="game__hudItem"><span class="game__hudLabel">남은 시간</span><b data-game-time>${def.seconds}</b></span>
          </div>
          <button class="game__quit" type="button" data-game-quit aria-label="게임 나가기">✕</button>
        </header>
        <div class="game__box" data-game-box></div>
        <div class="game__overlay" data-game-overlay hidden></div>
      </div>`
    this.#root.append(layer)
    this.#root.hidden = false
    this.#layer = layer
    this.#box = layer.querySelector('[data-game-box]')!
    this.#overlay = layer.querySelector('[data-game-overlay]')!
    this.#hudScore = layer.querySelector('[data-game-score]')!
    this.#hudTime = layer.querySelector('[data-game-time]')!

    // The page must not move under a thumb that is on a button.
    const swallow = (e: Event): void => {
      if (e.cancelable) e.preventDefault()
    }
    layer.addEventListener('touchmove', swallow, { passive: false })
    layer.addEventListener('wheel', swallow, { passive: false })
    this.#offs.push(() => {
      layer.removeEventListener('touchmove', swallow)
      layer.removeEventListener('wheel', swallow)
    })

    layer.querySelector('[data-game-quit]')!.addEventListener('click', () => this.#quit())

    // Losing the tab or the window is a pause, never a silent loss. Coming
    // back is a button, not automatic: the visitor came back to a paused game
    // and may not be ready for it to be running.
    const onVis = (): void => {
      if (document.visibilityState !== 'visible') this.pause()
    }
    const onBlur = (): void => this.pause()
    document.addEventListener('visibilitychange', onVis)
    addEventListener('blur', onBlur)
    this.#offs.push(() => {
      document.removeEventListener('visibilitychange', onVis)
      removeEventListener('blur', onBlur)
    })

    const onKey = (e: KeyboardEvent): void => {
      if (this.#state === 'CLOSED') return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (this.#state === 'PLAYING') this.pause()
        else this.#quit()
        return
      }
      if ((e.key === 'Enter' || e.key === ' ') && this.#state === 'READY') {
        e.preventDefault()
        this.#countdown()
      }
    }
    // Capture, so the room's own key handling never sees a game key.
    document.addEventListener('keydown', onKey, true)
    this.#offs.push(() => document.removeEventListener('keydown', onKey, true))

    this.#mount(touch)
    this.#machine.to('READY')
    this.#host.onOpenChange?.(true, def.id)
    this.#ready(touch)
    layer.querySelector<HTMLElement>('[data-game-shell]')?.focus()
  }

  #mount(touch: boolean): void {
    if (!this.#def || !this.#box) return
    const def = this.#def
    this.#box.textContent = ''
    this.#score = 0
    this.#hud(0, def.seconds)
    this.#game = def.mount({
      root: this.#box,
      reduced: motion.reduced,
      touch,
      end: (r) => this.#result(r),
      sfx: (name, volume) => {
        audio.play(name, volume)
        // POKO turning round is the cue that matters; the music steps back
        // for a moment so it is never lost under it.
        if (name === 'poko_turn') audio.duck(1400)
      },
      hud: (score, seconds) => {
        this.#score = score
        this.#hud(score, seconds)
      },
      penalty: (ms) => {
        this.#clock?.take(ms)
        if (this.#clock) this.#hud(this.#score, this.#clock.left)
      },
    })
    // A game that implements `step` is driven by the runner: it gets the
    // shared clock and the shared input, and starts no timer and adds no
    // listener of its own. One that does not is on its own for both, which
    // is how `build` has always worked.
    if (this.#game.step) {
      this.#clock = new RoundClock(def.seconds)
      this.#input = new GameInput({
        root: this.#box,
        ...(def.holdKeys ? { holdKeys: def.holdKeys } : {}),
        on: (event) => {
          // Never while paused, counting down or finished. The manager
          // already stops sending when disabled; this is the second lock,
          // because an input that reaches a game that is not running is the
          // bug that makes a paused game scoreable.
          if (this.#state !== 'PLAYING') return
          this.#game?.onInput?.(event)
        },
      })
      this.#input.setEnabled(false)
    }
  }

  /**
   * One subscription for the whole round: the countdown, the clock and the
   * game's own frame, in that order. Started when a round starts and dropped
   * the moment it is not needed, so nothing is subscribed while a result is
   * on screen or a game is closed.
   */
  #run(): void {
    if (this.#tick) return
    this.#tick = ticker.subscribe((info) => this.#frame(info.delta), 40)
  }

  #stop(): void {
    this.#tick?.()
    this.#tick = null
  }

  #frame(delta: number): void {
    const dt = Math.min(delta, 64)
    if (this.#state === 'COUNTDOWN') {
      this.#countLeft -= dt
      const n = Math.ceil(this.#countLeft / COUNT_STEP)
      this.#countdownFace(n)
      if (this.#countLeft <= 0) this.#begin()
      return
    }
    if (this.#state !== 'PLAYING') return
    const clock = this.#clock
    if (clock) {
      const over = clock.step(dt)
      this.#hud(this.#score, clock.left)
      this.#game?.step?.(dt, clock.left)
      if (over && this.#state === 'PLAYING') {
        this.#result({
          score: this.#score,
          reason: 'time',
          detail: `${this.#def?.seconds ?? 0}초를 채웠습니다`,
          success: true,
        })
      }
      return
    }
    this.#game?.step?.(dt, 0)
  }

  #hud(score: number, seconds: number): void {
    if (this.#hudScore) this.#hudScore.textContent = String(score)
    if (this.#hudTime) this.#hudTime.textContent = String(Math.max(0, Math.ceil(seconds)))
  }

  #show(html: string): void {
    if (!this.#overlay) return
    this.#overlay.innerHTML = html
    this.#overlay.hidden = false
    // The pause screen deliberately has no autofocus: the visitor was very
    // likely holding Space when the window went, and a focused 계속 button
    // would take that as a click. Resuming is a decision, so it is a click or
    // a Tab-and-Enter, never the key that was already down.
    const auto = this.#overlay.querySelector<HTMLElement>('[data-autofocus]')
    if (auto) auto.focus()
    else this.#layer?.querySelector<HTMLElement>('[data-game-shell]')?.focus()
  }

  #hide(): void {
    if (this.#overlay) {
      this.#overlay.hidden = true
      this.#overlay.innerHTML = ''
    }
  }

  #ready(touch: boolean): void {
    const def = this.#def!
    const best = bestFor(def.id) || undefined
    this.#show(`
      <div class="game__card">
        <p class="game__hint">${def.hint}</p>
        <ul class="game__controls">
          ${def.controls.map((c) => `<li><kbd>${touch ? c.touch : c.keys}</kbd><span>${c.does}</span></li>`).join('')}
        </ul>
        <p class="game__meta">${def.seconds}초 한 판${best !== undefined ? ` · 최고 ${best}점` : ''}</p>
        <div class="game__actions">
          <button class="game__btn game__btn--primary" type="button" data-game-start data-autofocus>시작</button>
          <button class="game__btn" type="button" data-game-exit>${this.#exitLabel()}</button>
        </div>
      </div>`)
    this.#overlay!.querySelector('[data-game-start]')!.addEventListener('click', () => this.#countdown())
    this.#overlay!.querySelector('[data-game-exit]')!.addEventListener('click', () => this.#quit())
  }

  /**
   * Three, two, one.
   *
   * Not decoration: the round starts on a key or a tap, and starting the
   * clock on the same gesture means the first second of every round is spent
   * finding out where everything is. It is also the one place a game can be
   * safely re-entered from — a retry goes through it, so nothing has to
   * decide whether a fresh round is "resumed".
   */
  #countdown(): void {
    if (!this.#game) return
    if (!this.#machine.to('COUNTDOWN')) return
    // A gesture has happened by now; let the site's player know.
    audio.unlock()
    this.#hide()
    this.#countLeft = motion.reduced ? 1 : COUNT_FROM * COUNT_STEP
    this.#countdownFace(COUNT_FROM)
    this.#run()
  }

  #countdownFace(n: number): void {
    if (!this.#overlay) return
    if (n <= 0) {
      this.#hide()
      return
    }
    this.#overlay.hidden = false
    this.#overlay.innerHTML =
      `<p class="game__count" aria-live="assertive" data-game-count>${n}</p>`
  }

  /** The countdown reached zero. */
  #begin(): void {
    if (!this.#machine.to('PLAYING')) return
    this.#hide()
    audio.play('game_start', 0.3)
    this.#clock?.reset()
    this.#clock?.start()
    this.#input?.setEnabled(true)
    this.#game?.start()
  }

  pause(): void {
    if (!this.#machine.is('PLAYING', 'COUNTDOWN')) return
    if (!this.#machine.to('PAUSED')) return
    // Let go of everything held first, and say it was not the player who let
    // go. Somebody who alt-tabs with Space down must not come back still
    // holding it.
    this.#input?.setEnabled(false)
    this.#clock?.pause()
    this.#stop()
    this.#game?.pause()
    this.#show(`
      <div class="game__card">
        <p class="game__hint">일시정지</p>
        <div class="game__actions">
          <button class="game__btn game__btn--primary" type="button" data-game-resume>계속</button>
          <button class="game__btn" type="button" data-game-exit>그만두기</button>
        </div>
      </div>`)
    this.#overlay!.querySelector('[data-game-resume]')!.addEventListener('click', () => this.resume())
    this.#overlay!.querySelector('[data-game-exit]')!.addEventListener('click', () => this.#quit())
  }

  resume(): void {
    if (this.#state !== 'PAUSED' || !this.#game) return
    if (!this.#machine.to('PLAYING')) return
    this.#hide()
    this.#clock?.resume()
    this.#input?.setEnabled(true)
    this.#run()
    this.#game.resume()
  }

  #result(r: GameResult): void {
    if (this.#state === 'CLOSED' || !this.#def) return
    if (!this.#machine.to('RESULT')) return
    this.#input?.setEnabled(false)
    this.#clock?.pause()
    this.#stop()
    this.#game?.pause()
    const def = this.#def
    const prev = bestFor(def.id)
    const isRecord = r.score > prev
    const stars = Math.max(0, Math.min(3, r.stars ?? 0))
    const best = r.reason === 'quit' ? prev : record(def.id, r.score, stars).best
    // The round's own verdict, in the user's delivered sounds (PHASE 10):
    // a star for a round worth one, the fail for being caught or for
    // nothing at all. A quit is neither.
    if (r.reason !== 'quit') {
      if (stars > 0) audio.play('star_get', 0.36)
      else if (r.reason === 'caught' || r.score === 0) audio.play('game_fail', 0.3)
    }
    this.#show(`
      <div class="game__card" data-game-result data-reason="${r.reason}" data-stars="${stars}" data-score="${r.score}" data-best="${best}">
        <p class="game__reason"><b>${REASON_LABEL[r.reason]}</b> · ${r.detail}</p>
        <p class="game__score"><b data-result-score>${r.score}</b><span>점</span></p>
        ${stars ? `<p class="game__stars" aria-label="별 ${stars}개">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>` : ''}
        <p class="game__meta">${isRecord && r.reason !== 'quit' ? '신기록!' : `최고 ${best}점`}${persistent() ? '' : ' · 이 브라우저는 기록을 저장하지 않습니다'}</p>
        <div class="game__actions">
          <button class="game__btn game__btn--primary" type="button" data-game-retry data-autofocus>재도전</button>
          <button class="game__btn" type="button" data-game-exit>${this.#exitLabel()}</button>
        </div>
      </div>`)
    this.#overlay!.querySelector('[data-game-retry]')!.addEventListener('click', () => this.#retry())
    this.#overlay!.querySelector('[data-game-exit]')!.addEventListener('click', () => this.#quit())
  }

  /** Everything from scratch: a new instance, not a reset of the old one. */
  #retry(): void {
    if (!this.#def) return
    this.#teardownRound()
    this.#game?.destroy()
    this.#game = null
    this.#hide()
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches
    this.#mount(touch)
    this.#countdown()
  }

  /** Everything a round owns, let go of. Called before a retry and on close. */
  #teardownRound(): void {
    this.#stop()
    this.#input?.destroy()
    this.#input = null
    this.#clock = null
  }

  #leaving = false

  #quit(): void {
    const leave = this.#host.leave
    if (!leave) {
      this.close()
      return
    }
    if (this.#leaving) return
    this.#leaving = true
    // Nothing runs, and nothing can be pressed, on the way out.
    this.#input?.setEnabled(false)
    this.#stop()
    void leave(() => this.close()).finally(() => { this.#leaving = false })
  }

  #exitLabel(): string {
    return this.#host.exitLabel?.() ?? '차고로'
  }

  close(): void {
    if (this.#state === 'CLOSED') return
    this.#machine.to('CLOSED')
    this.#teardownRound()
    this.#game?.destroy()
    this.#game = null
    for (const off of this.#offs) off()
    this.#offs = []
    this.#layer?.remove()
    this.#layer = null
    this.#box = null
    this.#overlay = null
    this.#root.hidden = true
    const id = this.#def?.id ?? ''
    this.#def = null
    this.#host.onOpenChange?.(false, id)
    this.#lastFocus?.focus()
    this.#lastFocus = null
  }
}
