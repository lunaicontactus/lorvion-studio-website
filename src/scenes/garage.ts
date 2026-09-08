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
import { worldFor, ROOM_ART } from '@/data/world'
import { OUTLINE_PATHS, HIT_PADDING, OUTLINE_OFFSET } from '@/data/outlines'
import { ticker } from '@/systems/tick'
import { motion } from '@/systems/motion'
import { audio } from '@/systems/audio'
import { log } from '@/systems/log'
import type { WorldLayout, WorldObject } from '@/types/world'

export interface GarageHandle {
  /** Stop reacting while a panel is open, so the room does not slide behind it. */
  setPaused(v: boolean): void
  /** Fast travel: put an object in the middle of the view. */
  focusObject(id: string): void
  /** Put the camera back where the visitor had left it. */
  restoreCamera(): void
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
  /** Where the visitor was looking before an object took the camera. */
  let parked: { x: number; y: number } | null = null
  let world: WorldLayout = worldFor(false)
  let scale = 1
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

    // Zones are grouping in the data (src/data/world.ts), not elements: they
    // carry no pixels and no hit area, so nothing is built for them here.
    for (const obj of world.objects) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `thing thing--${obj.id}`
      el.dataset['object'] = obj.id
      el.setAttribute('aria-label', obj.label)
      // The hit region is looser than the object so it is comfortable to click;
      // the outline inside it is not, so it can trace the real thing.
      // The world is scaled to fit, so a hit area measured in world pixels can
      // land well under a fingertip on a phone. Grow it until it is at least
      // MIN_TOUCH on screen, and never let two things reach into each other.
      const pad = obj.art ? 0 : hitPadding(obj)
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
        art.className = 'thing__art'
        art.src = obj.art
        art.alt = ''
        art.decoding = 'async'
        el.append(art)
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (obj.sfx) audio.play(obj.sfx)
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
    built = true
  }

  /**
   * Padding around a thing's artwork, in world units. Starts at HIT_PADDING and
   * grows if the object would otherwise be smaller than a fingertip, but never
   * so far that it reaches a neighbour: a target that steals its neighbour's
   * taps is worse than a small one.
   */
  const hitPadding = (obj: WorldObject): number => {
    let pad = HIT_PADDING
    const shortest = Math.min(obj.rect.w, obj.rect.h)
    const needed = (MIN_TOUCH / Math.max(scale, 0.01) - shortest) / 2
    if (needed > pad) pad = Math.min(needed, MAX_HIT_PADDING)
    for (const other of world.objects) {
      if (other === obj) continue
      const gapX =
        Math.max(obj.rect.x, other.rect.x) -
        Math.min(obj.rect.x + obj.rect.w, other.rect.x + other.rect.w)
      const gapY =
        Math.max(obj.rect.y, other.rect.y) -
        Math.min(obj.rect.y + obj.rect.h, other.rect.y + other.rect.h)
      // Only a neighbour that overlaps on the other axis can actually collide.
      if (gapX < 0 && gapY >= 0) pad = Math.min(pad, gapY / 2)
      if (gapY < 0 && gapX >= 0) pad = Math.min(pad, gapX / 2)
    }
    return Math.max(0, Math.round(pad))
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
      camera.moveTo(obj.rect.x + obj.rect.w / 2, obj.rect.y + obj.rect.h / 2)
    },
    restoreCamera(): void {
      if (!parked) return
      camera.moveTo(parked.x, parked.y)
      parked = null
    },
    get world(): WorldLayout {
      return world
    },
    destroy(): void {
      for (const t of timers) clearTimeout(t)
      timers.clear()
      for (const fn of off) fn()
      off.length = 0
    },
  }
}
