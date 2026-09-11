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
import { save } from '@/systems/storage'
import type { GameDef, GameInstance, GameResult } from '@/games/types'

export type RunnerState = 'CLOSED' | 'READY' | 'PLAYING' | 'PAUSED' | 'RESULT'

export interface RunnerHost {
  /** A game opened or closed: the room should stop or start behind it. */
  readonly onOpenChange?: (open: boolean) => void
}

const REASON_LABEL: Record<GameResult['reason'], string> = {
  time: '시간 종료',
  caught: '발각',
  quit: '중단',
}

export class GameRunner {
  #root: HTMLElement
  #host: RunnerHost
  #state: RunnerState = 'CLOSED'
  #def: GameDef | null = null
  #game: GameInstance | null = null
  #layer: HTMLElement | null = null
  #box: HTMLElement | null = null
  #overlay: HTMLElement | null = null
  #hudScore: HTMLElement | null = null
  #hudTime: HTMLElement | null = null
  #lastFocus: HTMLElement | null = null
  #offs: (() => void)[] = []

  constructor(root: HTMLElement, host: RunnerHost = {}) {
    this.#root = root
    this.#host = host
  }

  get state(): RunnerState {
    return this.#state
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
        this.#start()
      }
    }
    // Capture, so the room's own key handling never sees a game key.
    document.addEventListener('keydown', onKey, true)
    this.#offs.push(() => document.removeEventListener('keydown', onKey, true))

    this.#mount(touch)
    this.#state = 'READY'
    this.#host.onOpenChange?.(true)
    this.#ready(touch)
    layer.querySelector<HTMLElement>('[data-game-shell]')?.focus()
  }

  #mount(touch: boolean): void {
    if (!this.#def || !this.#box) return
    this.#box.textContent = ''
    this.#hud(0, this.#def.seconds)
    this.#game = this.#def.mount({
      root: this.#box,
      reduced: motion.reduced,
      touch,
      end: (r) => this.#result(r),
      sfx: (name, volume) => audio.play(name, volume),
      hud: (score, seconds) => this.#hud(score, seconds),
    })
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
    const best = save.data.games[def.id]
    this.#show(`
      <div class="game__card">
        <p class="game__hint">${def.hint}</p>
        <ul class="game__controls">
          ${def.controls.map((c) => `<li><kbd>${touch ? c.touch : c.keys}</kbd><span>${c.does}</span></li>`).join('')}
        </ul>
        <p class="game__meta">${def.seconds}초 한 판${best !== undefined ? ` · 최고 ${best}점` : ''}</p>
        <div class="game__actions">
          <button class="game__btn game__btn--primary" type="button" data-game-start data-autofocus>시작</button>
          <button class="game__btn" type="button" data-game-exit>차고로</button>
        </div>
      </div>`)
    this.#overlay!.querySelector('[data-game-start]')!.addEventListener('click', () => this.#start())
    this.#overlay!.querySelector('[data-game-exit]')!.addEventListener('click', () => this.#quit())
  }

  #start(): void {
    if (this.#state !== 'READY' || !this.#game) return
    // A gesture has happened by now; let the site's player know.
    audio.unlock()
    this.#hide()
    this.#state = 'PLAYING'
    this.#game.start()
  }

  pause(): void {
    if (this.#state !== 'PLAYING' || !this.#game) return
    this.#state = 'PAUSED'
    this.#game.pause()
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
    this.#hide()
    this.#state = 'PLAYING'
    this.#game.resume()
  }

  #result(r: GameResult): void {
    if (this.#state === 'CLOSED' || !this.#def) return
    this.#state = 'RESULT'
    this.#game?.pause()
    const def = this.#def
    const prev = save.data.games[def.id]
    const record = prev === undefined || r.score > prev
    if (record && r.reason !== 'quit') {
      save.update((d) => {
        d.games[def.id] = r.score
      })
    }
    const best = save.data.games[def.id] ?? r.score
    this.#show(`
      <div class="game__card" data-game-result data-reason="${r.reason}">
        <p class="game__reason"><b>${REASON_LABEL[r.reason]}</b> · ${r.detail}</p>
        <p class="game__score"><b data-result-score>${r.score}</b><span>점</span></p>
        <p class="game__meta">${record && r.reason !== 'quit' ? '신기록!' : `최고 ${best}점`}${save.persistent ? '' : ' · 이 브라우저는 기록을 저장하지 않습니다'}</p>
        <div class="game__actions">
          <button class="game__btn game__btn--primary" type="button" data-game-retry data-autofocus>재도전</button>
          <button class="game__btn" type="button" data-game-exit>차고로</button>
        </div>
      </div>`)
    this.#overlay!.querySelector('[data-game-retry]')!.addEventListener('click', () => this.#retry())
    this.#overlay!.querySelector('[data-game-exit]')!.addEventListener('click', () => this.#quit())
  }

  /** Everything from scratch: a new instance, not a reset of the old one. */
  #retry(): void {
    if (!this.#def) return
    this.#game?.destroy()
    this.#game = null
    this.#hide()
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches
    this.#mount(touch)
    this.#state = 'READY'
    this.#start()
  }

  #quit(): void {
    this.close()
  }

  close(): void {
    if (this.#state === 'CLOSED') return
    this.#state = 'CLOSED'
    this.#game?.destroy()
    this.#game = null
    for (const off of this.#offs) off()
    this.#offs = []
    this.#layer?.remove()
    this.#layer = null
    this.#box = null
    this.#overlay = null
    this.#root.hidden = true
    this.#def = null
    this.#host.onOpenChange?.(false)
    this.#lastFocus?.focus()
    this.#lastFocus = null
  }
}
