/**
 * 모모의 택배 배달 (WORLD 2.1) — the game that replaces 택배 정리, on the
 * pixel screen.
 *
 * Stage 1: the dokkaebi village at night. MOMO runs and jumps; the parcel
 * rides on MOMO's head; the ghosts drift; a delivery bursts into sparks and
 * the next door lights up. The rules are src/games/delivery/round.ts and are
 * tested without a screen; this file draws them, from MOMO's own walking
 * frames and the garage's own parcel brought down to pixels, and a village
 * drawn in code.
 */
import { DeliveryRound, DEPOT, DOORS, GROUND, LEDGES, starsFor } from '@/games/delivery/round'
import { footfalls } from '@/games/delivery/steps'
import { PixelStage, SCREEN } from '@/games/pixel/stage'
import { mirrored, pixelize, type PixelSprite } from '@/games/pixel/sprites'
import { GHOST, GHOST_B, HEART, HEART_EMPTY, LANTERN, PAL, SPARK } from '@/games/pixel/art'
import { drawText, textWidth } from '@/games/pixel/font'
import { spritesFor } from '@/data/sprites'
import { seededRandom } from '@/scenes/npc'
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'

const ROUND = 60
const PARCEL = '/assets/images/garage/prop_parcel_closed.webp'

export const DELIVERY_GAME: GameDef = {
  // The id stays: the door in the bookcase counts this game's star under it.
  id: 'parcel',
  title: '모모의 택배 배달',
  hint: '모모가 택배를 들고 불 켜진 문까지! 도깨비불 유령에 닿으면 택배를 놓쳐요.',
  controls: [
    { keys: '← →', touch: '◀ ▶', does: '걷기' },
    { keys: 'Space / ↑', touch: 'JUMP', does: '점프' },
  ],
  seconds: ROUND,
  holdKeys: [],
  controlKeys: {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ' ': 'jump', Spacebar: 'jump', ArrowUp: 'jump', w: 'jump', W: 'jump', z: 'jump', Z: 'jump',
  },
  mount: (host) => new DeliveryGame(host),
}

interface Burst { x: number; y: number; t: number; text: string }

class DeliveryGame implements GameInstance {
  readonly #host: GameHost
  readonly #stage: PixelStage
  readonly #round: DeliveryRound
  readonly #pad: HTMLElement
  readonly #toast: HTMLElement
  #walkR: PixelSprite[] = []
  #walkL: PixelSprite[] = []
  #idle: PixelSprite | null = null
  #parcel: PixelSprite | null = null
  #running = false
  #ended = false
  #t = 0
  #walkT = 0
  /** How many feet have come down: which of the three steps is next, and which foot. */
  #foot = 0
  #bursts: Burst[] = []
  #flash = 0

  constructor(host: GameHost) {
    this.#host = host
    const seed = Number(new URLSearchParams(location.search).get('parcelseed'))
    this.#round = new DeliveryRound(Number.isFinite(seed) && seed > 0 ? { random: seededRandom(seed) } : {})
    host.root.classList.add('pixel-game', 'delivery')
    this.#stage = new PixelStage({ root: host.root, border: PAL.ink })
    this.#pad = document.createElement('div')
    this.#pad.className = 'pixel-game__pad pixel-game__pad--controls'
    this.#pad.innerHTML = host.touch
      ? `<span class="pixel-pad__dir">
           <button type="button" class="pixel-pad__btn" data-control="left" aria-label="왼쪽">◀</button>
           <button type="button" class="pixel-pad__btn" data-control="right" aria-label="오른쪽">▶</button>
         </span>
         <button type="button" class="pixel-pad__btn pixel-pad__btn--jump" data-control="jump" aria-label="점프">JUMP</button>`
      : '<span><kbd>←</kbd><kbd>→</kbd> 걷기 · <kbd>SPACE</kbd> 점프</span>'
    host.root.append(this.#pad)
    this.#toast = document.createElement('p')
    this.#toast.className = 'pixel-game__toast'
    this.#toast.hidden = true
    this.#toast.setAttribute('role', 'status')
    host.root.append(this.#toast)
    void this.#load()
    this.#draw()
  }

  async #load(): Promise<void> {
    const set = spritesFor('momo')
    const right = set?.walk.right.frames.slice(0, 4) ?? []
    const [walk, idle, parcel] = await Promise.all([
      Promise.all(right.map((f) => pixelize(f, 20))),
      set ? pixelize(set.idle.front.frames[0]!, 20) : Promise.resolve(null),
      pixelize(PARCEL, 9, { levels: 5 }),
    ])
    this.#walkR = walk.filter((s): s is PixelSprite => !!s)
    this.#walkL = this.#walkR.map(mirrored)
    this.#idle = idle
    this.#parcel = parcel
    this.#draw()
  }

  start(): void {
    this.#running = true
  }

  pause(): void {
    this.#running = false
    for (const c of ['left', 'right', 'jump']) this.#round.control(c, false)
  }

  resume(): void {
    this.#running = true
  }

  destroy(): void {
    this.#running = false
    this.#stage.destroy()
    this.#pad.remove()
    this.#toast.remove()
  }

  onInput(e: GameInputEvent): void {
    if ((e.kind === 'PRESS' || e.kind === 'RELEASE') && e.control) this.#round.control(e.control, e.kind === 'PRESS')
  }

  step(dt: number, secondsLeft: number): void {
    if (!this.#running || this.#ended) return
    const s = Math.min(dt, 50) / 1000
    this.#t += s
    const r = this.#round
    for (const e of r.step(s)) {
      switch (e.kind) {
        case 'jump':
          // Once per jump: the round raises this only on the frame MOMO
          // leaves the ground, however long the key is held.
          this.#host.sfx('momo_jump', 0.26)
          break
        case 'pickup':
          // No sound of its own yet: the three-second page-rustle that used
          // to play here (`paper`) went on over the whole run to the door,
          // and was heard as pages turning while MOMO ran (WORLD 2.4).
          break
        case 'deliver': {
          // The door that was waiting: it opens, and the parcel is in.
          const d = DOORS[r.target === 0 ? 1 : 0]!
          this.#host.sfx('door_open', 0.26)
          this.#bursts.push({ x: d.x + d.w / 2, y: d.y + 4, t: 0, text: `+${100 + (r.streak - 1) * 25}` })
          this.#toast.hidden = true
          break
        }
        case 'ghost':
          this.#say('도깨비불이 하나 더 나왔다')
          break
        case 'hit':
          this.#flash = 0.25
          this.#host.sfx('game_fail', 0.2)
          this.#say(r.over ? '택배는 내일…' : '앗! 택배를 떨어뜨렸다')
          break
        default:
          break
      }
    }
    if (r.vx !== 0 && r.grounded) {
      // Running, on the ground: a footfall each time a foot comes down in
      // the walk cycle — never in the air, never standing still.
      const was = this.#walkT
      this.#walkT += s
      if (footfalls(was, this.#walkT) > 0) {
        // The three steps of the studio's walking clip, in turn, so no two
        // footfalls in a row are the same sound; left and right a touch
        // apart in level. Under the music, well under the jump.
        this.#foot += 1
        this.#host.sfx(`run_${(this.#foot % 3) + 1}`, this.#foot % 2 ? 0.14 : 0.12)
      }
    }
    for (const b of this.#bursts) b.t += s
    this.#bursts = this.#bursts.filter((b) => b.t < 1.1)
    this.#flash = Math.max(0, this.#flash - s)
    this.#host.hud(r.score, secondsLeft)
    this.#host.root.dataset['x'] = String(Math.round(r.x))
    this.#host.root.dataset['y'] = String(Math.round(r.y))
    this.#host.root.dataset['carrying'] = String(r.carrying)
    this.#host.root.dataset['air'] = String(!r.grounded)
    this.#host.root.dataset['lives'] = String(r.lives)
    this.#host.root.dataset['delivered'] = String(r.delivered)
    this.#draw()
    if (r.over) this.#finish('caught')
    else if (secondsLeft <= 0) this.#finish('time')
  }

  #finish(reason: 'time' | 'caught'): void {
    if (this.#ended) return
    this.#ended = true
    this.#running = false
    const r = this.#round
    this.#host.end({
      score: r.score,
      reason,
      detail: reason === 'caught' ? `유령에게 세 번 · 택배 ${r.delivered}개 배달` : `택배 ${r.delivered}개 배달`,
      stars: starsFor(r.score),
      success: reason === 'time',
    })
  }

  #say(text: string): void {
    this.#toast.textContent = text
    this.#toast.hidden = false
    window.setTimeout(() => { if (this.#toast.textContent === text) this.#toast.hidden = true }, 1400)
  }

  // ── Drawing ─────────────────────────────────────────────────────────────
  #draw(): void {
    const ctx = this.#stage.ctx
    this.#village(ctx)
    this.#ledges(ctx)
    this.#depot(ctx)
    this.#doors(ctx)
    this.#ghosts(ctx)
    this.#momo(ctx)
    this.#effects(ctx)
    this.#hud(ctx)
    if (this.#flash > 0) {
      ctx.fillStyle = `rgba(224,88,74,${(this.#flash / 0.25) * 0.35})`
      ctx.fillRect(0, 0, SCREEN.w, SCREEN.h)
    }
  }

  #village(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PAL.night
    ctx.fillRect(0, 0, SCREEN.w, 40)
    ctx.fillStyle = PAL.night2
    ctx.fillRect(0, 40, SCREEN.w, 40)
    ctx.fillStyle = PAL.night3
    ctx.fillRect(0, 80, SCREEN.w, GROUND - 80)
    const tw = Math.floor(this.#t * 2)
    for (const [x, y, k] of [[10, 12, 0], [44, 6, 1], [70, 20, 2], [112, 8, 0], [140, 18, 1], [188, 10, 2], [226, 22, 0], [96, 30, 1]] as const) {
      ctx.fillStyle = (tw + k) % 3 === 0 ? PAL.white : PAL.star
      ctx.fillRect(x, y, 1, 1)
    }
    // The moon, over the village.
    ctx.fillStyle = PAL.moon
    ctx.fillRect(120, 14, 10, 10)
    ctx.fillRect(118, 16, 14, 6)
    ctx.fillRect(122, 12, 6, 14)
    // The village beyond: a row of small hanok, each a wall, a curled eave
    // and a lit window or two, standing on the far lane.
    for (const [x, w] of [[-4, 40], [44, 34], [86, 44], [138, 36], [182, 58]] as const) {
      const top = 104
      ctx.fillStyle = PAL.night2
      ctx.fillRect(x + 3, top, w - 6, GROUND - top)
      ctx.fillStyle = PAL.ink
      ctx.fillRect(x, top - 2, w, 3)
      ctx.fillRect(x + 4, top - 6, w - 8, 4)
      ctx.fillRect(x - 2, top - 4, 3, 2)
      ctx.fillRect(x + w - 1, top - 4, 3, 2)
      ctx.fillStyle = PAL.lamp
      ctx.fillRect(x + 8, top + 8, 4, 4)
      if (w > 38) ctx.fillRect(x + w - 14, top + 8, 4, 4)
      ctx.fillStyle = PAL.wood2
      ctx.fillRect(x + Math.round(w / 2) - 2, GROUND - 9, 5, 9)
    }
    // The ground: packed earth, grass on top.
    ctx.fillStyle = PAL.dirt
    ctx.fillRect(0, GROUND, SCREEN.w, SCREEN.h - GROUND)
    ctx.fillStyle = PAL.dirt2
    for (let x = 3; x < SCREEN.w; x += 9) ctx.fillRect(x, GROUND + 6 + (x % 3), 3, 1)
    ctx.fillStyle = PAL.grass2
    ctx.fillRect(0, GROUND, SCREEN.w, 3)
    ctx.fillStyle = PAL.grass3
    for (let x = 1; x < SCREEN.w; x += 5) ctx.fillRect(x, GROUND - 1, 1, 1)
    // Lanterns on the eaves of the houses.
    for (const x of [62, 160]) ctx.drawImage(LANTERN().canvas, x, 97)
  }

  #ledges(ctx: CanvasRenderingContext2D): void {
    for (const l of LEDGES) {
      const w = l.x1 - l.x0
      // Roof-tile ledges: a dark eave, rows of tiles, a warm board under.
      ctx.fillStyle = PAL.ink
      ctx.fillRect(l.x0 - 2, l.y, w + 4, 6)
      ctx.fillStyle = PAL.stone2
      ctx.fillRect(l.x0, l.y, w, 4)
      ctx.fillStyle = PAL.stone
      for (let x = l.x0; x < l.x1; x += 4) ctx.fillRect(x, l.y, 3, 2)
      ctx.fillStyle = PAL.wood2
      ctx.fillRect(l.x0 + 2, l.y + 4, w - 4, 2)
      // The curl of the eave at each end.
      ctx.fillStyle = PAL.ink
      ctx.fillRect(l.x0 - 3, l.y - 1, 2, 2)
      ctx.fillRect(l.x1 + 1, l.y - 1, 2, 2)
    }
  }

  #depot(ctx: CanvasRenderingContext2D): void {
    const p = this.#parcel
    if (!p) return
    // The pile by the gate: three, or two while MOMO has one.
    const n = this.#round.carrying ? 2 : 3
    const spots = [[DEPOT.x + 2, GROUND - p.h], [DEPOT.x + 10, GROUND - p.h], [DEPOT.x + 6, GROUND - p.h * 2 + 2]] as const
    for (let i = 0; i < n; i++) ctx.drawImage(p.canvas, spots[i]![0], spots[i]![1])
  }

  #doors(ctx: CanvasRenderingContext2D): void {
    const r = this.#round
    DOORS.forEach((d, i) => {
      const waiting = i === r.target
      // The frame and the door.
      ctx.fillStyle = PAL.ink
      ctx.fillRect(d.x - 1, d.y - 1, d.w + 2, d.h + 1)
      ctx.fillStyle = d.id === 'office' ? PAL.wood : PAL.red2
      ctx.fillRect(d.x, d.y, d.w, d.h)
      ctx.fillStyle = d.id === 'office' ? PAL.wood3 : PAL.red
      ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4)
      ctx.fillStyle = PAL.gold
      ctx.fillRect(d.x + d.w - 4, d.y + d.h / 2, 2, 2)
      // A sign over it: a parcel for the office, a roof for the house.
      if (this.#parcel && d.id === 'office') ctx.drawImage(this.#parcel.canvas, d.x + 2, d.y - 11)
      if (d.id === 'house') {
        ctx.fillStyle = PAL.ink
        ctx.fillRect(d.x - 4, d.y - 4, d.w + 8, 3)
        ctx.fillRect(d.x - 6, d.y - 6, 3, 2)
        ctx.fillRect(d.x + d.w + 3, d.y - 6, 3, 2)
      }
      if (waiting) {
        // Its light is on, and an arrow says so.
        ctx.fillStyle = 'rgba(255,207,107,.28)'
        ctx.fillRect(d.x - 4, d.y - 2, d.w + 8, d.h + 2)
        const bob = Math.round(Math.sin(this.#t * 6) * 2)
        const ax = d.x + d.w / 2
        const ay = d.y - 18 + bob
        ctx.fillStyle = PAL.ink
        ctx.fillRect(ax - 4, ay - 1, 9, 5)
        ctx.fillStyle = PAL.gold
        ctx.fillRect(ax - 3, ay, 7, 1)
        ctx.fillRect(ax - 2, ay + 1, 5, 1)
        ctx.fillRect(ax - 1, ay + 2, 3, 1)
        ctx.fillRect(ax, ay + 3, 1, 1)
      }
    })
  }

  #ghosts(ctx: CanvasRenderingContext2D): void {
    for (const g of this.#round.ghosts) {
      const sp = (Math.floor(g.phase * 4) % 2 ? GHOST_B : GHOST)()
      ctx.globalAlpha = 0.92
      ctx.drawImage(sp.canvas, Math.round(g.x - sp.w / 2), Math.round(g.y - sp.h + 1))
      ctx.globalAlpha = 1
    }
  }

  #momo(ctx: CanvasRenderingContext2D): void {
    const r = this.#round
    if (r.safe > 0 && Math.floor(r.safe * 12) % 2 === 0) return
    const moving = r.vx !== 0
    const frames = r.facing > 0 ? this.#walkR : this.#walkL
    let sp: PixelSprite | null = null
    if (!r.grounded) sp = frames[1] ?? null
    else if (moving) sp = frames[Math.floor(this.#walkT * 10) % Math.max(1, frames.length)] ?? null
    else sp = this.#idle ?? frames[0] ?? null
    if (!sp) return
    const x = Math.round(r.x - sp.w / 2)
    const y = Math.round(r.y - sp.h + 1)
    ctx.drawImage(sp.canvas, x, y)
    if (r.carrying && this.#parcel) {
      const bob = moving && r.grounded ? Math.floor(this.#walkT * 10) % 2 : 0
      ctx.drawImage(this.#parcel.canvas, Math.round(r.x - this.#parcel.w / 2), y - this.#parcel.h + 3 + bob)
    }
  }

  #effects(ctx: CanvasRenderingContext2D): void {
    for (const b of this.#bursts) {
      // Sparks outward from the door, then the score rising.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const d = 4 + b.t * 34
        const frame = SPARK[Math.min(SPARK.length - 1, Math.floor(b.t * 5))]!()
        ctx.drawImage(frame.canvas, Math.round(b.x + Math.cos(a) * d - frame.w / 2), Math.round(b.y + Math.sin(a) * d - frame.h / 2))
      }
      drawText(ctx, b.text, Math.round(b.x - textWidth(b.text) / 2), Math.round(b.y - 12 - b.t * 16), PAL.gold)
    }
  }

  #hud(ctx: CanvasRenderingContext2D): void {
    const r = this.#round
    for (let i = 0; i < 3; i++) ctx.drawImage((i < r.lives ? HEART() : HEART_EMPTY()).canvas, 4 + i * 9, 4)
    const n = `BOX ${r.delivered}`
    drawText(ctx, n, SCREEN.w - 4 - textWidth(n), 5, PAL.white)
    if (r.streak > 1) {
      const t = `STREAK X${r.streak}`
      drawText(ctx, t, SCREEN.w - 4 - textWidth(t), 13, PAL.gold)
    }
  }
}
