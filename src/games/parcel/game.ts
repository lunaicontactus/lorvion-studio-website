/**
 * 택배 정리.
 *
 * What came in this week, split between the five things the studio is making.
 * A parcel arrives with a project's name and colour on it; put it on that
 * project's pile. Thirty seconds, and a wrong pile costs a second and a half.
 *
 * Three ways to do it, because a game that can only be dragged is a game
 * somebody cannot play: drag the parcel onto a pile, or tap the pile, or press
 * the number printed on it. All three arrive through the shared input manager
 * — drag as DRAG_END with a position to hit-test, the other two as SELECT —
 * and this game adds no listener of its own.
 *
 * Every pile carries the project's colour, its name and its own key art, so
 * nothing here is a test of reading small print.
 */
import { ParcelRound, starsFor, WRONG_MS } from '@/games/parcel/round'
import { artworkFor, wallSrc } from '@/data/artwork'
import { seededRandom } from '@/scenes/npc'
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'

const ROUND = 30
const ART = '/assets/images/garage'

export const PARCEL_GAME: GameDef = {
  id: 'parcel',
  title: '택배 정리',
  hint: '택배에 적힌 작품 더미에 올려놓으세요. 끌어도 되고, 눌러도 됩니다.',
  controls: [
    { keys: '1 2 3 4 5', touch: '더미 누르기', does: '그 작품 더미로' },
    { keys: '드래그', touch: '끌어서 놓기', does: '같은 결과' },
  ],
  seconds: ROUND,
  mount: (host) => new ParcelGame(host),
}

class ParcelGame implements GameInstance {
  readonly #host: GameHost
  readonly #root: HTMLElement
  #round: ParcelRound
  #parcel: HTMLElement
  #label: HTMLElement
  #piles: HTMLElement
  #run: HTMLElement
  #running = false
  #shakeIn = 0
  #dragging = false

  constructor(host: GameHost) {
    this.#host = host
    this.#root = host.root
    const seed = Number(new URLSearchParams(location.search).get('parcelseed'))
    this.#round = new ParcelRound(
      Number.isFinite(seed) && seed > 0 ? { random: seededRandom(seed) } : {})

    this.#root.classList.add('parcel')
    this.#root.innerHTML = `
      <div class="parcel__belt">
        <div class="parcel__box" data-parcel-box>
          <img class="parcel__boxImg" src="${ART}/prop_parcel_closed.webp" alt="" decoding="async">
          <span class="parcel__label" data-parcel-label></span>
        </div>
        <p class="parcel__run" data-parcel-run hidden></p>
      </div>
      <div class="parcel__piles" data-parcel-piles role="group" aria-label="작품 더미"></div>`
    this.#parcel = this.#root.querySelector('[data-parcel-box]')!
    this.#label = this.#root.querySelector('[data-parcel-label]')!
    this.#piles = this.#root.querySelector('[data-parcel-piles]')!
    this.#run = this.#root.querySelector('[data-parcel-run]')!
    this.#show()
  }

  start(): void {
    this.#running = true
  }

  pause(): void {
    this.#running = false
    this.#drop()
  }

  resume(): void {
    this.#running = true
  }

  destroy(): void {
    this.#running = false
    this.#root.classList.remove('parcel')
    this.#root.textContent = ''
  }

  onInput(event: GameInputEvent): void {
    if (!this.#running || this.#round.done) return
    if (event.kind === 'SELECT') {
      let id = event.choice
      if (id && /^[1-9]$/.test(id)) id = this.#round.parcel.piles[Number(id) - 1]?.id
      if (id) this.#put(id)
      return
    }
    // Dragging the box itself. Where it is let go of decides the pile, which
    // is the same answer by a different route.
    if (event.kind === 'DRAG_START') {
      this.#dragging = true
      this.#parcel.classList.add('is-held')
      this.#move(event)
      return
    }
    if (event.kind === 'DRAG_MOVE' && this.#dragging) {
      this.#move(event)
      return
    }
    if (event.kind === 'DRAG_END') {
      if (!this.#dragging) return
      this.#drop()
      // A cancelled drag — a lost window, a taken-over gesture — puts the box
      // back and costs nothing. Only a real release is an answer.
      if (event.forced) return
      const pile = this.#under(event)
      if (pile) this.#put(pile)
    }
  }

  step(dt: number, secondsLeft: number): void {
    if (!this.#running) return
    this.#round.setProgress(1 - secondsLeft / ROUND)
    if (this.#shakeIn > 0) {
      this.#shakeIn -= dt
      if (this.#shakeIn <= 0) this.#piles.classList.remove('is-wrong')
    }
    this.#host.hud(this.#round.score, secondsLeft)
    if (secondsLeft <= 0 && !this.#round.done) {
      this.#round.finish()
      this.#finish()
    }
  }

  // ── Dragging ─────────────────────────────────────────────────────────────

  #move(event: GameInputEvent): void {
    if (event.x === undefined || event.y === undefined) return
    const box = this.#parcel.getBoundingClientRect()
    const root = this.#root.getBoundingClientRect()
    // Under the finger, by its middle.
    this.#parcel.style.setProperty('--dx', `${event.x - (box.left - root.left) - box.width / 2}px`)
    this.#parcel.style.setProperty('--dy', `${event.y - (box.top - root.top) - box.height / 2}px`)
    const over = this.#under(event)
    for (const el of this.#piles.querySelectorAll<HTMLElement>('.parcel__pile')) {
      el.classList.toggle('is-over', el.dataset['choice'] === over)
    }
  }

  #drop(): void {
    this.#dragging = false
    this.#parcel.classList.remove('is-held')
    this.#parcel.style.removeProperty('--dx')
    this.#parcel.style.removeProperty('--dy')
    for (const el of this.#piles.querySelectorAll('.parcel__pile')) el.classList.remove('is-over')
  }

  /** Which pile, if any, is under a point in the box's own pixels. */
  #under(event: GameInputEvent): string | undefined {
    if (event.x === undefined || event.y === undefined) return undefined
    const root = this.#root.getBoundingClientRect()
    const x = root.left + event.x
    const y = root.top + event.y
    for (const el of this.#piles.querySelectorAll<HTMLElement>('.parcel__pile')) {
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset['choice']
    }
    return undefined
  }

  // ── The answer ───────────────────────────────────────────────────────────

  #put(projectId: string): void {
    const right = this.#round.sort(projectId)
    if (right) {
      this.#host.sfx('wrapper', 0.3)
      this.#show()
    } else {
      this.#host.penalty(WRONG_MS)
      this.#host.sfx('click', 0.22)
      this.#piles.classList.add('is-wrong')
      this.#shakeIn = 420
      this.#run.hidden = true
    }
    this.#host.hud(this.#round.score, 0)
  }

  #show(): void {
    const parcel = this.#round.parcel
    // The label: the project's own colour and its own name, on the box.
    this.#label.textContent = parcel.project.title
    this.#parcel.style.setProperty('--accent', parcel.project.accent)
    this.#parcel.setAttribute('aria-label', `${parcel.project.title} 택배`)

    this.#piles.textContent = ''
    parcel.piles.forEach((project, i) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'parcel__pile'
      btn.dataset['choice'] = project.id
      btn.style.setProperty('--accent', project.accent)
      btn.setAttribute('aria-label', `${project.title} 더미`)
      const piece = artworkFor(project.id)
      const art = piece ? `background-image:url('${wallSrc(piece)}')` : ''
      btn.innerHTML =
        `<span class="parcel__pileArt" style="${art}"></span>`
        + `<span class="parcel__pileName">${project.title}</span>`
        + `<span class="parcel__key" aria-hidden="true">${i + 1}</span>`
      this.#piles.append(btn)
    })

    const run = this.#round.run
    this.#run.hidden = run < 2
    this.#run.textContent = `${run}연속 · x${this.#round.multiplier.toFixed(2)}`
  }

  #finish(): void {
    this.#running = false
    const score = this.#round.score
    this.#host.end({
      score,
      reason: 'time',
      detail: `${this.#round.sorted}개 정리${this.#round.wrong ? ` · ${this.#round.wrong}번 잘못 놓음` : ''}`,
      stars: starsFor(score),
      success: true,
    })
  }
}
