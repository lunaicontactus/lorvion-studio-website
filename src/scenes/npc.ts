/**
 * One dokkaebi, living in the room.
 *
 * The point is not that something moves. It is that the room looks occupied:
 * somebody walks over to the desk, stays there a while, wanders off, stands
 * about doing nothing for long enough that you stop watching them. Most of
 * this file is therefore about waiting, not about motion.
 *
 * What it is built on:
 * - a small state machine, so behaviour is readable and testable;
 * - waypoints in world units, so the camera and the window are irrelevant;
 * - an injectable random source, so a test can make it walk a fixed route.
 *
 * The art is three still views per character — front, side, back — and there
 * is no walk cycle. So the walk is a side view that travels, and using
 * something against the wall is the back view. Nothing is bounced or
 * stretched to fake frames it does not have: a still figure that stands
 * correctly beats a smeared one that hops.
 */
import { ticker } from '@/systems/tick'
import { motion } from '@/systems/motion'
import { log } from '@/systems/log'
import { navFor, objectPoints, type NavGraph, type Waypoint } from '@/data/navigation'
import type { CharacterConfig } from '@/types/character'

export type NpcState =
  | 'SPAWN'
  | 'IDLE'
  | 'CHOOSE_TARGET'
  | 'WALK'
  | 'INTERACT'
  | 'PAUSED'

export interface NpcOptions {
  /** Injected so a test can pin the route. Defaults to Math.random. */
  readonly random?: () => number
  /** Debug overlay. Off unless asked for. */
  readonly debug?: boolean
}

export interface NpcHandle {
  /** Stop choosing and moving; the current pose is held. */
  setPaused(paused: boolean): void
  /**
   * Something is open. Finish what you are doing, then stay put: a figure
   * pacing behind an open panel is a distraction, and stopping it dead
   * mid-stride is worse.
   */
  setCalm(calm: boolean): void
  /** The visitor opened this thing: get out of its way. */
  yieldTo(objectId: string): void
  readonly state: NpcState
  readonly target: string | null
  /** World position of the feet. */
  readonly at: { x: number; y: number }
  destroy(): void
}

/** How long it stands about doing nothing, in milliseconds. */
const IDLE_MS = { min: 3000, max: 10000 }
/** How long it spends at a thing once it gets there. */
const INTERACT_MS = { min: 2000, max: 7000 }
/** Under a fingertip of travel is not worth a walk. */
const ARRIVED = 4

export function mountNpc(
  room: HTMLElement,
  character: CharacterConfig,
  portrait: boolean,
  opts: NpcOptions = {},
): NpcHandle {
  const rng = opts.random ?? Math.random
  const graph: NavGraph = navFor(portrait)

  const el = document.createElement('div')
  el.className = 'npc'
  el.dataset['npc'] = character.id
  el.setAttribute('aria-hidden', 'true')
  const art = document.createElement('img')
  art.className = 'npc__art'
  art.alt = ''
  art.decoding = 'async'
  art.src = character.art.front
  el.append(art)
  room.append(el)

  let debugEl: HTMLElement | null = null
  if (opts.debug) {
    debugEl = document.createElement('p')
    debugEl.className = 'npc__debug'
    el.append(debugEl)
    for (const p of graph.points) {
      const dot = document.createElement('span')
      dot.className = 'npc__waypoint'
      dot.style.left = `${p.x}px`
      dot.style.top = `${p.y}px`
      dot.dataset['point'] = p.id
      room.append(dot)
    }
  }

  // ── The figure ───────────────────────────────────────────────────────────
  let x = 0
  let y = 0
  let facingRight = true
  let view: 'front' | 'side' | 'back' = 'front'

  const place = (): void => {
    // Positioned by the feet: the sprite hangs above its own standing point.
    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
    el.style.zIndex = String(Math.min(699, 100 + Math.round(y / 8)))
    art.style.height = `${graph.height}px`
    const flip = view === 'side' && !facingRight ? ' scaleX(-1)' : ''
    art.style.transform = `translate(-50%, -100%)${flip}`
  }

  const show = (next: 'front' | 'side' | 'back'): void => {
    if (view === next) return
    view = next
    art.src = character.art[next]
  }

  // ── The machine ──────────────────────────────────────────────────────────
  let state: NpcState = 'SPAWN'
  let held: NpcState | null = null
  let wait = 0
  let target: Waypoint | null = null
  let lastObject: string | null = null
  /** The thing the visitor has open, which is not ours to stand at. */
  let avoid: string | null = null
  /** True while the visitor has something open: no new errands. */
  let calm = false

  const between = (range: { min: number; max: number }): number =>
    range.min + rng() * (range.max - range.min)

  const go = (next: NpcState, ms = 0): void => {
    state = next
    wait = ms
    if (debugEl) debugEl.textContent = `${state} ${target?.id ?? ''}`
  }

  /**
   * Somewhere to go that is not where we just were, and probably not the far
   * end of the room. Weighting by distance is what stops the walk reading as
   * a patrol: people mostly deal with what is near them, and cross the whole
   * floor only now and then.
   */
  const chooseTarget = (): Waypoint => {
    const objects = objectPoints(graph).filter((p) => p.objectId !== avoid)
    const floors = graph.points.filter((p) => p.objectId === undefined)
    // Mostly a thing to do, sometimes just standing somewhere else: a room
    // where every trip has a purpose reads as a machine, not a person.
    const wantObject = rng() < 0.72 && objects.length > 0
    const pool = wantObject ? objects : floors
    const fresh = pool.filter((p) => p.id !== target?.id && p.objectId !== lastObject)
    const from = fresh.length > 0 ? fresh : pool
    const weights = from.map((p) => 1 / (1 + Math.hypot(p.x - x, p.y - y) / 420))
    const total = weights.reduce((a, w) => a + w, 0)
    let pick = rng() * total
    for (let i = 0; i < from.length; i++) {
      pick -= weights[i]!
      if (pick <= 0) return from[i]!
    }
    return from[from.length - 1] ?? graph.points[0]!
  }

  const step = (dt: number): void => {
    if (state === 'PAUSED') return
    wait -= dt

    switch (state) {
      case 'SPAWN':
        // Already there when the visitor arrives, off to one side, doing
        // nothing. No entrance, because nobody makes an entrance at work.
        if (wait <= 0) go('IDLE', between(IDLE_MS))
        return

      case 'IDLE':
        show('front')
        if (calm) {
          wait = 500
          return
        }
        if (wait <= 0) go('CHOOSE_TARGET')
        return

      case 'CHOOSE_TARGET': {
        target = chooseTarget()
        go('WALK')
        return
      }

      case 'WALK': {
        if (!target) {
          go('IDLE', between(IDLE_MS))
          return
        }
        const dx = target.x - x
        const dy = target.y - y
        const distance = Math.hypot(dx, dy)
        if (distance <= ARRIVED) {
          x = target.x
          y = target.y
          place()
          if (target.objectId) {
            lastObject = target.objectId
            show(target.facing === 'back' ? 'back' : 'front')
            go('INTERACT', between(INTERACT_MS))
          } else {
            go('IDLE', between(IDLE_MS))
          }
          return
        }
        const move = (graph.speed * dt) / 1000
        const ratio = Math.min(1, move / distance)
        x += dx * ratio
        y += dy * ratio
        facingRight = dx >= 0
        show('side')
        place()
        return
      }

      case 'INTERACT':
        // Standing at the thing, facing it. There is no work animation to
        // play, so it simply stays there, which is what a person mostly does.
        if (wait <= 0) go('IDLE', between(IDLE_MS))
        return
    }
  }

  // ── Start ────────────────────────────────────────────────────────────────
  const start = graph.points.find((p) => p.id === 'left-floor') ?? graph.points[0]!
  x = start.x
  y = start.y
  show('front')
  place()
  go('SPAWN', 800 + rng() * 1200)

  const off = ticker.subscribe((info) => {
    // The ticker is already gated on visibility, so a hidden tab costs
    // nothing and time does not pile up into a teleport on return.
    step(Math.min(info.delta, 64))
  }, 30)

  log.debug('npc: mounted', character.id, portrait ? 'portrait' : 'landscape')

  return {
    setPaused(paused: boolean): void {
      if (paused) {
        if (state === 'PAUSED') return
        held = state
        state = 'PAUSED'
      } else if (state === 'PAUSED') {
        // Come back doing what it was doing, not somewhere new.
        state = held ?? 'IDLE'
        held = null
      }
    },
    setCalm(next: boolean): void {
      calm = next
      if (!next) avoid = null
    },
    yieldTo(objectId: string): void {
      avoid = objectId
      if (target?.objectId !== objectId) return
      // The visitor wants this thing. Step away and leave them to it.
      const floors = graph.points.filter((p) => p.objectId === undefined)
      target = floors[Math.floor(rng() * floors.length)] ?? graph.points[0]!
      if (state !== 'PAUSED') go('WALK')
    },
    get state(): NpcState {
      return state
    },
    get target(): string | null {
      return target?.id ?? null
    },
    get at(): { x: number; y: number } {
      return { x, y }
    },
    destroy(): void {
      off()
      el.remove()
      for (const dot of room.querySelectorAll('.npc__waypoint')) dot.remove()
    },
  }
}

/** Reduced motion still gets a room with somebody in it, standing still. */
export function npcAllowed(): boolean {
  return !motion.reduced
}

/**
 * A small seeded generator, so a test can pin the route the dokkaebi takes.
 * Production passes nothing and gets Math.random.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
