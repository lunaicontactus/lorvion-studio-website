/**
 * 김로드의 버그 잡기 (EUNGARAGE 2.0, PART 14.3). The rules are ./round.ts.
 *
 * Nine little monitors as real buttons, so a mouse, a finger, Tab + Enter and
 * the number keys 1–9 all play it. Each monitor says what is on it to a
 * screen reader as it changes (bug, working code, NUNU's build badge, empty).
 */
import { seededRandom } from '@/scenes/npc'
import { BugRound, CELLS, starsFor, type Kind } from '@/games/bugs/round'
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'

const ROUND = 45

const ICON: Readonly<Record<Kind, string>> = {
  bug: `<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="9" ry="10" fill="#e0584a"/><path d="M16 8v20" stroke="#3a1a1a" stroke-width="2"/><circle cx="12" cy="15" r="2" fill="#3a1a1a"/><circle cx="20" cy="21" r="2" fill="#3a1a1a"/><circle cx="16" cy="7" r="4" fill="#3a1a1a"/><path d="M7 14l-4-3M7 19H2M8 24l-4 3M25 14l4-3M25 19h5M24 24l4 3" stroke="#3a1a1a" stroke-width="2" stroke-linecap="round"/><circle cx="14.5" cy="6" r="1" fill="#fff"/><circle cx="17.5" cy="6" r="1" fill="#fff"/></svg>`,
  code: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="6" width="26" height="20" rx="3" fill="#d9f7e9"/><path d="M12 12l-4 4 4 4M20 12l4 4-4 4" stroke="#1d5a40" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 11l-2 10" stroke="#1d5a40" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  build: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="#ffe99a" stroke="#c99a1e" stroke-width="2"/><path d="M10 16l4 4 8-9" stroke="#2f6b45" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
}
const LABEL: Readonly<Record<Kind | 'empty', string>> = { bug: '버그', code: '정상 코드', build: '누누의 빌드 성공 배지', empty: '빈 화면' }

export const BUGS_GAME: GameDef = {
  id: 'bugs',
  title: '김로드의 버그 잡기',
  hint: '화면에 나타난 버그를 눌러 잡아요. 초록 정상 코드와 노란 빌드 배지는 누르면 안 돼요!',
  controls: [
    { keys: '1–9 / Tab + Enter', touch: '화면 누르기', does: '버그 잡기' },
  ],
  seconds: ROUND,
  holdKeys: [],
  controlKeys: Object.fromEntries(Array.from({ length: CELLS }, (_, i) => [String(i + 1), `c${i}`])),
  mount: (host) => new BugGame(host),
}

class BugGame implements GameInstance {
  readonly #host: GameHost
  readonly #round: BugRound
  readonly #grid: HTMLElement
  readonly #cells: HTMLButtonElement[]
  readonly #toast: HTMLElement
  #running = false
  #ended = false
  #shown: (Kind | null)[] = Array.from({ length: CELLS }, () => null)

  constructor(host: GameHost) {
    this.#host = host
    const seed = Number(new URLSearchParams(location.search).get('bugseed'))
    this.#round = new BugRound({ seconds: ROUND, ...(Number.isFinite(seed) && seed > 0 ? { random: seededRandom(seed) } : {}) })
    host.root.classList.add('bug-game')
    this.#grid = document.createElement('div')
    this.#grid.className = 'bug-game__grid'
    this.#grid.innerHTML = Array.from({ length: CELLS }, (_, i) =>
      `<button type="button" class="bug-cell" data-control="c${i}" data-cell="${i}" aria-label="${i + 1}번 화면: ${LABEL.empty}"><span class="bug-cell__no" aria-hidden="true">${i + 1}</span><span class="bug-cell__icon"></span></button>`).join('')
    host.root.append(this.#grid)
    this.#cells = [...this.#grid.querySelectorAll<HTMLButtonElement>('.bug-cell')]
    this.#toast = document.createElement('p')
    this.#toast.className = 'bug-game__toast'
    this.#toast.setAttribute('role', 'status')
    host.root.append(this.#toast)
  }

  start(): void { this.#running = true }
  pause(): void { this.#running = false }
  resume(): void { this.#running = true }
  destroy(): void {
    this.#running = false
    this.#grid.remove()
    this.#toast.remove()
  }

  onInput(e: GameInputEvent): void {
    if (!this.#running || this.#ended || e.kind !== 'PRESS' || !e.control?.startsWith('c')) return
    const cell = Number(e.control.slice(1))
    const ev = this.#round.hit(cell)
    const btn = this.#cells[cell]
    if (ev.kind === 'squash') {
      this.#host.sfx('eat_soft', 0.22)
      this.#flash(btn, 'is-squashed', `+${ev.points}${ev.streak > 2 ? ` · ${ev.streak}연속` : ''}`)
    } else if (ev.kind === 'oops') {
      this.#host.sfx('game_fail', 0.16)
      this.#flash(btn, 'is-oops', `${ev.points} · ${ev.what === 'build' ? '빌드 배지를 눌렀어!' : '정상 코드였어!'}`)
    }
    this.#render()
  }

  step(dt: number, secondsLeft: number): void {
    if (!this.#running || this.#ended) return
    this.#round.step(Math.min(dt, 50) / 1000)
    this.#render()
    const r = this.#round
    this.#host.hud(r.score, secondsLeft)
    this.#host.root.dataset['squashed'] = String(r.squashed)
    this.#host.root.dataset['mistakes'] = String(r.mistakes)
    if (secondsLeft <= 0) this.#finish()
  }

  #render(): void {
    for (let i = 0; i < CELLS; i++) {
      const pop = this.#round.pops.find((p) => p.cell === i)
      const kind = pop?.kind ?? null
      if (kind === this.#shown[i]) continue
      this.#shown[i] = kind
      const btn = this.#cells[i]!
      btn.dataset['kind'] = kind ?? 'empty'
      btn.querySelector('.bug-cell__icon')!.innerHTML = kind ? ICON[kind] : ''
      btn.setAttribute('aria-label', `${i + 1}번 화면: ${LABEL[kind ?? 'empty']}`)
    }
  }

  #flash(btn: HTMLButtonElement | undefined, cls: string, text: string): void {
    this.#toast.textContent = text
    if (!btn) return
    btn.classList.remove('is-squashed', 'is-oops')
    void btn.offsetWidth
    btn.classList.add(cls)
  }

  #finish(): void {
    if (this.#ended) return
    this.#ended = true
    this.#running = false
    const r = this.#round
    this.#host.end({
      score: r.score,
      reason: 'time',
      detail: `버그 ${r.squashed}마리 · 실수 ${r.mistakes}번`,
      stars: starsFor(r.score),
      success: true,
    })
  }
}
