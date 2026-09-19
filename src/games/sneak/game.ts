/**
 * 요미의 과자 몰래 먹기 (WORLD 2.1) — the game that replaces
 * 무궁화꽃이 피었습니다, on the pixel screen.
 *
 * A summer night in the woods behind POKO's office. Everyone is at a desk
 * on the grass: RUKI and NUNU in the middle row, MOMO and YOMI at the front,
 * and POKO at the back with its back to them all, under its lamp. YOMI is
 * the one you play. Hold the button and YOMI sneaks a bite of the snack
 * under the desk; let go and YOMI is working, as far as anybody can tell.
 *
 * Every bite crunches (the user's eating sound, louder as the room gets
 * louder), every bite is noise, and POKO is listening. When its head comes
 * up — the "?" — stop. If it turns round (its own sound, the glasses
 * catching the lamp) and YOMI is still chewing, that is a heart gone.
 *
 * The rules are src/games/sneak/round.ts and are tested without a screen.
 * This file only draws them, from the crew's own frames brought down to
 * pixels (src/games/pixel/sprites.ts) and a little pixel art of its own.
 */
import { SneakRound, starsFor, type PokoState } from '@/games/sneak/round'
import { PixelStage, SCREEN } from '@/games/pixel/stage'
import { pixelize, type PixelSprite } from '@/games/pixel/sprites'
import { ALERT, CRUMB, HEART, HEART_EMPTY, LANTERN, PAL, SNACK } from '@/games/pixel/art'
import { drawText, textWidth } from '@/games/pixel/font'
import { EYE_ANCHORS } from '@/games/poko/eyes'
import { spritesFor } from '@/data/sprites'
import { seededRandom } from '@/scenes/npc'
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'

const ROUND = 45

export const SNEAK_GAME: GameDef = {
  // The id stays: the door in the bookcase counts this game's star under it.
  id: 'mugunghwa',
  title: '요미의 과자 몰래 먹기',
  hint: '누르고 있으면 요미가 몰래 과자를 먹어요. 포코가 고개를 들면(?) 바로 손을 떼세요!',
  controls: [
    { keys: 'Space 누르고 있기', touch: '화면 누르고 있기', does: '몰래 먹기 (점수)' },
    { keys: 'Space 떼기', touch: '손 떼기', does: '일하는 척 (안전)' },
  ],
  seconds: ROUND,
  holdKeys: [' ', 'Spacebar', 'ArrowDown', 's', 'S'],
  mount: (host) => new SneakGame(host),
}

type Who = 'poko' | 'yomi' | 'momo' | 'ruki' | 'nunu'

/** Where everyone sits: feet line and centre, in screen pixels, and how tall. */
const SEATS: Readonly<Record<Who, { x: number; y: number; h: number }>> = {
  poko: { x: 121, y: 80, h: 30 },
  ruki: { x: 62, y: 106, h: 26 },
  nunu: { x: 180, y: 106, h: 26 },
  momo: { x: 44, y: 144, h: 32 },
  yomi: { x: 122, y: 150, h: 38 },
}

interface Frames { [pose: string]: PixelSprite[] }

class SneakGame implements GameInstance {
  readonly #host: GameHost
  readonly #stage: PixelStage
  readonly #round: SneakRound
  readonly #frames = new Map<Who, Frames>()
  readonly #hint: HTMLElement
  readonly #toast: HTMLElement
  #running = false
  #holding = false
  #t = 0
  #bite = 0
  #shake = 0
  #flash = 0
  #caughtAt = -99
  #crumbs: { x: number; y: number; vy: number; life: number }[] = []
  #flies: { x: number; y: number; p: number }[] = []
  #ended = false

  constructor(host: GameHost) {
    this.#host = host
    const seed = Number(new URLSearchParams(location.search).get('sneakseed'))
    this.#round = new SneakRound(Number.isFinite(seed) && seed > 0 ? { random: seededRandom(seed) } : {})
    host.root.classList.add('pixel-game', 'sneak')
    this.#stage = new PixelStage({ root: host.root, border: PAL.ink })
    this.#hint = document.createElement('p')
    this.#hint.className = 'pixel-game__pad'
    this.#hint.dataset['sneakPad'] = ''
    this.#hint.innerHTML = host.touch
      ? '<span>누르고 있기 = 몰래 먹기</span>'
      : '<span><kbd>SPACE</kbd> 누르고 있기 = 몰래 먹기</span>'
    host.root.append(this.#hint)
    this.#toast = document.createElement('p')
    this.#toast.className = 'pixel-game__toast'
    this.#toast.hidden = true
    this.#toast.setAttribute('role', 'status')
    host.root.append(this.#toast)
    const r = seededRandom(3)
    for (let i = 0; i < 7; i++) this.#flies.push({ x: r() * SCREEN.w, y: 60 + r() * 70, p: r() * 6 })
    void this.#load()
    this.#draw()
  }

  // ── Loading the cast ────────────────────────────────────────────────────
  async #load(): Promise<void> {
    const want: [Who, string, 'work' | 'idle' | 'look' | 'sit', 'front' | 'back'][] = [
      ['poko', 'work', 'work', 'back'], ['poko', 'notice', 'idle', 'back'],
      ['poko', 'turn', 'look', 'front'], ['poko', 'watch', 'idle', 'front'],
      ['yomi', 'work', 'work', 'front'], ['yomi', 'eat', 'sit', 'front'], ['yomi', 'caught', 'look', 'front'],
      ['momo', 'work', 'work', 'front'], ['ruki', 'work', 'work', 'front'], ['nunu', 'work', 'work', 'front'],
    ]
    await Promise.all(want.map(async ([who, pose, action, dir]) => {
      const set = spritesFor(who)
      const anim = set?.[action]?.[dir]
      if (!anim) return
      const sprites = await Promise.all(anim.frames.slice(0, 4).map((f) => pixelize(f, SEATS[who].h)))
      const got = sprites.filter((s): s is PixelSprite => !!s)
      const all = this.#frames.get(who) ?? {}
      all[pose] = got
      // Remember which frame each came from, for POKO's eyes.
      if (who === 'poko') (all as Record<string, unknown>)[`${pose}:src`] = anim.frames.slice(0, 4)
      this.#frames.set(who, all)
    }))
    this.#draw()
  }

  // ── The round ───────────────────────────────────────────────────────────
  start(): void {
    this.#running = true
  }

  pause(): void {
    this.#running = false
    this.#holding = false
    this.#round.setEating(false)
  }

  resume(): void {
    this.#running = true
  }

  destroy(): void {
    this.#running = false
    this.#stage.destroy()
    this.#hint.remove()
    this.#toast.remove()
  }

  onInput(e: GameInputEvent): void {
    if (e.kind === 'HOLD_START') this.#holding = true
    else if (e.kind === 'HOLD_END') this.#holding = false
  }

  step(dt: number, secondsLeft: number): void {
    if (!this.#running || this.#ended) return
    const s = dt / 1000
    this.#t += s
    this.#round.setEating(this.#holding)
    for (const e of this.#round.step(s)) {
      switch (e.kind) {
        case 'bite': {
          this.#bite = 0.16
          // The crunch is the risk, heard: louder as the room gets louder.
          const loud = 0.16 + (this.#round.noise / 100) * 0.34
          this.#host.sfx(this.#round.bites % 3 === 0 ? 'eat_soft' : 'eat', loud)
          const y = SEATS.yomi
          for (let i = 0; i < 3; i++) this.#crumbs.push({ x: y.x + 4 + (i - 1) * 2, y: y.y - y.h + 16, vy: -12 - i * 6, life: 0.5 })
          break
        }
        case 'notice':
          this.#host.sfx('poko_step', 0.22)
          break
        case 'turn':
          this.#host.sfx('poko_turn', 0.5)
          break
        case 'caught':
          this.#caughtAt = this.#t
          this.#shake = 0.35
          this.#flash = 0.25
          this.#host.sfx('game_fail', 0.24)
          this.#say(this.#round.over ? '들켰다… 오늘은 여기까지' : '들켰다! 요미, 일하는 척!')
          break
        case 'relax':
          this.#toast.hidden = true
          break
        default:
          break
      }
    }
    this.#bite = Math.max(0, this.#bite - s)
    this.#shake = Math.max(0, this.#shake - s)
    this.#flash = Math.max(0, this.#flash - s)
    for (const c of this.#crumbs) {
      c.vy += 90 * s
      c.y += c.vy * s
      c.life -= s
    }
    this.#crumbs = this.#crumbs.filter((c) => c.life > 0)
    this.#host.hud(this.#round.score, secondsLeft)
    this.#hint.dataset['eating'] = String(this.#round.eating)
    // What the round is doing, readable off the page (the tests use it).
    this.#host.root.dataset['poko'] = this.#round.poko
    this.#host.root.dataset['hearts'] = String(this.#round.hearts)
    this.#host.root.dataset['eating'] = String(this.#round.eating)
    this.#host.root.dataset['noise'] = String(Math.round(this.#round.noise))
    this.#draw()
    if (this.#round.over) this.#finish('caught')
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
      detail: reason === 'caught'
        ? `포코에게 ${r.caught}번 들켰다 · 과자 ${r.bites}입`
        : r.caught ? `과자 ${r.bites}입 · ${r.caught}번 들켰지만 끝까지` : `과자 ${r.bites}입, 한 번도 안 들켰다`,
      stars: starsFor(r.score),
      success: reason === 'time',
    })
  }

  #say(text: string): void {
    this.#toast.textContent = text
    this.#toast.hidden = false
  }

  // ── Drawing ─────────────────────────────────────────────────────────────
  #draw(): void {
    const ctx = this.#stage.ctx
    const shakeX = this.#shake > 0 ? Math.round(Math.sin(this.#t * 90) * 2) : 0
    ctx.save()
    ctx.translate(shakeX, 0)
    this.#backdrop(ctx)
    this.#pokoDesk(ctx)
    this.#person(ctx, 'poko')
    for (const who of ['ruki', 'nunu'] as const) {
      this.#person(ctx, who)
      this.#desk(ctx, who)
    }
    for (const who of ['momo', 'yomi'] as const) {
      this.#person(ctx, who)
      this.#desk(ctx, who)
    }
    this.#fireflies(ctx)
    for (const c of this.#crumbs) ctx.drawImage(CRUMB().canvas, Math.round(c.x), Math.round(c.y))
    ctx.restore()
    this.#hud(ctx)
    if (this.#flash > 0) {
      ctx.fillStyle = `rgba(224,88,74,${(this.#flash / 0.25) * 0.35})`
      ctx.fillRect(0, 0, SCREEN.w, SCREEN.h)
    }
  }

  #backdrop(ctx: CanvasRenderingContext2D): void {
    // Sky in three bands, the moon, a few stars.
    ctx.fillStyle = PAL.night
    ctx.fillRect(-4, 0, SCREEN.w + 8, 24)
    ctx.fillStyle = PAL.night2
    ctx.fillRect(-4, 24, SCREEN.w + 8, 22)
    ctx.fillStyle = PAL.night3
    ctx.fillRect(-4, 46, SCREEN.w + 8, 20)
    const tw = Math.floor(this.#t * 2)
    for (const [x, y, k] of [[14, 8, 0], [52, 15, 1], [88, 5, 2], [150, 12, 0], [176, 30, 1], [230, 6, 2], [34, 33, 1], [118, 26, 0]] as const) {
      ctx.fillStyle = (tw + k) % 3 === 0 ? PAL.white : PAL.star
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.fillStyle = PAL.moon
    ctx.fillRect(22, 34, 8, 8)
    ctx.fillRect(20, 36, 12, 4)
    ctx.fillRect(24, 32, 4, 12)
    ctx.fillStyle = PAL.star
    ctx.fillRect(25, 37, 2, 2)
    // The woods: two ranks of rounded treetops.
    for (let x = -8; x < SCREEN.w + 8; x += 14) {
      const h = 10 + ((x * 7) % 9)
      ctx.fillStyle = PAL.leaf
      ctx.fillRect(x, 58 - h, 16, h + 12)
      ctx.fillRect(x + 3, 55 - h, 10, 3)
    }
    for (let x = -4; x < SCREEN.w + 8; x += 11) {
      const h = 6 + ((x * 5) % 7)
      ctx.fillStyle = PAL.grass
      ctx.fillRect(x, 66 - h, 13, h + 4)
    }
    // The grass the desks stand on, with a few lighter tufts.
    ctx.fillStyle = PAL.grass
    ctx.fillRect(-4, 66, SCREEN.w + 8, SCREEN.h - 66)
    ctx.fillStyle = PAL.grass2
    for (let y = 74; y < SCREEN.h; y += 11) {
      for (let x = ((y * 3) % 7) - 4; x < SCREEN.w + 4; x += 7) ctx.fillRect(x, y, 4, 1)
    }
    ctx.fillStyle = PAL.grass3
    for (let i = 0; i < 40; i++) {
      const x = (i * 53) % SCREEN.w
      const y = 70 + ((i * 29) % 88)
      ctx.fillRect(x, y, 1, 2)
      ctx.fillRect(x + 2, y + 1, 1, 1)
    }
    // A string of lanterns across the top, and their light.
    ctx.fillStyle = PAL.ink
    for (let x = 0; x < SCREEN.w; x++) {
      const sag = Math.round(20 + Math.sin((x / SCREEN.w) * Math.PI) * 8)
      ctx.fillRect(x, sag, 1, 1)
    }
    for (const x of [30, 84, 158, 212]) {
      const sag = Math.round(20 + Math.sin((x / SCREEN.w) * Math.PI) * 8)
      ctx.drawImage(LANTERN().canvas, x - 2, sag + 1)
    }
  }

  #pokoDesk(ctx: CanvasRenderingContext2D): void {
    // The lamp's pool of light on the grass behind POKO.
    ctx.fillStyle = 'rgba(255,207,107,.16)'
    ctx.fillRect(92, 60, 58, 24)
    ctx.fillRect(100, 56, 42, 32)
    // POKO's desk, beyond POKO: it faces the desk, with its back to the
    // others, so what shows is the desk's top edge past its shoulders.
    const s = SEATS.poko
    ctx.fillStyle = PAL.wood2
    ctx.fillRect(s.x - 24, s.y - 20, 3, 14)
    ctx.fillRect(s.x + 21, s.y - 20, 3, 14)
    ctx.fillStyle = PAL.wood
    ctx.fillRect(s.x - 26, s.y - 24, 52, 5)
    ctx.fillStyle = PAL.wood3
    ctx.fillRect(s.x - 26, s.y - 24, 52, 1)
    ctx.fillStyle = PAL.paper
    ctx.fillRect(s.x - 16, s.y - 26, 9, 2)
    ctx.fillRect(s.x + 6, s.y - 25, 6, 1)
    // POKO's lamp, on the desk.
    ctx.fillStyle = PAL.ink
    ctx.fillRect(s.x + 19, s.y - 34, 1, 10)
    ctx.fillStyle = PAL.lamp
    ctx.fillRect(s.x + 16, s.y - 36, 7, 3)
    // And its stool.
    ctx.fillStyle = PAL.wood2
    ctx.fillRect(s.x - 7, s.y - 3, 14, 2)
    ctx.fillRect(s.x - 6, s.y - 1, 2, 2)
    ctx.fillRect(s.x + 4, s.y - 1, 2, 2)
  }

  #desk(ctx: CanvasRenderingContext2D, who: Who): void {
    const s = SEATS[who]
    const w = Math.round(s.h * 1.25)
    const top = s.y - Math.round(s.h * 0.38)
    ctx.fillStyle = PAL.wood3
    ctx.fillRect(s.x - w / 2, top, w, 2)
    ctx.fillStyle = PAL.wood
    ctx.fillRect(s.x - w / 2, top + 2, w, Math.round(s.h * 0.38) - 2)
    ctx.fillStyle = PAL.wood2
    ctx.fillRect(s.x - w / 2, top + 2, w, 1)
    ctx.fillRect(s.x - w / 2 + 2, s.y - 2, w - 4, 2)
    // Something to work on: papers on every desk but POKO's.
    ctx.fillStyle = PAL.paper
    ctx.fillRect(s.x - 5, top - 1, 7, 2)
  }

  #person(ctx: CanvasRenderingContext2D, who: Who): void {
    const f = this.#frames.get(who)
    if (!f) return
    const s = SEATS[who]
    const r = this.#round
    const watching = r.poko === 'WATCH' || r.poko === 'TURN'
    const hush = watching || r.stunned
    let pose = 'work'
    let lift = 0
    if (who === 'poko') {
      pose = POKO_POSE[r.poko]
      if (r.poko === 'NOTICE') lift = 2
    } else if (who === 'yomi') {
      if (this.#t - this.#caughtAt < 1.2) {
        pose = 'caught'
        lift = this.#t - this.#caughtAt < 0.3 ? 4 : 1
      } else if (r.eating) {
        pose = 'eat'
        lift = this.#bite > 0.08 ? 1 : 0
      }
    } else if (hush) {
      // Everyone else goes very still, and very busy.
      lift = 1
    }
    const list = f[pose] ?? f['work'] ?? []
    if (!list.length) return
    const speed = who === 'poko' && r.poko === 'WORK' ? 5 : 4
    const i = hush && who !== 'poko' ? 0 : Math.floor(this.#t * speed + SEAT_PHASE[who]) % list.length
    const sp = list[i]!
    const x = Math.round(s.x - sp.w / 2)
    const y = Math.round(s.y - sp.h - lift)
    ctx.drawImage(sp.canvas, x, y)
    if (who === 'poko') this.#pokoFace(ctx, pose, i, sp, x, y)
    if (who === 'yomi' && pose === 'eat') {
      // The bag, held up to the mouth under the desk's edge.
      const bag = SNACK()
      ctx.drawImage(bag.canvas, Math.round(s.x + 3), Math.round(s.y - s.h * 0.62 - (this.#bite > 0.08 ? 2 : 0)))
    }
    if (who === 'yomi' && r.multiplier > 1 && r.eating) {
      const tag = `X${r.multiplier}`
      drawText(ctx, tag, Math.round(s.x + 12), Math.round(s.y - s.h - 4), PAL.gold)
    }
    if (who === 'yomi' && pose === 'caught') {
      // A bead of sweat.
      ctx.fillStyle = PAL.ghost
      ctx.fillRect(x - 2, y + 6, 2, 3)
      ctx.fillRect(x - 1, y + 5, 1, 1)
    }
  }

  /** POKO's glasses, the same pair as the garage's, and its "?" and "!". */
  #pokoFace(ctx: CanvasRenderingContext2D, pose: string, i: number, sp: PixelSprite, x: number, y: number): void {
    const r = this.#round
    const f = this.#frames.get('poko') as Record<string, unknown> | undefined
    const srcs = f?.[`${pose}:src`] as readonly string[] | undefined
    const anchor = srcs ? EYE_ANCHORS[srcs[i] ?? ''] : undefined
    if (anchor && sp.map && (pose === 'watch' || pose === 'turn')) {
      const m = sp.map
      const at = (v: number, o: number): number => Math.round(m.pad + (v - o) * m.k)
      const lx = x + at(anchor[0], m.sx)
      const rx = x + at(anchor[1], m.sx)
      const ey = y + at(anchor[2], m.sy)
      ctx.fillStyle = '#3a2a1e'
      for (const cx of [lx, rx]) {
        ctx.fillRect(cx - 1, ey - 2, 3, 1)
        ctx.fillRect(cx - 1, ey + 2, 3, 1)
        ctx.fillRect(cx - 2, ey - 1, 1, 3)
        ctx.fillRect(cx + 2, ey - 1, 1, 3)
      }
      ctx.fillRect(lx + 3, ey - 1, Math.max(1, rx - lx - 5), 1)
      // The lamp catching a lens as it watches.
      if (pose === 'watch' && Math.floor(this.#t * 3) % 4 === 0) {
        ctx.fillStyle = PAL.white
        ctx.fillRect(lx, ey - 1, 1, 1)
      }
    }
    if (r.poko === 'NOTICE') {
      drawText(ctx, '?', x + sp.w / 2 - 1, y - 8, PAL.lamp)
    } else if (r.stunned || (r.poko === 'WATCH' && this.#t - this.#caughtAt < 1.5)) {
      ctx.drawImage(ALERT().canvas, Math.round(x + sp.w / 2 - 2), y - 10)
    }
  }

  #fireflies(ctx: CanvasRenderingContext2D): void {
    for (const f of this.#flies) {
      const x = (f.x + Math.sin(this.#t * 0.7 + f.p) * 10 + SCREEN.w) % SCREEN.w
      const y = f.y + Math.cos(this.#t * 0.9 + f.p) * 5
      if (Math.floor(this.#t * 2 + f.p) % 3 === 0) continue
      ctx.fillStyle = PAL.lamp
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
    }
  }

  #hud(ctx: CanvasRenderingContext2D): void {
    const r = this.#round
    // Hearts, top left.
    for (let i = 0; i < 3; i++) {
      ctx.drawImage((i < r.hearts ? HEART() : HEART_EMPTY()).canvas, 4 + i * 9, 4)
    }
    // The noise meter, top right: ten segments, green to red.
    const x0 = SCREEN.w - 4 - 10 * 5
    drawText(ctx, 'SOUND', x0 - textWidth('SOUND') - 4, 5, PAL.white)
    const lit = Math.round(r.noise / 10)
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = PAL.ink
      ctx.fillRect(x0 + i * 5 - 1, 3, 5, 9)
      ctx.fillStyle = i < lit ? (i < 5 ? PAL.grass3 : i < 7 ? PAL.gold : PAL.red) : PAL.night2
      ctx.fillRect(x0 + i * 5, 4, 3, 7)
    }
  }
}

const POKO_POSE: Readonly<Record<PokoState, string>> = {
  WORK: 'work',
  NOTICE: 'notice',
  TURN: 'turn',
  WATCH: 'watch',
  RECOVER: 'turn',
}

const SEAT_PHASE: Readonly<Record<Who, number>> = { poko: 0, yomi: 1.3, momo: 2.1, ruki: 0.6, nunu: 3.2 }
