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
 * With five of them the machine is unchanged and the numbers differ
 * (src/data/behaviour.ts). What the individual does not decide for itself is
 * anything that only makes sense across the whole crew — how many may walk at
 * once, who has the fridge door, how close two of them may stand, who is
 * allowed to speak. That belongs to the Crowd (src/systems/crowd.ts), which
 * this one asks rather than assumes.
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
import { navFor, objectPoints, pointNamed, type NavGraph, type SitPoint, type Waypoint } from '@/data/navigation'
import { behaviourFor } from '@/data/behaviour'
import { chatterFor } from '@/data/chatter'
import { depthOf } from '@/data/occlusion'
import { HIT_BOX, allFrames, durationOf, idleFrames, metricsFor, spritesFor } from '@/data/sprites'
import { SpriteAnimator, preloadFrames } from '@/systems/spriteAnimator'
import type { Crowd, CrowdMember } from '@/systems/crowd'
import type { CharacterConfig, ChatterMood, SpriteAction, SpriteDirection } from '@/types/character'

export type NpcState =
  | 'SPAWN'
  | 'IDLE'
  | 'CHOOSE_TARGET'
  | 'WALK'
  | 'INTERACT'
  | 'WORK'
  | 'SIT'
  | 'LOOK'
  | 'GREET'
  | 'REACT'
  | 'PAUSED'

/**
 * Which state may interrupt which. A touch from the visitor beats anything; a
 * dokkaebi that wanders off mid-conversation is the room ignoring you.
 */
const PRIORITY: Readonly<Record<NpcState, number>> = {
  REACT: 70, INTERACT: 60, GREET: 55, WORK: 50, SIT: 40, WALK: 30,
  LOOK: 20, IDLE: 10, CHOOSE_TARGET: 10, SPAWN: 0, PAUSED: 0,
}

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
  /** The rest of the crew. Without one, this dokkaebi lives alone and the
   *  spacing, booking, budget and social rules are all no-ops. */
  readonly crowd?: Crowd
  /** Where in an animation cycle this one starts, 0 to 1. */
  readonly phase?: number
  /**
   * Which of the crew this is, counting from zero. Only used to stagger the
   * loading: five characters asking for their standing frames on the same
   * frame is one request storm where five small ones would do.
   */
  readonly order?: number
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
  /**
   * Whether this one is anywhere near the view. Offscreen it keeps thinking
   * and keeps its place in the world — it is not deleted and does not
   * teleport on return — but stops touching the DOM, which is the only part
   * that costs anything.
   */
  setOnscreen(on: boolean): void
  readonly id: string
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
/** Watching something is a longer stay than opening a fridge. */
const WATCH_MS = { min: 9000, max: 26000 }
/** Long enough to be doing something, short enough not to become furniture. */
const WORK_MS = { min: 6000, max: 16000 }
const SIT_MS = { min: 8000, max: 22000 }
/** Long enough to read as an exchange, short enough not to be a scene. */
const GREET_MS = 2600
/** Under a fingertip of travel is not worth a walk. */
const ARRIVED = 4
/** The same floor every other hit area in this room stands on. */
const MIN_TOUCH = 44
/** How long a bubble stays up. */
const BUBBLE_MS = 2800
/**
 * No progress for this long while walking means something is in the way that
 * politeness will not solve — usually two of them wanting the same gap. Rather
 * than model the standoff, give up on the errand and pick another. A visitor
 * cannot tell the difference between a dokkaebi that changed its mind and one
 * that was rescued, and only one of those is achievable.
 */
const STUCK_MS = 3800

export function mountNpc(
  room: HTMLElement,
  character: CharacterConfig,
  portrait: boolean,
  opts: NpcOptions = {},
): NpcHandle {
  const rng = opts.random ?? Math.random
  const graph: NavGraph = navFor(portrait)
  const profile = behaviourFor(character.id)
  const pace = graph.speed * profile.pace
  const crowd = opts.crowd ?? null
  const id = character.id

  const el = document.createElement('div')
  el.className = 'npc'
  el.dataset['npc'] = id
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

  // What it is saying, if anything. Empty and hidden nearly all the time.
  const bubble = document.createElement('p')
  bubble.className = 'npc__bubble'
  bubble.hidden = true
  el.append(bubble)

  const sprites = spritesFor(id)
  const metrics = metricsFor(id)
  const animator = sprites ? new SpriteAnimator(art, opts.phase ?? 0) : null
  // A glance and a wave last exactly as long as their own frames do. Both
  // used to be constants, which was right for one character and wrong for the
  // second: NUNU's cycles were rendered with more frames in them, so its
  // wave takes a full second where MOMO's takes five sixths of one.
  const lookMs = sprites ? durationOf(sprites.look.front) : 1500
  const waveMs = sprites ? durationOf(sprites.wave.front) : 900
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
  let onscreen = true
  /**
   * How fast it is actually travelling, as a fraction of its own pace. The
   * walk plays at this rate too: a dokkaebi shuffling round another one at
   * half speed with its legs still going at full speed is sliding, which is
   * the same fault as the wrong frame rate and just as visible.
   */
  let paceScale = 1

  // Rendered frames run from the floor row up and carry headroom above the
  // hair, so the frame is taller than the dokkaebi by a known ratio.
  const frameHeight = metrics ? graph.height / metrics.figureRatio : graph.height

  const place = (): void => {
    if (!onscreen) return
    // Positioned by the feet: the sprite hangs above its own standing point.
    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
    el.style.zIndex = String(depthOf(y))
    art.style.height = `${frameHeight}px`
    // Real left and right frames exist, so nothing is mirrored at runtime.
    const flip = !sprites && view === 'side' && !facingRight ? ' scaleX(-1)' : ''
    art.style.transform = `translate(-50%, -100%)${flip}`
    shadow.style.width = `${frameHeight * 0.44}px`
    shadow.style.height = `${frameHeight * 0.13}px`
    // The element's origin is the feet, so a bubble over the head is lifted
    // by the character's own height and a little clearance for the horns.
    bubble.style.bottom = `${frameHeight + 10}px`
    if (hit) {
      // The frame is taller than it is wide; the box is a fraction of the
      // body inside it, which is not the same fraction of the frame for two
      // characters whose widest poses differ.
      const frameWidth = frameHeight * (metrics?.aspect ?? 0.71)
      const min = MIN_TOUCH / Math.max(opts.scale ?? 1, 0.01)
      hit.style.width = `${Math.max(frameWidth * (metrics?.bodyWidth ?? 0.9) * HIT_BOX.body, min)}px`
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
  const pose = (action: SpriteAction, next: SpriteDirection = direction): void => {
    direction = next
    if (!sprites || !animator) {
      // A character with only a turnaround has three views and no more, so
      // everything it might be doing collapses onto standing or walking.
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

  // ── Saying something ─────────────────────────────────────────────────────
  let bubbleTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * Put a line up, if the room has room for one. The crowd holds the budget,
   * because the thing to prevent is not one character talking too much — it is
   * five of them talking at once, which turns a workshop into a chat window.
   */
  const say = (mood: ChatterMood, chance = 1): void => {
    if (!crowd || !crowd.maySpeak(id) || rng() > chance) return
    const line = chatterFor(id, mood, rng)
    if (!line) return
    crowd.startSpeaking(id)
    bubble.textContent = line
    bubble.hidden = false
    if (bubbleTimer) clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => {
      bubble.hidden = true
      crowd.stopSpeaking(id)
      bubbleTimer = null
    }, BUBBLE_MS)
  }

  // ── The machine ──────────────────────────────────────────────────────────
  let state: NpcState = 'SPAWN'
  let held: NpcState | null = null
  let wait = 0
  let target: Waypoint | null = null
  /** The place currently booked with the crowd, if any. */
  let booked: string | null = null
  /** The last two things used. Remembering one is not enough: it lets the
   *  figure bounce between two neighbours, which reads as a machine. */
  let recent: string[] = []
  /** The thing the visitor has open, which is not ours to stand at. */
  let avoid: string | null = null
  /** True while the visitor has something open: no new errands. */
  let calm = false
  /** Who this one is currently turned toward. */
  let partner: CrowdMember | null = null
  /** How long it has been walking without getting anywhere. */
  let stuck = 0
  let lastX = 0
  let lastY = 0
  /** How many times running the visitor has poked it. */
  let pokes = 0

  const between = (range: { min: number; max: number }): number =>
    range.min + rng() * (range.max - range.min)

  /** Weighted pick, by the profile's own pulls. */
  const pick = <T,>(options: readonly (readonly [T, number])[]): T => {
    const total = options.reduce((a, [, w]) => a + w, 0)
    let n = rng() * total
    for (const [value, w] of options) {
      n -= w
      if (n <= 0) return value
    }
    return options[options.length - 1]![0]
  }

  let sitAt: SitPoint | null = null

  const go = (next: NpcState, ms = 0): void => {
    state = next
    wait = ms
    if (next !== 'WALK') crowd?.endWalk(id)
    if (debugEl) debugEl.textContent = `${state} ${target?.id ?? ''}`
  }

  /** Give up whatever place was booked. Called on every way out of one. */
  const unbook = (): void => {
    if (booked && crowd) crowd.release(booked, id)
    booked = null
  }

  /** Whether `next` is allowed to cut in on what is happening now. */
  const mayInterrupt = (next: NpcState): boolean =>
    state === 'PAUSED' || PRIORITY[next] >= PRIORITY[state]

  /**
   * Set off, if the room can spare another pair of feet. When it cannot, wait
   * a beat and ask again — the errand is not cancelled, only deferred, which
   * is why a busy room still gets everything done, just not all at once.
   */
  const beginWalk = (): void => {
    if (crowd && !crowd.mayWalk(id)) {
      unbook()
      target = null
      sitAt = null
      go('IDLE', 1200 + rng() * 1800)
      return
    }
    crowd?.startWalk(id)
    stuck = 0
    lastX = x
    lastY = y
    go('WALK')
  }

  /**
   * Somewhere to go that is not where we just were, and probably not the far
   * end of the room. Weighting by distance is what stops the walk reading as
   * a patrol: people mostly deal with what is near them, and cross the whole
   * floor only now and then. Weighting by the profile's favourites is what
   * makes RUKI's day look different from POKO's without either of them being
   * a special case in this function.
   */
  const chooseTarget = (): Waypoint | null => {
    const bookable = (p: Waypoint): boolean => !crowd || crowd.free(p.id, id)
    const objects = objectPoints(graph).filter((p) => p.objectId !== avoid && bookable(p))
    const floors = graph.points.filter((p) => p.objectId === undefined && bookable(p))
    // Mostly a thing to do, sometimes just standing somewhere else: a room
    // where every trip has a purpose reads as a machine, not a person.
    const wantObject = rng() < 0.72 && objects.length > 0
    const pool = wantObject ? objects : floors.length > 0 ? floors : objects
    if (pool.length === 0) return null
    // Never the thing just used; the one before that is merely unlikely.
    // Barring both would leave a single legal choice and turn three objects
    // into a fixed circuit, which is the pattern this is trying to avoid.
    const fresh = pool.filter((p) => p.id !== target?.id && p.objectId !== recent[0])
    const from = fresh.length > 0 ? fresh : pool
    const weights = from.map((p) => {
      const near = 1 / (1 + Math.hypot(p.x - x, p.y - y) / 420)
      // A favourite is worth crossing the room for. Not so much that it
      // becomes the only place it ever goes — see the bias check in the QA.
      const liked = p.objectId && profile.favours.includes(p.objectId) ? 2.4 : 1
      const stale = p.objectId !== undefined && p.objectId === recent[1] ? 0.35 : 1
      return near * liked * stale
    })
    const total = weights.reduce((a, w) => a + w, 0)
    let choice = rng() * total
    for (let i = 0; i < from.length; i++) {
      choice -= weights[i]!
      if (choice <= 0) return from[i]!
    }
    return from[from.length - 1] ?? null
  }

  /** Keep the feet on the painted boards whatever the steering asks for. */
  const clampFloor = (): void => {
    y = Math.min(graph.floor.bottom, Math.max(graph.floor.top, y))
  }

  const step = (dt: number): void => {
    if (state === 'PAUSED') return
    wait -= dt

    // Standing too close to somebody is corrected while standing about, not
    // only while walking: two of them can end up shoulder to shoulder because
    // the other one arrived, and neither is going anywhere.
    //
    // Only while standing about. A dokkaebi at the fridge has that place
    // booked and nobody else can be there, so shuffling would only walk it
    // off the thing it came to use.
    if (crowd && (state === 'IDLE' || state === 'LOOK' || state === 'CHOOSE_TARGET')) {
      const sep = crowd.separation(id, x, y)
      if (sep.x !== 0 || sep.y !== 0) {
        const shuffle = (26 * dt) / 1000
        x += sep.x * shuffle
        y += sep.y * shuffle
        clampFloor()
        place()
      }
    }

    switch (state) {
      case 'SPAWN':
        // Already there when the visitor arrives, off to one side, doing
        // nothing. No entrance, because nobody makes an entrance at work.
        if (wait <= 0) go('IDLE', between(IDLE_MS))
        return

      case 'IDLE': {
        // Whatever it was facing when it stopped. Turning to the camera on
        // arrival is the tell that nobody is home behind the sprite.
        pose('idle')
        if (calm) {
          wait = 500
          return
        }
        if (wait > 0) return
        say('idle', 0.12 * profile.talkative * 0.2)
        // What to do next is the whole personality: the same machine, pulled
        // by different numbers per character (src/data/behaviour.ts).
        const benches = objectPoints(graph).filter(
          (p) => p.kind === 'work' && p.objectId !== avoid && (!crowd || crowd.free(p.id, id)))
        const seats = graph.sits.filter((p) => !crowd || crowd.free(p.id, id))
        const next = pick<'wander' | 'work' | 'sit' | 'look'>([
          ['wander', profile.wander],
          ['work', benches.length ? profile.work : 0],
          ['sit', seats.length ? profile.sit : 0],
          ['look', profile.look],
        ])
        if (next === 'look') {
          go('LOOK', lookMs)
          return
        }
        if (next === 'sit') {
          sitAt = pick(seats.map((p) => [p, p.weight] as const))
          target = { id: sitAt.id, x: sitAt.x, y: sitAt.y }
          if (crowd) {
            crowd.claim(sitAt.id, id)
            booked = sitAt.id
          }
          beginWalk()
          return
        }
        if (next === 'work' && benches.length) {
          // Prefer the bench this one likes, then whichever is nearest free.
          const liked = benches.filter((p) => profile.favours.includes(p.objectId!))
          const from = liked.length ? liked : benches
          target = from.reduce((a, b) =>
            Math.hypot(a.x - x, a.y - y) <= Math.hypot(b.x - x, b.y - y) ? a : b)
          if (crowd) {
            crowd.claim(target.id, id)
            booked = target.id
          }
          beginWalk()
          return
        }
        sitAt = null
        go('CHOOSE_TARGET')
        return
      }

      case 'LOOK':
        // A glance round the room, then back to standing.
        pose('look', 'front')
        if (wait <= 0) go('IDLE', between(IDLE_MS))
        return

      case 'WORK':
        pose('work', 'back')
        if (wait <= 0) {
          say('work', 0.35)
          unbook()
          go('IDLE', between(IDLE_MS))
        }
        return

      case 'SIT':
        pose('sit', sitAt?.facing ?? 'front')
        if (wait <= 0) {
          say('sit', 0.3)
          unbook()
          sitAt = null
          go('IDLE', between(IDLE_MS))
        }
        return

      case 'GREET':
        // Turned toward whoever it met. Kept turned toward them: the other
        // one is being separated at the same time, and a dokkaebi that goes
        // on addressing the spot where somebody used to be is worse than one
        // that never looked up. Only an actual change of direction restarts
        // the animation, so this is a turn and not a stutter.
        if (partner && direction !== 'front') {
          const dx = partner.at.x - x
          pose('look', dx >= 0 ? 'right' : 'left')
        }
        if (wait <= 0) {
          partner = null
          pose('idle', 'front')
          go('IDLE', between(IDLE_MS))
        }
        return

      case 'REACT':
        // Looked up at whoever touched it. Waving is a maybe, not a reflex.
        if (wait <= 0) go('IDLE', between(IDLE_MS))
        return

      case 'CHOOSE_TARGET': {
        const next = chooseTarget()
        if (!next) {
          go('IDLE', between(IDLE_MS))
          return
        }
        target = next
        if (crowd && next.objectId) {
          crowd.claim(next.id, id)
          booked = next.id
        }
        beginWalk()
        return
      }

      case 'WALK': {
        if (!target) {
          crowd?.endWalk(id)
          go('IDLE', between(IDLE_MS))
          return
        }
        const dx = target.x - x
        const dy = target.y - y
        const distance = Math.hypot(dx, dy)
        if (distance <= ARRIVED) {
          x = target.x
          y = target.y
          crowd?.endWalk(id)
          place()
          if (sitAt) {
            pose('sit', sitAt.facing)
            go('SIT', between(SIT_MS))
          } else if (target.kind === 'work') {
            recent = [target.objectId!, ...recent].slice(0, 2)
            pose('work', 'back')
            go('WORK', between(WORK_MS))
          } else if (target.objectId) {
            recent = [target.objectId, ...recent].slice(0, 2)
            // Everything worth using is against the back wall.
            pose('idle', target.facing === 'back' ? 'back' : 'front')
            go('INTERACT', between(target.kind === 'watch' ? WATCH_MS : INTERACT_MS))
          } else {
            unbook()
            go('IDLE', between(IDLE_MS))
          }
          return
        }
        // Two of them wanting the same gap is not worth modelling as a
        // negotiation. Give up on the errand and find another; from outside
        // that is indistinguishable from changing your mind.
        if (Math.hypot(x - lastX, y - lastY) < 2) {
          stuck += dt
          if (stuck > STUCK_MS) {
            unbook()
            target = null
            sitAt = null
            crowd?.endWalk(id)
            go('IDLE', 600 + rng() * 1400)
            return
          }
        } else {
          stuck = 0
          lastX = x
          lastY = y
        }
        const sep = crowd?.separation(id, x, y) ?? { x: 0, y: 0, slow: 1 }
        paceScale = sep.slow
        const move = (pace * sep.slow * dt) / 1000
        const ratio = Math.min(1, move / distance)
        // Steering, not collision: the push bends the path around the other
        // one instead of stopping dead at it, and two of them meeting in the
        // middle of the floor drift past each other the way people do.
        x += dx * ratio + sep.x * move * 0.85
        y += dy * ratio + sep.y * move * 0.85
        clampFloor()
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
          unbook()
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
  // Where this one already was. Five dokkaebi found in the places they belong
  // have lived here; five that appear together and disperse have just arrived.
  const home = pointNamed(graph, profile.home)
    ?? graph.points.find((p) => p.id === 'left-floor')
    ?? graph.points[0]!
  x = home.x
  y = home.y
  pose('idle', rng() < 0.5 ? 'front' : 'left')
  place()
  // Staggered, so they do not all come to life on the same frame.
  go('SPAWN', 600 + rng() * 3400)

  // Standing still is what a visitor sees first, so those frames are fetched
  // now and the walk follows once the room has finished arriving. Loading all
  // 48 up front delays the room; loading a walk frame when it is already due
  // on screen leaves a hole where the dokkaebi was.
  const warm: ReturnType<typeof setTimeout>[] = []
  if (sprites) {
    // Queued behind whoever is ahead in the crew, so five characters do not
    // ask for everything at once and leave the room waiting on its own
    // background. The order is arbitrary; the spacing is the point.
    const slot = opts.order ?? 0
    // Standing is what a visitor sees first.
    warm.push(setTimeout(() => preloadFrames(idleFrames(sprites)), slot * 140))
    // Then the two directions this room actually walks in: the floor is a
    // strip, so front and back walking barely happens.
    warm.push(setTimeout(() => {
      preloadFrames([...sprites.walk.left.frames, ...sprites.walk.right.frames])
    }, 2000 + slot * 500))
    // The rest last, long after the room has settled.
    warm.push(setTimeout(() => preloadFrames(allFrames(sprites)), 9000 + slot * 1800))
  }

  // Reduced motion still gets somebody in the room — standing, not pacing.
  const still = motion.reduced

  const off = ticker.subscribe((info) => {
    // The ticker is already gated on visibility, so a hidden tab costs
    // nothing and time does not pile up into a teleport on return.
    const dt = Math.min(info.delta, 64)
    if (still) return
    step(dt)
    // The walk is the one animation tied to the floor, so it is the one that
    // has to slow down when the feet do.
    if (onscreen) animator?.step(state === 'WALK' ? dt * paceScale : dt)
  }, 30)

  let resume: ReturnType<typeof setTimeout> | null = null
  let pokeReset: ReturnType<typeof setTimeout> | null = null
  const onHit = (e: Event): void => {
    e.preventDefault()
    e.stopPropagation()
    // Already reacting: let the wave finish rather than restarting it on
    // every click, which turns a greeting into a stutter.
    if (!mayInterrupt('REACT')) return
    if (resume) clearTimeout(resume)
    // Stop where it is, look up, and let the room decide what that means.
    unbook()
    target = null
    sitAt = null
    partner = null
    crowd?.endWalk(id)
    pokes += 1
    if (pokeReset) clearTimeout(pokeReset)
    pokeReset = setTimeout(() => {
      pokes = 0
      pokeReset = null
    }, 9000)
    // The first poke gets the character's own reaction. Poke it again and it
    // runs out of ways to be surprised, which is also true of people.
    const wave = pokes === 1
      ? rng() < profile.waveChance
      : pokes === 2 && rng() < profile.waveChance * 0.5
    pose(wave ? 'wave' : 'look', 'front')
    // RUKI looks up more slowly than YOMI, who was looking for an excuse.
    const hold = (wave ? waveMs + 1200 : 2000) * (1 + profile.stubborn * 0.5)
    go('REACT', hold)
    say('touched', pokes === 1 ? 0.55 : 0.25)
    opts.onTouch?.(character)
    resume = setTimeout(() => {
      resume = null
    }, 2200)
  }
  hit?.addEventListener('click', onHit)

  const member: CrowdMember = {
    id,
    social: profile.social,
    get at(): { x: number; y: number } {
      return { x, y }
    },
    get solid(): boolean {
      return state !== 'SIT'
    },
    get busy(): boolean {
      // Free to be spoken to only when it is standing about. Interrupting a
      // job for small talk is what makes an office look like a party.
      return !(state === 'IDLE' || state === 'LOOK')
    },
    greet(other: CrowdMember): void {
      if (!mayInterrupt('GREET')) return
      unbook()
      target = null
      sitAt = null
      partner = other
      // Turn to them. Left and right are real frames, so this is a real turn.
      const dx = other.at.x - x
      const towards: SpriteDirection = Math.abs(dx) < 24 ? 'front' : dx >= 0 ? 'right' : 'left'
      // The eager ones wave; the quiet ones look over, which is still an
      // acknowledgement and is what quiet people actually do.
      const wave = rng() < profile.social * 0.8
      pose(wave ? 'wave' : 'look', wave ? 'front' : towards)
      go('GREET', GREET_MS)
      say('greet', profile.social)
    },
  }
  crowd?.join(member)

  log.debug('npc: mounted', id, portrait ? 'portrait' : 'landscape')

  return {
    id,
    setPaused(paused: boolean): void {
      if (paused) {
        if (state === 'PAUSED') return
        held = state
        state = 'PAUSED'
        crowd?.endWalk(id)
      } else if (state === 'PAUSED') {
        // Come back doing what it was doing, not somewhere new.
        state = held ?? 'IDLE'
        held = null
        if (state === 'WALK') crowd?.startWalk(id)
      }
    },
    setCalm(next: boolean): void {
      calm = next
      if (!next) avoid = null
    },
    setOnscreen(on: boolean): void {
      if (on === onscreen) return
      onscreen = on
      // Coming back into view, catch the DOM up in one write rather than
      // leaving the sprite where it was when it left.
      if (on) place()
    },
    yieldTo(objectId: string): void {
      avoid = objectId
      if (target?.objectId !== objectId) return
      // The visitor wants this thing. Step away and leave them to it.
      unbook()
      const floors = graph.points.filter((p) => p.objectId === undefined)
      target = floors[Math.floor(rng() * floors.length)] ?? graph.points[0]!
      if (state !== 'PAUSED') beginWalk()
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
      crowd?.leave(id)
      for (const t of warm) clearTimeout(t)
      if (resume) clearTimeout(resume)
      if (pokeReset) clearTimeout(pokeReset)
      if (bubbleTimer) clearTimeout(bubbleTimer)
      hit?.removeEventListener('click', onHit)
      el.remove()
      for (const dot of room.querySelectorAll('.npc__waypoint')) dot.remove()
    },
  }
}

/**
 * Whether to put anybody in the room. Reduced motion no longer means an empty
 * room: the dokkaebi are mounted and simply do not move, which is the
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
