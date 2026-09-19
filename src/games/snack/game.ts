/**
 * 도깨비 야식 심부름.
 *
 * Somebody in the room wants something out of the fridge. Four things are on
 * the shelf; hand over the right one. Getting it right is points and the next
 * order, getting it wrong is a second and a half off the clock and another go.
 * Thirty seconds.
 *
 * Everything on that shelf came out of src/data/fridge.ts, which is the same
 * week's shopping that is stacked outside the shutter. Nothing was drawn for
 * this game and there is no real-world brand anywhere in it.
 *
 * The shell owns the clock, the countdown, the result and the best score, and
 * the penalty for a wrong answer is spent through it (`host.penalty`) rather
 * than out of a second clock kept here — two clocks is how a round ends twice.
 */
import { SnackRound, starsFor, WRONG_MS } from '@/games/snack/round'
import { spritesFor } from '@/data/sprites'
import { seededRandom } from '@/scenes/npc'
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'

const ROUND = 30

export const SNACK_GAME: GameDef = {
  id: 'snack',
  title: '도깨비 야식 심부름',
  hint: '달라는 걸 골라서 건네주세요. 틀리면 시간이 깎입니다.',
  controls: [
    { keys: '1 2 3 4', touch: '누르기', does: '골라서 건네기' },
    { keys: '틀리면', touch: '틀리면', does: `${WRONG_MS / 1000}초 손해` },
  ],
  seconds: ROUND,
  mount: (host) => new SnackGame(host),
}

class SnackGame implements GameInstance {
  readonly #host: GameHost
  readonly #root: HTMLElement
  #round: SnackRound
  #asker: HTMLImageElement
  #bubble: HTMLElement
  #name: HTMLElement
  #shelf: HTMLElement
  #run: HTMLElement
  #running = false
  #shakeIn = 0

  constructor(host: GameHost) {
    this.#host = host
    this.#root = host.root
    const seed = Number(new URLSearchParams(location.search).get('snackseed'))
    this.#round = new SnackRound(
      Number.isFinite(seed) && seed > 0 ? { random: seededRandom(seed) } : {})

    this.#root.classList.add('snack')
    this.#root.innerHTML = `
      <div class="snack__who">
        <img class="snack__whoImg" alt="" decoding="async" data-snack-who>
        <p class="snack__bubble" data-snack-says aria-live="polite"></p>
        <p class="snack__name" data-snack-name></p>
      </div>
      <p class="snack__run" data-snack-run hidden></p>
      <div class="snack__shelf" data-snack-shelf role="group" aria-label="야식"></div>`
    this.#asker = this.#root.querySelector('[data-snack-who]')!
    this.#bubble = this.#root.querySelector('[data-snack-says]')!
    this.#name = this.#root.querySelector('[data-snack-name]')!
    this.#shelf = this.#root.querySelector('[data-snack-shelf]')!
    this.#run = this.#root.querySelector('[data-snack-run]')!
    this.#show()
  }

  start(): void {
    this.#running = true
  }

  pause(): void {
    this.#running = false
  }

  resume(): void {
    this.#running = true
  }

  destroy(): void {
    this.#running = false
    this.#root.classList.remove('snack')
    this.#root.textContent = ''
  }

  onInput(event: GameInputEvent): void {
    if (!this.#running || this.#round.done) return
    if (event.kind !== 'SELECT') return
    // A tap on a thing, or a number key for the nth thing. Both arrive here
    // as a choice, which is the whole point of the input manager.
    let id = event.choice
    if (id && /^[1-9]$/.test(id)) {
      const nth = this.#round.order.choices[Number(id) - 1]
      id = nth?.id
    }
    if (!id) return
    this.#give(id)
  }

  step(dt: number, secondsLeft: number): void {
    if (!this.#running) return
    if (this.#shakeIn > 0) {
      this.#shakeIn -= dt
      if (this.#shakeIn <= 0) this.#shelf.classList.remove('is-wrong')
    }
    this.#host.hud(this.#round.score, secondsLeft)
    if (secondsLeft <= 0 && !this.#round.done) {
      this.#round.finish()
      this.#finish()
    }
  }

  #give(itemId: string): void {
    const right = this.#round.give(itemId)
    if (right) {
      // The stall's own bell for a right order (the user's `sfx_stall_bell`).
      this.#host.sfx('stall_bell', 0.26)
      this.#show()
    } else {
      // Time, not a life. A wrong answer is a cost and never the end.
      this.#host.penalty(WRONG_MS)
      // No sound of its own for a wrong hand-over: the shelf shakes instead.
      this.#shelf.classList.add('is-wrong')
      this.#shakeIn = 420
      this.#run.hidden = true
    }
    this.#host.hud(this.#round.score, 0)
  }

  /** Draw whoever is asking, and what is on the shelf. */
  #show(): void {
    const order = this.#round.order
    const set = spritesFor(order.who)
    const anim = set
      ? (set as unknown as Record<string, Record<string, { frames: readonly string[] }>>)['wave']?.['front']
      ?? (set as unknown as Record<string, Record<string, { frames: readonly string[] }>>)['idle']?.['front']
      : null
    const src = anim?.frames[0]
    if (src && this.#asker.getAttribute('src') !== src) this.#asker.src = src
    this.#bubble.textContent = order.says
    this.#name.textContent = order.whoName

    this.#shelf.textContent = ''
    order.choices.forEach((item, i) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'snack__item'
      // `data-choice` is what the shared input manager looks for; nothing
      // here listens for a click of its own.
      btn.dataset['choice'] = item.id
      btn.setAttribute('aria-label', `${item.label} 건네기`)
      btn.innerHTML =
        `<span class="snack__art" style="background-image:url('${item.art}')"></span>`
        + `<span class="snack__label">${item.label}</span>`
        + `<span class="snack__key" aria-hidden="true">${i + 1}</span>`
      this.#shelf.append(btn)
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
      detail: `${this.#round.filled}개 배달${this.#round.wrong ? ` · ${this.#round.wrong}번 헛걸음` : ''}`,
      stars: starsFor(score),
      success: true,
    })
  }
}
