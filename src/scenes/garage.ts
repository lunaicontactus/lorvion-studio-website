/**
 * The garage: a room larger than the window you look at it through.
 *
 * The world is a fixed coordinate space (see src/data/world.ts). The camera
 * moves inside it — drag, arrows, WASD, wheel — and everything in the room is
 * positioned from the same coordinates, so a hit area can never drift off the
 * thing it belongs to, whatever the window does.
 *
 * The furniture is drawn from those rectangles in CSS rather than painted into
 * a background image, which is what lets the room be bigger than the screen
 * without a single enormous asset, and what keeps the crew able to walk behind
 * the desk and in front of the rug.
 */
import { Camera } from '@/systems/camera'
import { Crew, type Npc } from '@/scenes/npc'
import { mountWindowSky } from '@/scenes/window'
import { worldFor } from '@/data/world'
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
  readonly world: WorldLayout
  destroy(): void
}

export interface GarageOptions {
  /** Asked to leave by the door. */
  readonly onExit?: () => void
  /** A thing was touched; the host decides what panel that means. */
  readonly onObject?: (object: WorldObject) => void
  readonly onNpc?: (npc: Npc) => void
}

const KEY_PAN = 620 // world units per second under the keyboard

export function mountGarage(root: ParentNode = document, opts: GarageOptions = {}): GarageHandle | null {
  const scene = root.querySelector<HTMLElement>('[data-garage]')
  if (!scene) return null

  const stage = scene.querySelector<HTMLElement>('[data-garage-stage]')
  const roomEl = scene.querySelector<HTMLElement>('[data-garage-room]')
  const crewLayer = scene.querySelector<HTMLElement>('[data-garage-crew]')
  if (!stage || !roomEl || !crewLayer) return null

  const off: (() => void)[] = []
  const camera = new Camera(motion.reduced ? 1 : 0.16)
  let world: WorldLayout = worldFor(false)
  let scale = 1
  let built = false
  let paused = false
  let offSky: (() => void) | null = null
  const keys = new Set<string>()

  const crew = new Crew(crewLayer, (npc) => opts.onNpc?.(npc))

  // ── Room construction ────────────────────────────────────────────────────
  // One pass builds every zone and object as an element sized in world units;
  // after that only transforms change, so panning never touches layout.
  const build = (): void => {
    roomEl.textContent = ''
    roomEl.style.width = `${world.width}px`
    roomEl.style.height = `${world.height}px`

    for (const zone of world.zones) {
      const el = document.createElement('div')
      el.className = `zone zone--${zone.id}`
      el.dataset['zone'] = zone.id
      Object.assign(el.style, {
        left: `${zone.rect.x}px`,
        top: `${zone.rect.y}px`,
        width: `${zone.rect.w}px`,
        height: `${zone.rect.h}px`,
      })
      roomEl.append(el)
    }

    for (const obj of world.objects) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `thing thing--${obj.id}`
      el.dataset['object'] = obj.id
      el.setAttribute('aria-label', obj.label)
      Object.assign(el.style, {
        left: `${obj.rect.x}px`,
        top: `${obj.rect.y}px`,
        width: `${obj.rect.w}px`,
        height: `${obj.rect.h}px`,
        zIndex: String(Math.min(699, 100 + Math.round((obj.rect.y + obj.rect.h) / 8))),
      })
      const face = document.createElement('span')
      face.className = 'thing__face'
      el.append(face)
      const hint = document.createElement('span')
      hint.className = 'thing__hint'
      hint.setAttribute('aria-hidden', 'true')
      el.append(hint)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (obj.sfx) audio.play(obj.sfx)
        opts.onObject?.(obj)
      })
      roomEl.append(el)
    }
    // The window belongs to the room: built here so a rebuild cannot orphan it.
    offSky?.()
    offSky = null
    const win = document.createElement('div')
    win.className = 'garage__window'
    Object.assign(win.style, {
      left: `${world.window.x}px`,
      top: `${world.window.y}px`,
      width: `${world.window.w}px`,
      height: `${world.window.h}px`,
    })
    const canvas = document.createElement('canvas')
    win.append(canvas)
    roomEl.append(win)
    offSky = mountWindowSky(canvas)

    crew.build(world)
    built = true
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
    crew.render(camera.viewX, camera.viewY, scale)
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
      if (paused) return
      if (keys.size) {
        const step = (KEY_PAN * info.delta) / 1000
        let dx = 0
        let dy = 0
        if (keys.has('arrowleft') || keys.has('a')) dx -= step
        if (keys.has('arrowright') || keys.has('d')) dx += step
        if (keys.has('arrowup') || keys.has('w')) dy -= step
        if (keys.has('arrowdown') || keys.has('s')) dy += step
        if (dx || dy) camera.moveBy(dx, dy)
      }
      const cameraMoved = camera.update(info.delta)
      if (!motion.reduced) crew.update(info.delta, info.now)
      if (cameraMoved || !motion.reduced) draw()
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
      camera.moveTo(obj.rect.x + obj.rect.w / 2, obj.rect.y + obj.rect.h / 2)
    },
    get world(): WorldLayout {
      return world
    },
    destroy(): void {
      offSky?.()
      offSky = null
      for (const fn of off) fn()
      off.length = 0
    },
  }
}
