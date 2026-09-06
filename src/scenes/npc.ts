/**
 * DOKKA CREW as residents.
 *
 * Each one lives at a world position and picks its own errands: choose a spot
 * it likes, walk there, look around, rest, choose again. Personality is in the
 * numbers — Nunu sleeps, Ruki covers ground, Poko stays at the desk — so you can
 * tell them apart by watching rather than reading.
 *
 * They walk on the floor band and route around furniture instead of through it.
 * Depth comes from the y they stand at, so someone in front of the desk covers
 * it and someone behind does not.
 */
import { CHARACTERS } from '@/data/characters'
import type { CharacterConfig } from '@/types/character'
import type { WorldLayout, WorldRect, ZoneId } from '@/types/world'

export type NpcState = 'idle' | 'walk' | 'look' | 'rest' | 'interact'
export type Facing = 'front' | 'side' | 'back'

export interface Npc {
  readonly config: CharacterConfig
  readonly el: HTMLElement
  readonly img: HTMLImageElement
  readonly bubble: HTMLElement
  x: number
  y: number
  state: NpcState
  facing: Facing
  flip: boolean
  until: number
  targetX: number
  targetY: number
  /** Bounce phase, so they do not all bob in step. */
  phase: number
  reactUntil: number
}

const REACTIONS: Record<string, string> = {
  question: '?',
  exclaim: '!',
  ellipsis: '…',
  heart: '♥',
  note: '♪',
  sleep: 'z',
  spark: '✦',
  sweat: '•',
  anger: '✖',
}

const hits = (r: WorldRect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

export class Crew {
  readonly npcs: Npc[] = []
  private blocks: WorldRect[] = []
  private world!: WorldLayout

  constructor(
    private readonly layer: HTMLElement,
    private readonly onClick: (npc: Npc) => void,
  ) {}

  build(world: WorldLayout): void {
    this.world = world
    this.blocks = world.zones.flatMap((z) => (z.blocks ? [z.blocks] : []))
    this.layer.textContent = ''
    this.npcs.length = 0

    for (const config of CHARACTERS) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'npc'
      el.style.setProperty('--accent', config.accent)
      el.setAttribute('aria-label', `${config.name} — ${config.trait}`)

      const img = document.createElement('img')
      img.className = 'npc__art'
      img.src = config.art.front
      img.alt = ''
      img.decoding = 'async'
      // Always on screen: lazy would leave the button zero-wide, and with it no
      // hit area, until the image happened to arrive.
      img.loading = 'eager'
      el.append(img)

      const bubble = document.createElement('span')
      bubble.className = 'npc__bubble'
      bubble.setAttribute('aria-hidden', 'true')
      el.append(bubble)

      const home = this.spotIn(this.pickZone(config), config)
      const npc: Npc = {
        config,
        el,
        img,
        bubble,
        x: home.x,
        y: home.y,
        state: 'idle',
        facing: 'front',
        flip: false,
        until: 600 + Math.random() * 2400,
        targetX: home.x,
        targetY: home.y,
        phase: Math.random() * 6.28,
        reactUntil: 0,
      }
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        this.react(npc)
        this.onClick(npc)
      })
      this.layer.append(el)
      this.npcs.push(npc)
    }
  }

  /** A short wordless reaction, readable without translation. */
  react(npc: Npc): void {
    const pool = npc.config.clickReactions
    const key = pool[Math.floor(Math.random() * pool.length)] ?? 'question'
    npc.bubble.textContent = REACTIONS[key] ?? '?'
    npc.el.classList.add('is-reacting')
    npc.reactUntil = performance.now() + 1400
    npc.state = 'look'
    npc.facing = 'front'
    npc.until = 900
  }

  update(dt: number, now: number): void {
    for (const npc of this.npcs) {
      if (npc.reactUntil && now > npc.reactUntil) {
        npc.el.classList.remove('is-reacting')
        npc.reactUntil = 0
      }
      npc.until -= dt
      if (npc.state === 'walk') this.step(npc, dt)
      if (npc.until <= 0) this.choose(npc)
      npc.phase += dt / (npc.state === 'walk' ? 130 : 620)
    }
  }

  /** Place everyone on screen. Called after the camera settles. */
  render(viewX: number, viewY: number, scale: number): void {
    for (const npc of this.npcs) {
      const bob = npc.state === 'walk' ? Math.abs(Math.sin(npc.phase)) * 5 : Math.sin(npc.phase) * 2
      const sx = (npc.x - viewX) * scale
      const sy = (npc.y - viewY) * scale
      npc.el.style.transform = `translate3d(${sx}px, ${sy - bob}px, 0) translate(-50%, -100%)${npc.flip ? ' scaleX(-1)' : ''}`
      // Depth by where the feet are: further down the room means nearer. Capped
      // so a character deep in a tall world can never climb over the interface.
      npc.el.style.zIndex = String(Math.min(699, 200 + Math.round(npc.y / 8)))
      npc.el.style.setProperty('--npc-scale', String(scale))
    }
  }

  private choose(npc: Npc): void {
    const c = npc.config
    const r = Math.random()
    if (r < c.idleBias) {
      npc.state = Math.random() < 0.4 ? 'rest' : 'idle'
      npc.facing = 'front'
      npc.until = 1800 + Math.random() * 4200
    } else if (r < c.idleBias + 0.18) {
      npc.state = 'look'
      npc.facing = Math.random() < 0.5 ? 'side' : 'back'
      npc.flip = Math.random() < 0.5
      npc.until = 900 + Math.random() * 1600
    } else {
      const spot = this.spotIn(this.pickZone(c), c)
      npc.targetX = spot.x
      npc.targetY = spot.y
      npc.state = 'walk'
      npc.until = 9000
    }
    npc.img.src = c.art[npc.facing]
  }

  private step(npc: Npc, dt: number): void {
    const dx = npc.targetX - npc.x
    const dy = npc.targetY - npc.y
    const dist = Math.hypot(dx, dy)
    if (dist < 6) {
      npc.state = 'idle'
      npc.facing = 'front'
      npc.img.src = npc.config.art.front
      npc.until = 1200 + Math.random() * 2600
      return
    }
    const step = (npc.config.speed * dt) / 1000
    let nx = npc.x + (dx / dist) * step
    let ny = npc.y + (dy / dist) * step
    // Walk around furniture rather than through it: try sliding on one axis.
    if (this.blocked(nx, ny)) {
      if (!this.blocked(npc.x, ny)) nx = npc.x
      else if (!this.blocked(nx, npc.y)) ny = npc.y
      else {
        npc.until = 0 // boxed in; pick somewhere else
        return
      }
    }
    npc.x = nx
    npc.y = ny
    const wantFacing: Facing = Math.abs(dx) > Math.abs(dy) ? 'side' : dy > 0 ? 'front' : 'back'
    if (wantFacing !== npc.facing) {
      npc.facing = wantFacing
      npc.img.src = npc.config.art[wantFacing]
    }
    if (wantFacing === 'side') npc.flip = dx < 0
  }

  private blocked(x: number, y: number): boolean {
    if (y < this.world.floor.top || y > this.world.floor.bottom) return true
    if (x < 40 || x > this.world.width - 40) return true
    return this.blocks.some((b) => hits(b, x, y))
  }

  private pickZone(c: CharacterConfig): ZoneId {
    const wanted = c.preferredZones
      .map((z) => this.world.zones.find((wz) => wz.id === (z as ZoneId)))
      .filter((z): z is NonNullable<typeof z> => Boolean(z))
    const pool = wanted.length && Math.random() < 0.7 ? wanted : this.world.zones
    return (pool[Math.floor(Math.random() * pool.length)] ?? this.world.zones[0]!).id
  }

  private spotIn(zoneId: ZoneId, _c: CharacterConfig): { x: number; y: number } {
    const zone = this.world.zones.find((z) => z.id === zoneId) ?? this.world.zones[0]!
    for (let i = 0; i < 24; i++) {
      const x = zone.rect.x + Math.random() * zone.rect.w
      const y = Math.max(
        this.world.floor.top,
        Math.min(this.world.floor.bottom, zone.rect.y + Math.random() * zone.rect.h),
      )
      if (!this.blocked(x, y)) return { x, y }
    }
    const mid = (this.world.floor.top + this.world.floor.bottom) / 2
    return { x: this.world.width / 2, y: mid }
  }
}
