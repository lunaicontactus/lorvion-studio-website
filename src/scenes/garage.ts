/**
 * The garage: a room larger than the window you look at it through.
 *
 * The world is a fixed coordinate space (see src/data/world.ts). The camera
 * moves inside it — drag, arrows, WASD, wheel — and everything in the room is
 * positioned from the same coordinates, so a hit area can never drift off the
 * thing it belongs to, whatever the window does.
 *
 * The room itself is one painted plate per orientation (src/data/world.ts).
 * The objects below are hit regions over furniture that is already in that
 * painting — they draw no furniture of their own, and the only thing they show
 * is an outline tracing the object under the pointer.
 */
import { Camera } from '@/systems/camera'
import { worldFor, ROOM_ART, CAPTIONS, DECOR } from '@/data/world'
import { loadImage } from '@/systems/assets'
import { depthOf, occludersFor } from '@/data/occlusion'
import { BITS, LIGHTS, SKY, STARS, STEAM, TV_SCREEN } from '@/data/ambience'
import { ATTENTION, Ambient } from '@/systems/ambient'
import { OUTLINE_PATHS, HIT_PADDING, OUTLINE_OFFSET } from '@/data/outlines'
import { ticker } from '@/systems/tick'
import { motion } from '@/systems/motion'
import { audio } from '@/systems/audio'
import { save } from '@/systems/storage'
import { log } from '@/systems/log'
import { mountNpc, npcAllowed, seededRandom, type NpcHandle } from '@/scenes/npc'
import { Crowd } from '@/systems/crowd'
import { Stage } from '@/systems/stage'
import { pointNamed, navFor } from '@/data/navigation'

/** How many of them live in the portrait room. See the note where it is used. */
const PHONE_CREW = 3
/**
 * How many are on the floor at once. The rest are off the edge of the plate
 * and take turns coming in (src/systems/stage.ts). Four on a desk, where the
 * window shows about half of a room they are spread along — so two or three
 * of them, and one at a time when the rotation has just sent somebody out;
 * two on a phone held upright, where the whole strip is in view.
 */
const ON_STAGE = { landscape: 4, portrait: 2 }
import { CHARACTERS } from '@/data/characters'
import { spritesFor } from '@/data/sprites'
import type { WorldLayout, WorldObject } from '@/types/world'

export interface GarageHandle {
  /** Everybody in the room. */
  readonly crew: readonly NpcHandle[]
  /** The first of them. Kept for the callers and tests that only ever needed
   *  one, from when there only was one. */
  readonly npc: NpcHandle | null
  /** Stop reacting while a panel is open, so the room does not slide behind it. */
  setPaused(v: boolean): void
  /** Fast travel: put an object in the middle of the view. */
  focusObject(id: string): void
  /** Put the camera back where the visitor had left it. */
  restoreCamera(): void
  /**
   * Which game the monitor is showing, or null. The room takes that game's
   * light while it is up: a wash over the whole plate, and for LIMINAL the
   * glow under the locked door. Nothing moves; only the light changes.
   */
  setWorld(world: string | null): void
  readonly world: WorldLayout
  destroy(): void
}

export interface GarageOptions {
  /** Asked to leave by the door. */
  readonly onExit?: () => void
  /** A thing was touched; the host decides what panel that means. */
  readonly onObject?: (object: WorldObject) => void
}

/** World units per second under the keyboard. */
const KEY_PAN = 620

/** How long a tapped object stays outlined, in milliseconds. */
const MIN_PRESS = 150

/** The smallest a thing may be on screen before its hit area is grown, in CSS px. */
const MIN_TOUCH = 44

/** However small a thing is, its hit area stops growing here, in world units. */
const MAX_HIT_PADDING = 90

export function mountGarage(root: ParentNode = document, opts: GarageOptions = {}): GarageHandle | null {
  const scene = root.querySelector<HTMLElement>('[data-garage]')
  if (!scene) return null

  const stage = scene.querySelector<HTMLElement>('[data-garage-stage]')
  const roomEl = scene.querySelector<HTMLElement>('[data-garage-room]')
  if (!stage || !roomEl) return null

  // The crew are off. Not hidden — never constructed: no spawn, no wander, no
  // timers, no listeners, and none of their collision boxes in the room. The
  // renderer that drew them was deleted; git history is where it lives now.

  const off: (() => void)[] = []
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const later = (fn: () => void, ms: number): void => {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }
  const camera = new Camera(motion.reduced ? 1 : 0.16)
  let crew: NpcHandle[] = []
  let crowd: Crowd | null = null
  let cast: Stage | null = null
  /** Where the visitor was looking before an object took the camera. */
  let parked: { x: number; y: number } | null = null
  /** Things with two states that have been opened. Kept across a rebuild on rotation. */
  const opened = new Set<string>()
  let world: WorldLayout = worldFor(false)
  let scale = 1
  /** The visible window, in world units. Kept so the crew can be culled. */
  let viewW = 0
  let viewH = 0
  let lights = new Map<string, HTMLElement>()
  let ambient: Ambient | null = null
  let built = false
  let paused = false
  const keys = new Set<string>()


  // ── Room construction ────────────────────────────────────────────────────
  // One pass builds every zone and object as an element sized in world units;
  // after that only transforms change, so panning never touches layout.
  const build = (): void => {
    roomEl.textContent = ''
    roomEl.style.width = `${world.width}px`
    roomEl.style.height = `${world.height}px`
    const plate = world.width > world.height ? ROOM_ART.landscape : ROOM_ART.portrait
    roomEl.style.backgroundImage = `url('${plate.src}')`
    // The crew wait for this before fetching anything beyond the frame they
    // are standing in. Shares the browser's own request with the background,
    // so it costs no second download.
    const plateReady = loadImage(plate.src)

    // The foreground: the same plate, redrawn over the top in the shape of the
    // things that stand on the floor, so somebody walking behind one of them
    // goes behind it. No second image — this is the painting, twice.
    for (const o of occludersFor(world.height > world.width)) {
      const front = document.createElement('div')
      front.className = 'garage__front'
      front.dataset['front'] = o.id
      front.style.left = `${o.x}px`
      front.style.top = `${o.y}px`
      front.style.width = `${o.w}px`
      front.style.height = `${o.h}px`
      front.style.backgroundImage = `url('${plate.src}')`
      front.style.backgroundSize = `${world.width}px ${world.height}px`
      front.style.backgroundPosition = `${-o.x}px ${-o.y}px`
      // Its own base line, through the same formula the crew use.
      front.style.zIndex = String(depthOf(o.behindAbove))
      roomEl.append(front)
    }

    // ── Light, and what moves in it ──────────────────────────────────────
    const lit = new Map<string, HTMLElement>()
    if (world.width > world.height) {
      for (const l of LIGHTS) {
        const g = document.createElement('div')
        g.className = 'garage__light'
        g.dataset['light'] = l.id
        g.style.left = `${l.x - l.r}px`
        g.style.top = `${l.y - l.r}px`
        g.style.width = `${l.r * 2}px`
        g.style.height = `${l.r * 2}px`
        g.style.background = `radial-gradient(closest-side, ${l.colour}, transparent)`
        roomEl.append(g)
        lit.set(l.id, g)
      }
      const sky = document.createElement('div')
      sky.className = 'garage__sky'
      sky.style.left = `${SKY.x}px`
      sky.style.top = `${SKY.y}px`
      sky.style.width = `${SKY.w}px`
      sky.style.height = `${SKY.h}px`
      for (const st of STARS) {
        const dot = document.createElement('span')
        dot.className = 'garage__star'
        dot.style.left = `${st.x * SKY.w}px`
        dot.style.top = `${st.y * SKY.h}px`
        dot.style.width = `${st.s}px`
        dot.style.height = `${st.s}px`
        sky.append(dot)
      }
      const shooting = document.createElement('span')
      shooting.className = 'garage__shooting'
      sky.append(shooting)
      roomEl.append(sky)
      lit.set('sky', sky)
      lit.set('shooting', shooting)
    }
    lights = lit

    // The small movements in the painting itself (src/data/ambience.ts):
    // pieces of the plate over the plate, each with its own little motion.
    const bits = new Map<string, HTMLElement>()
    if (world.width > world.height) {
      for (const b of BITS) {
        const bit = document.createElement('div')
        bit.className = 'garage__bit'
        bit.dataset['bit'] = b.id
        bit.dataset['motion'] = b.motion
        Object.assign(bit.style, {
          left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`,
          backgroundImage: `url('${plate.src}')`,
          backgroundSize: `${world.width}px ${world.height}px`,
          backgroundPosition: `${-b.x}px ${-b.y}px`,
          transformOrigin: b.origin,
        })
        roomEl.append(bit)
        bits.set(b.id, bit)
      }
      const steam = document.createElement('div')
      steam.className = 'garage__steam'
      steam.style.left = `${STEAM.x - 30}px`
      steam.style.top = `${STEAM.y - 80}px`
      steam.innerHTML = '<span></span><span></span><span></span>'
      roomEl.append(steam)
      bits.set('steam', steam)
      const flicker = document.createElement('div')
      flicker.className = 'garage__tvflicker'
      Object.assign(flicker.style, {
        left: `${TV_SCREEN.x}px`, top: `${TV_SCREEN.y}px`, width: `${TV_SCREEN.w}px`, height: `${TV_SCREEN.h}px`,
      })
      roomEl.append(flicker)
      bits.set('tvflicker', flicker)
    }

    // Small things on the floor that the painting does not have and nobody
    // can touch: the cup of noodles beside the rug, for whoever sits there.
    for (const d of DECOR[world.width > world.height ? 'landscape' : 'portrait']) {
      const img = document.createElement('img')
      img.className = 'garage__decor'
      img.src = d.art
      img.alt = ''
      img.decoding = 'async'
      Object.assign(img.style, {
        left: `${d.x}px`, top: `${d.y - d.h}px`, width: `${d.w}px`, height: `${d.h}px`,
        zIndex: String(depthOf(d.y)),
      })
      roomEl.append(img)
    }

    // One game's light over the whole room, on only while the monitor shows
    // that game (see setWorld). Above the crew as well as the plate: a wash
    // that stopped at the floor would leave five unlit figures standing in a
    // lit room. Under the bubbles, which are text.
    const wash = document.createElement('div')
    wash.className = 'garage__wash'
    wash.setAttribute('aria-hidden', 'true')
    roomEl.append(wash)
    const door = world.objects.find((o) => o.id === 'secret-door')
    if (door) {
      const spill = document.createElement('div')
      spill.className = 'garage__doorlight'
      spill.setAttribute('aria-hidden', 'true')
      Object.assign(spill.style, {
        left: `${door.rect.x - 55}px`,
        top: `${door.rect.y + door.rect.h - 30}px`,
        width: `${door.rect.w + 110}px`,
        height: '110px',
      })
      roomEl.append(spill)
    }

    // Zones are grouping in the data (src/data/world.ts), not elements: they
    // carry no pixels and no hit area, so nothing is built for them here.
    for (const obj of world.objects) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `thing thing--${obj.id}`
      el.dataset['object'] = obj.id
      el.setAttribute('aria-label', obj.label)
      // What it opens, said under the pointer. Sized against the camera's
      // scale like the bubbles, so it is 13px on every screen.
      const caption = document.createElement('span')
      caption.className = 'thing__label'
      caption.setAttribute('aria-hidden', 'true')
      caption.textContent = CAPTIONS[obj.id] ?? obj.label
      el.append(caption)
      // The hit region is looser than the object so it is comfortable to click;
      // the outline inside it is not, so it can trace the real thing.
      // The world is scaled to fit, so a hit area measured in world pixels can
      // land well under a fingertip on a phone. Grow it until it is at least
      // MIN_TOUCH on screen, and never let two things reach into each other.
      // Placed art gets the same fingertip guarantee: the hit area grows,
      // the picture inside it stays the size the data says.
      const pad = hitPadding(obj)
      Object.assign(el.style, {
        left: `${obj.rect.x - pad}px`,
        top: `${obj.rect.y - pad}px`,
        width: `${obj.rect.w + pad * 2}px`,
        height: `${obj.rect.h + pad * 2}px`,
        zIndex: String(Math.min(699, 100 + Math.round((obj.rect.y + obj.rect.h) / 8))),
      })

      if (obj.outline) {
        const d = OUTLINE_PATHS[obj.outline]
        // One path, two jobs: stroked as the outline, and the clip that keeps
        // the brightness lift the object's shape instead of a rectangle.
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('class', 'thing__outline')
        svg.setAttribute('viewBox', '0 0 1 1')
        svg.setAttribute('preserveAspectRatio', 'none')
        svg.setAttribute('aria-hidden', 'true')
        // The dark path is drawn first and slightly wider: on a cream fridge
        // against a cream wall, pure white alone dissolves. It is only there to
        // separate the white line from the wall and must not read as a border.
        svg.innerHTML =
          `<clipPath id="clip-${obj.id}" clipPathUnits="objectBoundingBox"><path d="${d}"/></clipPath>` +
          `<path class="thing__edge" d="${d}" vector-effect="non-scaling-stroke"/>` +
          `<path class="thing__stroke" d="${d}" vector-effect="non-scaling-stroke"/>`
        // An SVG is a replaced element: with height:auto it takes its own
        // aspect ratio and ignores the bottom inset, so both are set here.
        // The box is grown by OUTLINE_OFFSET so the line clears the artwork.
        svg.style.left = `${pad - OUTLINE_OFFSET}px`
        svg.style.top = `${pad - OUTLINE_OFFSET}px`
        svg.style.width = `${obj.rect.w + OUTLINE_OFFSET * 2}px`
        svg.style.height = `${obj.rect.h + OUTLINE_OFFSET * 2}px`
        el.append(svg)

        const lift = document.createElement('span')
        lift.className = 'thing__lift'
        lift.style.left = `${pad}px`
        lift.style.top = `${pad}px`
        lift.style.width = `${obj.rect.w}px`
        lift.style.height = `${obj.rect.h}px`
        lift.style.clipPath = `url(#clip-${obj.id})`
        el.append(lift)
      }

      if (obj.art) {
        // Not in the painting; this one is placed into the room.
        const art = document.createElement('img')
        art.className = 'thing__art thing__art--closed'
        art.src = obj.art
        art.alt = ''
        art.decoding = 'async'
        const fit = (img: HTMLImageElement): void => {
          Object.assign(img.style, {
            left: `${pad}px`, top: `${pad}px`, width: `${obj.rect.w}px`, height: `${obj.rect.h}px`,
          })
        }
        fit(art)
        el.append(art)
        if (obj.artOpen) {
          // Its open state, on the same canvas, so the swap moves nothing.
          const open = document.createElement('img')
          open.className = 'thing__art thing__art--open'
          open.src = obj.artOpen
          open.alt = ''
          open.decoding = 'async'
          fit(open)
          el.append(open)
          el.setAttribute('aria-pressed', String(opened.has(obj.id)))
          el.classList.toggle('is-open', opened.has(obj.id))
        }
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (obj.sfx) audio.play(obj.sfx)
        if (obj.action.kind === 'toggle') {
          // Nothing opens. The thing itself changes, and stays changed —
          // through a rebuild on rotation as well.
          const now = !opened.has(obj.id)
          if (now) opened.add(obj.id)
          else opened.delete(obj.id)
          el.classList.toggle('is-open', now)
          el.setAttribute('aria-pressed', String(now))
          // Opened: whoever is nearest and free comes over to see what is in it.
          if (now && obj.id === 'parcel') {
            const spot = navFor(world.height > world.width).points.find((p) => p.objectId === 'parcel')
            if (spot) {
              const cx = obj.rect.x + obj.rect.w / 2
              const free = crew
                .filter((c) => !c.away && (c.state === 'IDLE' || c.state === 'LOOK' || c.state === 'CHOOSE_TARGET' || c.state === 'INTERACT'))
                .sort((a, b) => Math.abs(a.at.x - cx) - Math.abs(b.at.x - cx))
              for (const one of free) if (Math.abs(one.at.x - cx) < 1100 && one.summon(spot)) break
            }
          }
          return
        }
        opts.onObject?.(obj)
      })
      // Touch has no hover, so the outline is shown while the finger is down.
      // A tap can be shorter than a frame or two, so the outline is held for a
      // moment: long enough to see what was chosen, short enough not to delay
      // the panel behind it.
      let pressedAt = 0
      el.addEventListener('pointerdown', () => {
        pressedAt = performance.now()
        el.classList.add('is-pressed')
      })
      const release = (): void => {
        if (!el.classList.contains('is-pressed')) return
        const left = MIN_PRESS - (performance.now() - pressedAt)
        if (left <= 0) el.classList.remove('is-pressed')
        else later(() => el.classList.remove('is-pressed'), left)
      }
      el.addEventListener('pointerup', release)
      el.addEventListener('pointercancel', release)
      el.addEventListener('pointerleave', release)
      roomEl.append(el)
    }

    // The painted window already has its own night sky and moon; a canvas over
    // it only added drifting light where the artwork wanted none.
    // One dokkaebi, built with the room so it lives in world space and the
    // camera carries it. Rebuilt with the room, so turning the phone cannot
    // leave a second one behind.
    for (const one of crew) one.destroy()
    crew = []
    crowd = null
    cast = null
    ambient?.destroy()
    ambient = null
    if (npcAllowed()) {
      // Whoever has rendered frames walks; the rest are still turnarounds and
      // would stand about instead. As their frames land they join the crew
      // without this line changing.
      // The portrait plate is the upper half of the workshop with a wall
      // below it, so its floor is a 710-unit strip against the landscape
      // room's 1,400. Five dokkaebi fit in it the way five people fit in a
      // lift. Three is the same room with room to move, and the ones left out
      // are not missing from a phone — the phone is a different composition.
      const portrait = world.height > world.width
      const all = CHARACTERS.filter((c) => spritesFor(c.id))
      const here = portrait ? all.slice(0, PHONE_CREW) : all
      const who = here[0] ?? CHARACTERS.find((c) => c.id === 'poko') ?? CHARACTERS[0]
      if (who) {
        // ?npc=debug draws the waypoints; ?npcseed=N pins the route so a test
        // can assert on it. Neither does anything unless it is asked for.
        const params = new URLSearchParams(location.search)
        const seed = Number(params.get('npcseed'))
        // The room's own small movements. Started after the crew, because the
        // priority floor is set from what they are doing.
        ambient = new Ambient()
        const stars = [...(lights.get('sky')?.querySelectorAll('.garage__star') ?? [])]
        const shooting = lights.get('shooting')
        const toggle = (id: string) => (on: boolean) =>
          lights.get(id)?.classList.toggle('is-lit', on)
        if (lights.size) {
          ambient.add({
            id: 'pcGlow', every: { min: 5000, max: 13000 }, duration: 2600,
            priority: ATTENTION.object, run: toggle('pc'),
          })
          ambient.add({
            id: 'tvStatic', every: { min: 18000, max: 46000 }, duration: 1400,
            priority: ATTENTION.object, restless: true,
            run: (on) => {
              toggle('tv')(on)
              bits.get('tvflicker')?.classList.toggle('is-live', on)
            },
          })
          for (const b of BITS) {
            ambient.add({
              id: b.id, every: b.every, duration: b.duration,
              priority: ATTENTION.background, restless: true,
              run: (on) => bits.get(b.id)?.classList.toggle('is-live', on),
            })
          }
          ambient.add({
            id: 'steam', every: { min: 16000, max: 40000 }, duration: 6500,
            priority: ATTENTION.background, restless: true,
            run: (on) => bits.get('steam')?.classList.toggle('is-live', on),
          })
          ambient.add({
            id: 'secretGlow', every: { min: 70000, max: 190000 }, duration: 2200,
            priority: ATTENTION.object, restless: true, run: toggle('secret'),
          })
          // Whichever star was lit has to be the one put out again, or they
          // accumulate and the window ends up fully lit.
          let twinkling: Element | undefined
          ambient.add({
            id: 'starTwinkle', every: { min: 6000, max: 15000 }, duration: 3000,
            priority: ATTENTION.background,
            run: (on) => {
              if (on) twinkling = stars[Math.floor(Math.random() * stars.length)]
              twinkling?.classList.toggle('is-bright', on)
              if (!on) twinkling = undefined
            },
          })
          ambient.add({
            // Rare on purpose. Two a minute is a screensaver, and one in the
            // first few seconds is an opening title.
            id: 'shootingStar', every: { min: 60000, max: 180000 }, duration: 1500,
            priority: ATTENTION.background, restless: true, notBefore: 45000,
            run: (on) => shooting?.classList.toggle('is-falling', on),
          })
          ambient.start()
        }
        // One crowd for the whole room: it holds the things that only make
        // sense between them — the walking budget, who has booked the fridge
        // door, how close two may stand, who may speak.
        crowd = new Crowd({ narrow: portrait })
        const onStage = portrait ? ON_STAGE.portrait : ON_STAGE.landscape
        crew = here.map((c, i) =>
          mountNpc(roomEl, c, portrait, {
            debug: params.get('npc') === 'debug',
            scale,
            crowd: crowd!,
            ready: plateReady,
            // The first few are in the room; the rest come in later.
            away: i >= onStage,
            // Spread round the cycle so five of them do not breathe in unison.
            phase: i / Math.max(here.length, 1),
            order: i,
            // Touching one stops it and makes it look up; the room's part is
            // to acknowledge that quietly. No bubble, no name tag, no panel —
            // the dokkaebi are not another menu.
            onTouch: (touched) => {
              audio.play('click', 0.22)
              save.update((d) => {
                if (!d.discoveredCharacters.includes(touched.id)) {
                  d.discoveredCharacters.push(touched.id)
                }
              })
            },
            // The seed pins one route, so it goes to the one the tests watch.
            ...(Number.isFinite(seed) && seed > 0 && i === 0
              ? { random: seededRandom(seed) }
              : {}),
          }))
        cast = new Stage(crew, { present: onStage })
        // Somebody notices the visitor coming in: whoever is nearest the
        // middle of the room, a moment after the door.
        const centre = world.start.x
        const welcome = [...crew]
          .filter((c) => !c.away)
          .sort((a, b) => Math.abs(a.at.x - centre) - Math.abs(b.at.x - centre))[0]
        if (welcome) later(() => welcome.greetVisitor(), 700)
        // The bench drops something now and then, and whoever is near jumps.
        if (!portrait && ambient) {
          const bench = pointNamed(navFor(false), 'workbench-a') ?? { x: 2116, y: 1006 }
          const gear = document.createElement('img')
          gear.className = 'garage__gear'
          gear.src = '/assets/images/garage/prop_gear.webp'
          gear.alt = ''
          gear.decoding = 'async'
          gear.style.left = `${bench.x + 70}px`
          gear.style.top = `${bench.y + 40}px`
          gear.style.zIndex = String(depthOf(bench.y + 40) + 1)
          roomEl.append(gear)
          ambient.add({
            id: 'gearDrop', every: { min: 45000, max: 95000 }, duration: 4200,
            priority: ATTENTION.object, restless: true, notBefore: 15000,
            run: (on) => {
              gear.classList.toggle('is-falling', on)
              if (!on) return
              later(() => {
                for (const one of crew) {
                  if (Math.abs(one.at.x - bench.x) <= 330) one.startle({ x: bench.x, y: bench.y - 200 })
                }
              }, 520)
            },
          })
        }
      }
    }

    built = true
  }

  /**
   * Padding around a thing's artwork, in world units. Starts at HIT_PADDING and
   * grows if the object would otherwise be smaller than a fingertip, but never
   * so far that it reaches a neighbour: a target that steals its neighbour's
   * taps is worse than a small one.
   */
  const hitPadding = (obj: WorldObject): number => {
    const shortest = Math.min(obj.rect.w, obj.rect.h)
    // Ceil, not round: half a pixel short of a fingertip is still short.
    const needed = Math.ceil((MIN_TOUCH / Math.max(scale, 0.01) - shortest) / 2)
    let want = Math.min(Math.max(HIT_PADDING, needed), MAX_HIT_PADDING)
    for (const other of world.objects) {
      if (other === obj) continue
      const gapX =
        Math.max(obj.rect.x, other.rect.x) -
        Math.min(obj.rect.x + obj.rect.w, other.rect.x + other.rect.w)
      const gapY =
        Math.max(obj.rect.y, other.rect.y) -
        Math.min(obj.rect.y + obj.rect.h, other.rect.y + other.rect.h)
      // Only a neighbour that overlaps on the other axis can actually collide.
      if (gapX < 0 && gapY >= 0) want = Math.min(want, Math.floor(gapY / 2))
      if (gapY < 0 && gapX >= 0) want = Math.min(want, Math.floor(gapX / 2))
    }
    return Math.max(0, want)
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  const layout = (): void => {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const portrait = r.height > r.width
    const next = worldFor(portrait)
    // The first layout must build even when the starting world happens to be
    // the one it computes, or the room stays empty.
    const changed = next !== world || !built
    world = next
    scene.dataset['orientation'] = portrait ? 'portrait' : 'landscape'

    // Fit the short axis: a wide room fills the height, a tall room the width,
    // so there is never an empty margin to look at.
    scale = portrait ? r.width / world.width : r.height / world.height
    viewW = r.width / scale
    viewH = r.height / scale
    stage.style.setProperty('--scale', String(scale))

    if (changed) {
      build()
      camera.resize({
        worldWidth: world.width,
        worldHeight: world.height,
        viewWidth: r.width / scale,
        viewHeight: r.height / scale,
      })
      camera.snapTo(world.start.x, world.start.y)
    } else {
      camera.resize({
        worldWidth: world.width,
        worldHeight: world.height,
        viewWidth: r.width / scale,
        viewHeight: r.height / scale,
      })
    }
    draw()
  }

  const draw = (): void => {
    const x = -camera.viewX * scale
    const y = -camera.viewY * scale
    roomEl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
  }

  /**
   * Tell the crew who is in shot.
   *
   * This is not a performance measure — five sprites are nothing. It is that
   * on a phone the room is a long strip and most of the crew is off the side
   * of the screen, where writing their transform every frame buys the visitor
   * nothing. They keep thinking and keep their place in the world; a dokkaebi
   * that walked out of view and was deleted would have to be invented again
   * when the camera came back, and it would be somewhere it had never been.
   */
  const OFFSCREEN_MARGIN = 280
  const cull = (): void => {
    if (crew.length === 0 || viewW === 0) return
    const x0 = camera.viewX - OFFSCREEN_MARGIN
    const x1 = camera.viewX + viewW + OFFSCREEN_MARGIN
    const y0 = camera.viewY - OFFSCREEN_MARGIN
    const y1 = camera.viewY + viewH + OFFSCREEN_MARGIN
    for (const one of crew) {
      const p = one.at
      one.setOnscreen(p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1)
    }
  }

  // ── Movement ─────────────────────────────────────────────────────────────
  let dragging = false
  let dragId = -1
  let lastX = 0
  let lastY = 0
  let moved = 0
  /** Set only when a drag actually travelled, cleared as soon as it is used. */
  let swallowClick = false

  const onDown = (e: PointerEvent): void => {
    if (paused || e.button !== 0) return
    dragging = true
    dragId = e.pointerId
    lastX = e.clientX
    lastY = e.clientY
    moved = 0
    swallowClick = false
    scene.classList.add('is-dragging')
  }
  const onMove = (e: PointerEvent): void => {
    if (!dragging || e.pointerId !== dragId) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    moved += Math.abs(dx) + Math.abs(dy)
    if (moved > 12) swallowClick = true
    camera.moveBy(-dx / scale, -dy / scale)
  }
  const endDrag = (): void => {
    dragging = false
    dragId = -1
    moved = 0
    scene.classList.remove('is-dragging')
  }
  // A drag that travelled must not also count as a click on whatever was under
  // the finger when it stopped. The flag is one-shot: leaving a distance
  // hanging around would swallow the next honest click as well.
  const onClickCapture = (e: MouseEvent): void => {
    if (!swallowClick) return
    swallowClick = false
    e.stopPropagation()
    e.preventDefault()
  }

  const onWheel = (e: WheelEvent): void => {
    if (paused) return
    e.preventDefault()
    const portrait = scene.dataset['orientation'] === 'portrait'
    // A plain wheel should move the way the room runs.
    const dx = e.deltaX || (portrait ? 0 : e.deltaY)
    const dy = portrait ? e.deltaY : e.deltaY && e.deltaX ? e.deltaY : 0
    camera.moveBy(dx / scale, dy / scale)
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase()
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      keys.add(k)
      e.preventDefault()
    }
  }
  const onKeyUp = (e: KeyboardEvent): void => {
    keys.delete(e.key.toLowerCase())
  }

  // Keyboard: focus landing on a thing outside the view brings the camera to
  // it, since the stage itself can no longer be scrolled there.
  const onFocusIn = (e: FocusEvent): void => {
    const t = e.target as HTMLElement | null
    if (!t?.classList.contains('thing') || paused) return
    const id = t.dataset['object']
    const obj = world.objects.find((o) => o.id === id)
    if (!obj) return
    const cx = obj.rect.x + obj.rect.w / 2
    const cy = obj.rect.y + obj.rect.h / 2
    const inView =
      cx >= camera.viewX + 40 && cx <= camera.viewX + viewW - 40 &&
      cy >= camera.viewY + 40 && cy <= camera.viewY + viewH - 40
    if (!inView) camera.moveTo(cx, cy)
  }
  roomEl.addEventListener('focusin', onFocusIn)
  off.push(() => roomEl.removeEventListener('focusin', onFocusIn))

  scene.addEventListener('pointerdown', onDown)
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerup', endDrag)
  addEventListener('pointercancel', endDrag)
  scene.addEventListener('click', onClickCapture, true)
  scene.addEventListener('wheel', onWheel, { passive: false })
  addEventListener('keydown', onKeyDown)
  addEventListener('keyup', onKeyUp)
  off.push(() => {
    scene.removeEventListener('pointerdown', onDown)
    removeEventListener('pointermove', onMove)
    removeEventListener('pointerup', endDrag)
    removeEventListener('pointercancel', endDrag)
    scene.removeEventListener('click', onClickCapture, true)
    scene.removeEventListener('wheel', onWheel)
    removeEventListener('keydown', onKeyDown)
    removeEventListener('keyup', onKeyUp)
  })

  // ── Frame ────────────────────────────────────────────────────────────────
  off.push(
    ticker.subscribe((info) => {
      // Paused stops the visitor driving; it must not stop the camera, or a
      // focus requested as a panel opens would never actually travel.
      //
      // Ambience gives way to whoever is walking: two things worth watching
      // at once is one thing too many.
      // Ambience gives way to the crew: with five of them there is nearly
      // always somebody moving, so the floor is set by how much is going on
      // rather than by any one of them.
      ambient?.setAttention(paused
        ? ATTENTION.interaction
        : crowd?.attention({ crew: ATTENTION.crew, object: ATTENTION.object }) ?? 0)
      crowd?.step(Math.min(info.delta, 64))
      if (!paused) cast?.step(Math.min(info.delta, 64))
      cull()
      if (!paused && keys.size) {
        const step = (KEY_PAN * info.delta) / 1000
        let dx = 0
        let dy = 0
        if (keys.has('arrowleft') || keys.has('a')) dx -= step
        if (keys.has('arrowright') || keys.has('d')) dx += step
        if (keys.has('arrowup') || keys.has('w')) dy -= step
        if (keys.has('arrowdown') || keys.has('s')) dy += step
        if (dx || dy) camera.moveBy(dx, dy)
      }
      if (camera.update(info.delta)) draw()
    }, 20),
  )

  layout()
  const onResize = (): void => layout()
  addEventListener('resize', onResize, { passive: true })
  addEventListener('orientationchange', onResize, { passive: true })
  off.push(() => removeEventListener('resize', onResize))
  off.push(() => removeEventListener('orientationchange', onResize))
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => layout())
    ro.observe(scene)
    off.push(() => ro.disconnect())
  }

  // Touch has no cursor to change, so the first visit of a session says once,
  // quietly, that the room answers. Never twice, and never on a pointer that
  // can hover.
  const HINT_KEY = 'eungarage:garageHinted'
  const coarse = matchMedia('(pointer: coarse)').matches
  let hinted = true
  try {
    hinted = sessionStorage.getItem(HINT_KEY) === 'true'
  } catch {
    hinted = true // storage refused: say nothing rather than say it every time
  }
  if (coarse && !hinted) {
    try {
      sessionStorage.setItem(HINT_KEY, 'true')
    } catch {
      /* nothing to do */
    }
    const hint = document.createElement('p')
    hint.className = 'garage__hint'
    hint.textContent = '물건을 눌러 둘러보세요'
    scene.append(hint)
    requestAnimationFrame(() => hint.classList.add('is-in'))
    later(() => hint.classList.remove('is-in'), 2600)
    later(() => hint.remove(), 3200)
  }

  log.debug('garage: mounted')

  return {
    setPaused(v: boolean): void {
      paused = v
      if (v) keys.clear()
      scene.classList.toggle('is-paused', v)
    },
    focusObject(id: string): void {
      const obj = world.objects.find((o) => o.id === id)
      if (!obj) return
      // Remember where the visitor was looking before we moved them.
      if (parked === null) parked = { x: camera.x, y: camera.y }
      // On a wide screen the monitor's panel stands to the right of the room
      // (immersive.css), so the camera aims a little right of the PC and
      // leaves the PC itself in the half that stays visible.
      const aside = id === 'pc' && scene.clientWidth >= 1000 ? viewW * 0.24 : 0
      camera.moveTo(obj.rect.x + obj.rect.w / 2 + aside, obj.rect.y + obj.rect.h / 2)
    },
    setWorld(w: string | null): void {
      if (w) scene.dataset['world'] = w
      else delete scene.dataset['world']
    },
    restoreCamera(): void {
      if (!parked) return
      camera.moveTo(parked.x, parked.y)
      parked = null
    },
    get world(): WorldLayout {
      return world
    },
    get crew(): readonly NpcHandle[] {
      return crew
    },
    get npc(): NpcHandle | null {
      return crew[0] ?? null
    },
    destroy(): void {
      for (const one of crew) one.destroy()
      ambient?.destroy()
      crew = []
      crowd = null
      for (const t of timers) clearTimeout(t)
      timers.clear()
      for (const fn of off) fn()
      off.length = 0
    },
  }
}
