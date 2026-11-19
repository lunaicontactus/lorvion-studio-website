/**
 * 별똥별 받기 on the pixel screen (EUNGARAGE 2.0, PART 14.2). The rules are
 * ./round.ts; this draws them and turns keys, pads and pointers into them.
 * The catcher is MOMO from the room's own frames (spritesFor), pixelised the
 * way the other games do it, so the arcade and the garage are one crew.
 */
import { PixelStage, SCREEN } from '@/games/pixel/stage'
import { PAL, STAR, SPARK } from '@/games/pixel/art'
import { pixelize, mirrored, fromRows, type PixelSprite } from '@/games/pixel/sprites'
import { drawText, textWidth } from '@/games/pixel/font'
import { spritesFor } from '@/data/sprites'
import { seededRandom } from '@/scenes/npc'
import { FIELD, StarfallRound, starsFor } from '@/games/starfall/round'
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'

const ROUND = 60

/** The pink wish-star, made on first draw (no canvas before there is a page). */
let wishSprite: PixelSprite | null = null
const WISH = (): PixelSprite => (wishSprite ??= fromRows([
  '....#....',
  '...#+#...',
  '#########',
  '.#++#++#.',
  '..#####..',
  '.##...##.',
  '#.......#',
], { '#': PAL.pink, '+': PAL.white }))

export const STARFALL_GAME: GameDef = {
  id: 'starfall',
  title: '별똥별 받기',
  hint: '하늘에서 별이 떨어져요! 모모를 움직여 받아요. 분홍 소원별은 50점.',
  controls: [
    { keys: '← →', touch: '◀ ▶ 또는 화면 끌기', does: '움직이기' },
  ],
  seconds: ROUND,
  holdKeys: [],
  controlKeys: { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' },
  mount: (host) => new StarfallGame(host),
}

interface Burst { x: number; y: number; t: number; text: string; wish: boolean }

class StarfallGame implements GameInstance {
  readonly #host: GameHost
  readonly #stage: PixelStage
  readonly #round: StarfallRound
  readonly #pad: HTMLElement
  #walkR: PixelSprite[] = []
  #walkL: PixelSprite[] = []
  #idle: PixelSprite | null = null
  #running = false
  #ended = false
  #t = 0
  #bursts: Burst[] = []

  constructor(host: GameHost) {
    this.#host = host
    const seed = Number(new URLSearchParams(location.search).get('starseed'))
    this.#round = new StarfallRound(Number.isFinite(seed) && seed > 0 ? { random: seededRandom(seed) } : {})
    host.root.classList.add('pixel-game', 'starfall')
    this.#stage = new PixelStage({ root: host.root, border: PAL.ink })
    this.#pad = document.createElement('div')
    this.#pad.className = 'pixel-game__pad pixel-game__pad--controls'
    this.#pad.innerHTML = host.touch
      ? `<span class="pixel-pad__dir">
           <button type="button" class="pixel-pad__btn" data-control="left" aria-label="왼쪽">◀</button>
           <button type="button" class="pixel-pad__btn" data-control="right" aria-label="오른쪽">▶</button>
         </span>`
      : '<span><kbd>←</kbd><kbd>→</kbd> 움직이기 · 마우스로 끌어도 돼요</span>'
    host.root.append(this.#pad)
    void this.#load()
    this.#draw()
  }

  async #load(): Promise<void> {
    const set = spritesFor('momo')
    const right = set?.walk.right.frames.slice(0, 4) ?? []
    const [walk, idle] = await Promise.all([
      Promise.all(right.map((f) => pixelize(f, 22))),
      set ? pixelize(set.idle.front.frames[0]!, 22) : Promise.resolve(null),
    ])
    this.#walkR = walk.filter((s): s is PixelSprite => !!s)
    this.#walkL = this.#walkR.map(mirrored)
    this.#idle = idle
    this.#draw()
  }

  start(): void { this.#running = true }
  pause(): void {
    this.#running = false
    this.#round.control('left', false)
    this.#round.control('right', false)
    this.#round.aim(null)
  }
  resume(): void { this.#running = true }
  destroy(): void {
    this.#running = false
    this.#stage.destroy()
    this.#pad.remove()
  }

  /** A point in the game's box, as a point on the pixel screen. */
  #screenX(e: GameInputEvent): number | null {
    if (e.x === undefined) return null
    const root = this.#host.root.getBoundingClientRect()
    const c = this.#stage.canvas.getBoundingClientRect()
    if (!c.width) return null
    return ((root.left + e.x - c.left) / c.width) * SCREEN.w
  }

  onInput(e: GameInputEvent): void {
    if ((e.kind === 'PRESS' || e.kind === 'RELEASE') && e.control) this.#round.control(e.control, e.kind === 'PRESS')
    if (e.kind === 'POINT' || e.kind === 'DRAG_START' || e.kind === 'DRAG_MOVE') this.#round.aim(this.#screenX(e))
    if (e.kind === 'DRAG_END') this.#round.aim(null)
  }

  step(dt: number, secondsLeft: number): void {
    if (!this.#running || this.#ended) return
    const s = Math.min(dt, 50) / 1000
    this.#t += s
    for (const ev of this.#round.step(s)) {
      if (ev.kind === 'catch') {
        this.#host.sfx(ev.wish ? 'star_get' : 'stall_bell', ev.wish ? 0.3 : 0.12)
        this.#bursts.push({ x: ev.x, y: ev.y, t: 0, text: `+${ev.points}`, wish: ev.wish })
      }
    }
    for (const b of this.#bursts) b.t += s
    this.#bursts = this.#bursts.filter((b) => b.t < 0.9)
    const r = this.#round
    this.#host.hud(r.score, secondsLeft)
    this.#host.root.dataset['x'] = String(Math.round(r.x))
    this.#host.root.dataset['caught'] = String(r.caught)
    this.#draw()
    if (secondsLeft <= 0) this.#finish()
  }

  #finish(): void {
    if (this.#ended) return
    this.#ended = true
    this.#running = false
    const r = this.#round
    this.#host.end({
      score: r.score,
      reason: 'time',
      detail: `별 ${r.caught}개 · 소원별 ${r.wishes}개`,
      stars: starsFor(r.score),
      success: true,
    })
  }

  #draw(): void {
    const ctx = this.#stage.ctx
    // Sky in three bands, a few still stars that twinkle, the moon.
    ctx.fillStyle = PAL.night
    ctx.fillRect(0, 0, SCREEN.w, 56)
    ctx.fillStyle = PAL.night2
    ctx.fillRect(0, 56, SCREEN.w, 50)
    ctx.fillStyle = PAL.night3
    ctx.fillRect(0, 106, SCREEN.w, FIELD.floor - 106)
    const tw = Math.floor(this.#t * 2)
    for (const [x, y, k] of [[14, 10, 0], [52, 22, 1], [90, 8, 2], [130, 30, 0], [168, 12, 1], [204, 26, 2], [228, 6, 0], [30, 44, 1], [150, 52, 2]] as const) {
      ctx.fillStyle = (tw + k) % 3 === 0 ? PAL.white : PAL.star
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.fillStyle = PAL.moon
    ctx.fillRect(196, 14, 10, 10)
    ctx.fillRect(194, 16, 14, 6)
    ctx.fillRect(198, 12, 6, 14)
    // The garage roof the catcher stands on.
    ctx.fillStyle = PAL.wood2
    ctx.fillRect(0, FIELD.floor, SCREEN.w, SCREEN.h - FIELD.floor)
    ctx.fillStyle = PAL.wood
    ctx.fillRect(0, FIELD.floor, SCREEN.w, 2)
    // Falling stars, each with a short tail.
    for (const st of this.#round.stars) {
      const sp = st.wish ? WISH() : STAR()
      ctx.fillStyle = st.wish ? 'rgba(255,143,177,.45)' : 'rgba(255,210,87,.4)'
      ctx.fillRect(Math.round(st.x), Math.round(st.y - 10), 1, 8)
      ctx.drawImage(sp.canvas, Math.round(st.x - sp.w / 2), Math.round(st.y - sp.h / 2))
    }
    // The catcher.
    const r = this.#round
    const frames = r.facing > 0 ? this.#walkR : this.#walkL
    const sp = r.vx !== 0 ? frames[Math.floor(this.#t * 10) % Math.max(1, frames.length)] ?? this.#idle : this.#idle ?? frames[0] ?? null
    if (sp) ctx.drawImage(sp.canvas, Math.round(r.x - sp.w / 2), Math.round(FIELD.floor - sp.h + 1))
    else {
      ctx.fillStyle = PAL.pink
      ctx.fillRect(Math.round(r.x - 10), FIELD.floor - 18, 20, 18)
    }
    // Sparkles and points.
    for (const b of this.#bursts) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const d = 3 + b.t * 26
        const frame = SPARK[Math.min(SPARK.length - 1, Math.floor(b.t * 5))]!()
        ctx.drawImage(frame.canvas, Math.round(b.x + Math.cos(a) * d - frame.w / 2), Math.round(b.y + Math.sin(a) * d - frame.h / 2))
      }
      drawText(ctx, b.text, Math.round(b.x - textWidth(b.text) / 2), Math.round(b.y - 12 - b.t * 14), b.wish ? PAL.pink : PAL.gold)
    }
    const n = `STAR ${r.caught}`
    drawText(ctx, n, SCREEN.w - 4 - textWidth(n), 5, PAL.white)
  }
}
