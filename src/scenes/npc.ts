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
 * Art comes in two grades and the room takes whichever a character has. A
 * character with rendered frames (src/data/sprites.ts) walks and breathes; one
 * with only the three-view turnaround gets the old behaviour — a travelling
 * side view, and the back view for using something against the wall. Nothing
 * is bounced or stretched to fake frames it does not have.
 */
import { ticker } from '@/systems/tick'
import { motion } from '@/systems/motion'
import { log } from '@/systems/log'
import { navFor, objectPoints, type NavGraph, type Waypoint } from '@/data/navigation'
import { depthOf } from '@/data/occlusion'
import { FIGURE_RATIO, HIT_BOX, allFrames, idleFrames, spritesFor } from '@/data/sprites'
import { SpriteAnimator, preloadFrames } from '@/systems/spriteAnimator'
import type { CharacterConfig, SpriteDirection } from '@/types/character'

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
  /** Someone touched the dokkaebi. It has already stopped and looked up. */
  readonly onTouch?: (character: CharacterConfig) => void
  /**
   * CSS pixels per world unit. The room is scaled by the camera, so a hit box
   * sized in world units shrinks with it: at 360px wide a dokkaebi is 58 CSS
   * px tall and its body would be a 25px target. Given the scale, the box can
   * be grown to the 44px the rest of the room already guarantees.
   */
  readonly scale?: number
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
  /** On the move. The room drops its ambience while this is true. */
  readonly walking: boolean
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
/** The same floor every other hit area in this room stands on. */
const MIN_TOUCH = 44
/** Rendered frames are 284x420. */
const FRAME_ASPECT = 284 / 420

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
  el.append(art)

  // Joins the render to the painted boards. Sits under the art, at the
  // standing point, so it does not rise and fall with the walk.
  const shadow = document.createElement('span')
  shadow.className = 'npc__shadow'
  el.prepend(shadow)

  const sprites = spritesFor(character.id)
  const animator = sprites ? new SpriteAnimator(art) : null
  if (!sprites) art.src = character.art.front

  // The sprite is mostly empty: the frame is wide enough to hold a turning
  // character, and clicks in those corners belong to the wall behind. So the
  // only thing that takes a pointer is a box over the body.
  let hit: HTMLButtonElement | null = null
  if (sprites && opts.onTouch) {
    hit = document.createElement('button')
    hit.className = 'npc__hit'
    hit.type = 'button'
    hit.setAttribute('aria-label', character.name)
    el.append(hit)
  }
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
  /** Which rendered direction is showing. Kept when walking stops, so a
   *  dokkaebi that halts mid-stride does not spin round to face the camera. */
  let direction: SpriteDirection = 'front'

  // Rendered frames run from the floor row up and carry headroom above the
  // hair, so the frame is taller than the dokkaebi by a known ratio.
  const frameHeight = sprites ? graph.height / FIGURE_RATIO : graph.height

  const place = (): void => {
    // Positioned by the feet: the sprite hangs above its own standing point.
    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
    el.style.zIndex = String(depthOf(y))
    art.style.height = `${frameHeight}px`
    // Real left and right frames exist, so nothing is mirrored at runtime.
    const flip = !sprites && view === 'side' && !facingRight ? ' scaleX(-1)' : ''
    art.style.transform = `translate(-50%, -100%)${flip}`
    shadow.style.width = `${frameHeight * 0.44}px`
    shadow.style.height = `${frameHeight * 0.13}px`
    if (hit) {
      // The frame is taller than it is wide; HIT_BOX is a fraction of each.
      const frameWidth = frameHeight * FRAME_ASPECT
      const min = MIN_TOUCH / Math.max(opts.scale ?? 1, 0.01)
      hit.style.width = `${Math.max(frameWidth * HIT_BOX.width, min)}px`
      hit.style.height = `${Math.max(frameHeight * HIT_BOX.height, min)}px`
    }
  }

  /** The turnaround fallback, for a character with no rendered frames. */
  const show = (next: 'front' | 'side' | 'back'): void => {
    if (sprites || view === next) return
    view = next
    art.src = character.art[next]
  }

  /** One place decides what is on screen: an action and a direction. */
  const pose = (action: 'idle' | 'walk', next: SpriteDirection = direction): void => {
    direction = next
    if (!sprites || !animator) {
      show(action === 'walk' ? 'side' : next === 'back' ? 'back' : 'front')
      return
    }
    animator.play(`${action}:${next}`, sprites[action][next])
  }

  /**
   * Which way a move is facing. Decided from the whole trip rather than the
   * last frame's delta, and only allowed to change once the trip is longer
   * than the threshold — a vector a few units long flips direction on noise,
   * and a dokkaebi that shivers between left and right reads as broken.
   */
  const TURN_THRESHOLD = 12
  const faceFor = (dx: number, dy: number): SpriteDirection => {
    if (Math.abs(dx) < TURN_THRESHOLD && Math.abs(dy) < TURN_THRESHOLD) return direction
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
    return dy >= 0 ? 'front' : 'back'
  }

  // ── The machine ──────────────────────────────────────────────────────────
  let state: NpcState = 'SPAWN'
  let held: NpcState | null = null
  let wait = 0
  let target: Waypoint | null = null
  /** The last two things used. Remembering one is not enough: it lets the
   *  figure bounce between two neighbours, which reads as a machine. */
  let recent: string[] = []
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
    // Never the thing just used; the one before that is merely unlikely.
    // Barring both would leave a single legal choice and turn three objects
    // into a fixed circuit, which is the pattern this is trying to avoid.
    const fresh = pool.filter((p) => p.id !== target?.id && p.objectId !== recent[0])
    const from = fresh.length > 0 ? fresh : pool
    const weights = from.map((p) => {
      const near = 1 / (1 + Math.hypot(p.x - x, p.y - y) / 420)
      return p.objectId !== undefined && p.objectId === recent[1] ? near * 0.35 : near
    })
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
        // Whatever it was facing when it stopped. Turning to the camera on
        // arrival is the tell that nobody is home behind the sprite.
        pose('idle')
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
            recent = [target.objectId, ...recent].slice(0, 2)
            // Everything worth using is against the back wall.
            pose('idle', target.facing === 'back' ? 'back' : 'front')
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
        pose('walk', faceFor(dx, dy))
        place()
        return
      }

      case 'INTERACT':
        // Standing at the thing, facing it. There is no work animation to
        // play, so it breathes there, which is what a person mostly does.
        pose('idle')
        if (wait <= 0) {
          // Done with it: turn back to the room. Holding the wall-facing pose
          // through the idle afterwards left it nose-to-wall 56% of a
          // twenty-minute watch, which reads as a fault rather than a mood.
          if (direction === 'back') pose('idle', 'front')
          go('IDLE', between(IDLE_MS))
        }
        return
    }
  }

  // ── Start ────────────────────────────────────────────────────────────────
  const start = graph.points.find((p) => p.id === 'left-floor') ?? graph.points[0]!
  x = start.x
  y = start.y
  pose('idle', 'front')
  place()
  go('SPAWN', 800 + rng() * 1200)

  // Standing still is what a visitor sees first, so those frames are fetched
  // now and the walk follows once the room has finished arriving. Loading all
  // 48 up front delays the room; loading a walk frame when it is already due
  // on screen leaves a hole where the dokkaebi was.
  const warm: ReturnType<typeof setTimeout>[] = []
  if (sprites) {
    // Standing is what a visitor sees first.
    preloadFrames(idleFrames(sprites))
    // Then the two directions this room actually walks in: the floor is a
    // strip, so front and back walking barely happens.
    warm.push(setTimeout(() => {
      preloadFrames([...sprites.walk.left.frames, ...sprites.walk.right.frames])
    }, 2000))
    // The rest last, long after the room has settled.
    warm.push(setTimeout(() => preloadFrames(allFrames(sprites)), 9000))
  }

  // Reduced motion still gets somebody in the room — standing, not pacing.
  const still = motion.reduced

  const off = ticker.subscribe((info) => {
    // The ticker is already gated on visibility, so a hidden tab costs
    // nothing and time does not pile up into a teleport on return.
    const dt = Math.min(info.delta, 64)
    if (still) return
    step(dt)
    animator?.step(dt)
  }, 30)

  let resume: ReturnType<typeof setTimeout> | null = null
  const onHit = (e: Event): void => {
    e.preventDefault()
    e.stopPropagation()
    if (resume) clearTimeout(resume)
    // Stop where it is, look up, and let the room decide what that means.
    target = null
    pose('idle', 'front')
    go('IDLE', 2200)
    opts.onTouch?.(character)
    resume = setTimeout(() => {
      resume = null
    }, 2200)
  }
  hit?.addEventListener('click', onHit)

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
    get walking(): boolean {
      return state === 'WALK'
    },
    get target(): string | null {
      return target?.id ?? null
    },
    get at(): { x: number; y: number } {
      return { x, y }
    },
    destroy(): void {
      off()
      for (const t of warm) clearTimeout(t)
      if (resume) clearTimeout(resume)
      hit?.removeEventListener('click', onHit)
      el.remove()
      for (const dot of room.querySelectorAll('.npc__waypoint')) dot.remove()
    },
  }
}

/**
 * Whether to put anybody in the room. Reduced motion no longer means an empty
 * room: the dokkaebi is mounted and simply does not move, which is the
 * difference between a quiet room and an abandoned one.
 */
export function npcAllowed(): boolean {
  return true
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
