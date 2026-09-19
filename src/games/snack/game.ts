/**
 * 도깨비 야식 심부름 — on the pixel screen (WORLD 2.1).
 *
 * The snack stall at night: a red awning, a counter, a pot steaming on the
 * fire. A dokkaebi comes to the counter and asks for something; what they
 * want is in their speech bubble, as a picture as well as in words. Four
 * things are on the shelf below — hand over the right one. Right is points,
 * the stall's bell and the next customer; wrong is a second and a half off
 * the clock. Thirty seconds.
 *
 * Everything on the shelf is from src/data/fridge.ts — the same week's
 * shopping stacked outside the shutter — brought down to pixels. Nothing was
 * drawn for this game and there is no real-world brand anywhere in it. The
 * rules (src/games/snack/round.ts) are unchanged by the move to pixels.
 */
import { SnackRound, starsFor, WRONG_MS } from '@/games/snack/round'
import { PixelStage, SCREEN } from '@/games/pixel/stage'
import { pixelize, type PixelSprite } from '@/games/pixel/sprites'
import { LANTERN, PAL, SPARK } from '@/games/pixel/art'
import { drawText, textWidth } from '@/games/pixel/font'
import { spritesFor } from '@/data/sprites'
import { seededRandom } from '@/scenes/npc'
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'

const ROUND = 30

export const SNACK_GAME: GameDef = {
  id: 'snack',
  title: '도깨비 야식 심부름',
  hint: '말풍선 속 야식을 골라 건네주세요. 틀리면 시간이 깎여요.',
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
  readonly #stage: PixelStage
  readonly #round: SnackRound
  readonly #says: HTMLElement
  readonly #name: HTMLElement
  readonly #shelf: HTMLElement
  readonly #run: HTMLElement
  #asker: PixelSprite[] = []
  #askerFor = ''
  #icons = new Map<string, PixelSprite>()
  #running = false
  #t = 0
  #shake = 0
  #wrongAt = -9
  #rightAt = -9

  constructor(host: GameHost) {
    this.#host = host
    this.#root = host.root
    const seed = Number(new URLSearchParams(location.search).get('snackseed'))
    this.#round = new SnackRound(Number.isFinite(seed) && seed > 0 ? { random: seededRandom(seed) } : {})
    this.#root.classList.add('pixel-game', 'snack')
    this.#stage = new PixelStage({ root: this.#root, border: PAL.ink })
    // What the customer says, in words, over the screen (the picture of it is
    // in the bubble on the screen), and who it is.
    const caption = document.createElement('p')
    caption.className = 'snack__caption'
    caption.innerHTML = '<b class="snack__name" data-snack-name></b> <span class="snack__says" data-snack-says aria-live="polite"></span> <span class="snack__run" data-snack-run hidden></span>'
    this.#stage.el.append(caption)
    this.#says = caption.querySelector('[data-snack-says]')!
    this.#name = caption.querySelector('[data-snack-name]')!
    this.#run = caption.querySelector('[data-snack-run]')!
    this.#shelf = document.createElement('div')
    this.#shelf.className = 'snack__shelf pixel-game__pad'
    this.#shelf.dataset['snackShelf'] = ''
    this.#shelf.setAttribute('role', 'group')
    this.#shelf.setAttribute('aria-label', '야식')
    this.#root.append(this.#shelf)
    this.#show()
    void this.#load()
    this.#draw()
  }

  async #load(): Promise<void> {
    await this.#loadAsker()
    this.#draw()
  }

  async #loadAsker(): Promise<void> {
    const who = this.#round.order.who
    if (this.#askerFor === who) return
    this.#askerFor = who
    const set = spritesFor(who)
    const frames = set?.wave.front.frames.slice(0, 4) ?? set?.idle.front.frames.slice(0, 1) ?? []
    const got = (await Promise.all(frames.map((f) => pixelize(f, 46)))).filter((s): s is PixelSprite => !!s)
    if (this.#askerFor === who) this.#asker = got
  }

  async #icon(art: string): Promise<PixelSprite | null> {
    const hit = this.#icons.get(art)
    if (hit) return hit
    const sp = await pixelize(art, 22, { levels: 5 })
    if (sp) this.#icons.set(art, sp)
    return sp
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
    this.#stage.destroy()
    this.#shelf.remove()
    this.#root.classList.remove('snack')
  }

  onInput(event: GameInputEvent): void {
    if (!this.#running || this.#round.done) return
    if (event.kind !== 'SELECT') return
    // A tap on a thing, or a number key for the nth thing: both arrive here
    // as a choice through the shared input manager.
    let id = event.choice
    if (id && /^[1-9]$/.test(id)) id = this.#round.order.choices[Number(id) - 1]?.id
    if (!id) return
    this.#give(id)
  }

  step(dt: number, secondsLeft: number): void {
    if (!this.#running) return
    const s = dt / 1000
    this.#t += s
    this.#shake = Math.max(0, this.#shake - s)
    if (this.#shake <= 0) this.#shelf.classList.remove('is-wrong')
    this.#host.hud(this.#round.score, secondsLeft)
    this.#draw()
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
      this.#rightAt = this.#t
      this.#show()
      void this.#loadAsker()
    } else {
      // Time, not a life. A wrong hand-over has no sound of its own: the
      // shelf shakes and the customer frowns instead.
      this.#host.penalty(WRONG_MS)
      this.#shelf.classList.add('is-wrong')
      this.#shake = 0.42
      this.#wrongAt = this.#t
      this.#run.hidden = true
    }
    this.#host.hud(this.#round.score, 0)
  }

  /** The words for the order, and the four things on the shelf. */
  #show(): void {
    const order = this.#round.order
    this.#says.textContent = order.says
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
        `<canvas class="snack__art" width="1" height="1" data-src="${item.art}" aria-hidden="true"></canvas>`
        + `<span class="snack__label">${item.label}</span>`
        + `<span class="snack__key" aria-hidden="true">${i + 1}</span>`
      this.#shelf.append(btn)
      const cv = btn.querySelector<HTMLCanvasElement>('canvas')!
      if (item.art) {
        void this.#icon(item.art).then((sp) => {
          if (!sp) return
          cv.width = sp.w
          cv.height = sp.h
          cv.getContext('2d')?.drawImage(sp.canvas, 0, 0)
        })
      }
    })
    const run = this.#round.run
    this.#run.hidden = run < 2
    this.#run.textContent = `${run}연속 ×${this.#round.multiplier.toFixed(2)}`
  }

  // ── Drawing ─────────────────────────────────────────────────────────────
  #draw(): void {
    const ctx = this.#stage.ctx
    const order = this.#round.order
    // Night sky over the stall, and the stars.
    ctx.fillStyle = PAL.night
    ctx.fillRect(0, 0, SCREEN.w, 60)
    ctx.fillStyle = PAL.night2
    ctx.fillRect(0, 60, SCREEN.w, 40)
    const tw = Math.floor(this.#t * 2)
    for (const [x, y, k] of [[20, 10, 0], [60, 24, 1], [104, 6, 2], [150, 16, 0], [214, 8, 1], [232, 30, 2]] as const) {
      ctx.fillStyle = (tw + k) % 3 === 0 ? PAL.white : PAL.star
      ctx.fillRect(x, y, 1, 1)
    }
    // The stall's back wall, warm under the awning.
    ctx.fillStyle = PAL.wood2
    ctx.fillRect(10, 40, SCREEN.w - 20, 70)
    ctx.fillStyle = 'rgba(255,207,107,.14)'
    ctx.fillRect(10, 40, SCREEN.w - 20, 70)
    // Shelves on the wall behind, with jars.
    ctx.fillStyle = PAL.wood
    ctx.fillRect(140, 62, 86, 3)
    ctx.fillRect(140, 82, 86, 3)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = [PAL.lamp, PAL.red, PAL.paper, PAL.grass3, PAL.lamp2, PAL.ghost][i]!
      ctx.fillRect(146 + i * 13, 54, 7, 8)
      ctx.fillRect(149 + i * 13, 74, 6, 8)
    }
    // The awning: red and white, with a scalloped edge.
    for (let x = 0; x < SCREEN.w; x += 12) {
      ctx.fillStyle = Math.floor(x / 12) % 2 ? PAL.white : PAL.red
      ctx.fillRect(x, 26, 12, 16)
      ctx.fillRect(x + 2, 42, 8, 3)
    }
    ctx.fillStyle = PAL.red2
    ctx.fillRect(0, 26, SCREEN.w, 2)
    ctx.drawImage(LANTERN().canvas, 16, 46)
    ctx.drawImage(LANTERN().canvas, SCREEN.w - 22, 46)
    // The customer, behind the counter.
    const asker = this.#asker
    if (asker.length) {
      const frown = this.#t - this.#wrongAt < 0.5
      const sp = asker[frown ? 0 : Math.floor(this.#t * 5) % asker.length]!
      const hop = this.#t - this.#rightAt < 0.25 ? 3 : 0
      const sx = this.#shake > 0 ? Math.round(Math.sin(this.#t * 80) * 2) : 0
      ctx.drawImage(sp.canvas, Math.round(58 - sp.w / 2) + sx, 118 - sp.h - hop)
    }
    // The speech bubble, with what they want in it.
    const bx = 86
    const by = 50
    ctx.fillStyle = PAL.ink
    ctx.fillRect(bx - 1, by - 1, 38, 32)
    ctx.fillRect(bx - 5, by + 20, 6, 3)
    ctx.fillStyle = PAL.white
    ctx.fillRect(bx, by, 36, 30)
    ctx.fillRect(bx - 4, by + 21, 5, 1)
    const want = order.wants.art ? this.#icons.get(order.wants.art) : undefined
    if (want) ctx.drawImage(want.canvas, Math.round(bx + 18 - want.w / 2), Math.round(by + 15 - want.h / 2))
    else if (order.wants.art) void this.#icon(order.wants.art)
    if (this.#t - this.#wrongAt < 0.5) {
      // A red cross over the bubble: not that.
      ctx.fillStyle = PAL.red
      for (let i = 0; i < 10; i++) {
        ctx.fillRect(bx + 13 + i, by + 10 + i, 2, 2)
        ctx.fillRect(bx + 22 - i, by + 10 + i, 2, 2)
      }
    }
    // The counter, and the pot steaming on its fire.
    ctx.fillStyle = PAL.wood
    ctx.fillRect(0, 112, SCREEN.w, 48)
    ctx.fillStyle = PAL.wood3
    ctx.fillRect(0, 112, SCREEN.w, 3)
    ctx.fillStyle = PAL.wood2
    for (let x = 6; x < SCREEN.w; x += 20) ctx.fillRect(x, 120, 1, 40)
    ctx.fillStyle = PAL.ink
    ctx.fillRect(176, 98, 30, 16)
    ctx.fillStyle = PAL.stone2
    ctx.fillRect(177, 99, 28, 13)
    ctx.fillStyle = PAL.stone
    ctx.fillRect(177, 99, 28, 2)
    for (let i = 0; i < 3; i++) {
      const y = 92 - ((this.#t * 14 + i * 7) % 22)
      ctx.fillStyle = 'rgba(246,241,230,.55)'
      ctx.fillRect(184 + i * 6 + Math.round(Math.sin(this.#t * 3 + i) * 2), Math.round(y), 2, 3)
    }
    // A right one: sparks off the counter.
    const since = this.#t - this.#rightAt
    if (since < 0.7) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const f = SPARK[Math.min(3, Math.floor(since * 6))]!()
        ctx.drawImage(f.canvas, Math.round(104 + Math.cos(a) * since * 40), Math.round(66 + Math.sin(a) * since * 30))
      }
      const t = 'GOOD!'
      drawText(ctx, t, Math.round(104 - textWidth(t) / 2), Math.round(40 - since * 12), PAL.gold)
    }
    // The run, in the corner.
    if (this.#round.run >= 2) {
      const t = `X${this.#round.multiplier.toFixed(1)}`
      drawText(ctx, t, SCREEN.w - 6 - textWidth(t), 4, PAL.gold)
    }
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
