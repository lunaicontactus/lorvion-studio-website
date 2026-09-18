/**
 * A painted place the camera moves inside of (PHASE 9/12).
 *
 * The playground and the archive are built the way the garage is built: one
 * painted plate larger than the window, a camera that moves inside it, and
 * hit areas over the places that are already in the painting. This is that,
 * once: the plate, the camera with its drag, wheel, keys and focus-follow,
 * the places with their rings and labels, and the foreground plate over
 * everything (the user's own, with pointer events off so it can never take
 * a touch). What a particular place adds — fires, stars, a lantern's light —
 * it adds through `decorate`, into the same world element, so it moves with
 * the camera like everything else.
 */
import { Camera } from '@/systems/camera'
import { loadImage } from '@/systems/assets'
import { ticker } from '@/systems/tick'
import { motion } from '@/systems/motion'
import { log } from '@/systems/log'

export interface ScenePlace {
  readonly id: string
  /** The accessible name. */
  readonly label: string
  /** What the label under the pointer says. */
  readonly caption: string
  readonly rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
}

export interface SceneLayout {
  readonly width: number
  readonly height: number
  readonly plate: string
  readonly foreground: string
  /** Where the camera starts. */
  readonly start: { readonly x: number; readonly y: number }
  readonly places: readonly ScenePlace[]
}

export interface SceneOptions<L extends SceneLayout> {
  /** The section, its stage and its world, by attribute. */
  readonly root: string
  readonly layoutFor: (portrait: boolean) => L
  /** The class the places carry (`.spot` everywhere, for the shared styles). */
  readonly spotClass?: string
  /** A place was touched. The host decides what that means. */
  readonly onPlace?: (place: L['places'][number]) => void
  /** What this place adds to the world, built with it. Returns a teardown. */
  readonly decorate?: (world: HTMLElement, layout: L, tools: SceneTools) => (() => void) | void
}

/** What a decoration may ask of the scene. */
export interface SceneTools {
  readonly later: (fn: () => void, ms: number) => void
  readonly scale: () => number
}

export interface SceneHandle<L extends SceneLayout> {
  /** Stop reacting while something is open over it. */
  setPaused(v: boolean): void
  /** Put a place in the middle of the view. */
  focusPlace(id: string): void
  /** Ease the camera by a little, for a drift. */
  driftTo(x: number, y: number): void
  /** Where the camera is looking. */
  readonly at: { readonly x: number; readonly y: number }
  /** Put the camera back where the visitor had left it. */
  restoreCamera(): void
  /** Where a place is on screen right now. */
  screenRectOf(id: string): DOMRect | null
  /** A place the visitor has open: it is ringed and its label stays up. */
  setActive(id: string | null): void
  readonly layout: L
  readonly world: HTMLElement
  /** Resolves when the plate is here. */
  readonly ready: Promise<unknown>
  destroy(): void
}

const KEY_PAN = 620
const MIN_PRESS = 150
/** The smallest a place may be on screen before its hit area is grown, in CSS px. */
const MIN_TOUCH = 44
const HIT_PADDING = 10
const MAX_HIT_PADDING = 60

export function mountScene<L extends SceneLayout>(root: ParentNode, opts: SceneOptions<L>): SceneHandle<L> | null {
  const scene = root.querySelector<HTMLElement>(`[data-${opts.root}]`)
  const stage = scene?.querySelector<HTMLElement>(`[data-${opts.root}-stage]`)
  const worldEl = scene?.querySelector<HTMLElement>(`[data-${opts.root}-world]`)
  if (!scene || !stage || !worldEl) return null
  const spotClass = opts.spotClass ?? 'spot'

  const off: (() => void)[] = []
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const later = (fn: () => void, ms: number): void => {
    const t = setTimeout(() => { timers.delete(t); fn() }, ms)
    timers.add(t)
  }
  const camera = new Camera(motion.reduced ? 1 : 0.16)
  let layout: L = opts.layoutFor(false)
  let undecorate: (() => void) | null = null
  let scale = 1
  let viewW = 0
  let viewH = 0
  let built = false
  let paused = false
  let parked: { x: number; y: number } | null = null
  let ready: Promise<unknown> = Promise.resolve()
  const keys = new Set<string>()

  const hitPadding = (p: ScenePlace): number => {
    const shortest = Math.min(p.rect.w, p.rect.h)
    const needed = Math.ceil((MIN_TOUCH / Math.max(scale, 0.01) - shortest) / 2)
    return Math.max(0, Math.min(Math.max(HIT_PADDING, needed), MAX_HIT_PADDING))
  }

  const build = (): void => {
    undecorate?.()
    undecorate = null
    worldEl.textContent = ''
    worldEl.style.width = `${layout.width}px`
    worldEl.style.height = `${layout.height}px`
    worldEl.style.backgroundImage = `url('${layout.plate}')`
    ready = loadImage(layout.plate)

    for (const p of layout.places) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `${spotClass} ${spotClass}--${p.id}`
      el.dataset['place'] = p.id
      el.setAttribute('aria-label', p.label)
      const pad = hitPadding(p)
      Object.assign(el.style, {
        left: `${p.rect.x - pad}px`, top: `${p.rect.y - pad}px`,
        width: `${p.rect.w + pad * 2}px`, height: `${p.rect.h + pad * 2}px`,
      })
      const ring = document.createElement('span')
      ring.className = 'spot__ring'
      ring.setAttribute('aria-hidden', 'true')
      Object.assign(ring.style, { left: `${pad}px`, top: `${pad}px`, width: `${p.rect.w}px`, height: `${p.rect.h}px` })
      el.append(ring)
      const caption = document.createElement('span')
      caption.className = 'spot__label'
      caption.setAttribute('aria-hidden', 'true')
      caption.textContent = p.caption
      el.append(caption)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (paused) return
        opts.onPlace?.(p as L['places'][number])
      })
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
      worldEl.append(el)
    }

    undecorate = opts.decorate?.(worldEl, layout, { later, scale: () => scale }) ?? null

    // The foreground: the user's own plate over everything, bottom-anchored,
    // never a pointer target.
    const front = document.createElement('img')
    front.className = `${opts.root}__front`
    front.src = layout.foreground
    front.alt = ''
    front.decoding = 'async'
    front.setAttribute('aria-hidden', 'true')
    front.style.width = `${layout.width}px`
    worldEl.append(front)
    built = true
  }

  const layoutAll = (): void => {
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return
    const portrait = r.height > r.width
    const next = opts.layoutFor(portrait)
    const changed = next !== layout || !built
    layout = next
    scene.dataset['orientation'] = portrait ? 'portrait' : 'landscape'
    // Fit the short axis, as the garage does; on a wide window the plate
    // fills the height and the camera pans along it.
    scale = portrait ? r.width / layout.width : r.height / layout.height
    // Never letterbox: if the other axis would fall short, cover instead.
    if (portrait && layout.height * scale < r.height) scale = r.height / layout.height
    if (!portrait && layout.width * scale < r.width) scale = r.width / layout.width
    viewW = r.width / scale
    viewH = r.height / scale
    stage.style.setProperty('--scale', String(scale))
    if (changed) {
      build()
      camera.resize({ worldWidth: layout.width, worldHeight: layout.height, viewWidth: viewW, viewHeight: viewH })
      camera.snapTo(layout.start.x, layout.start.y)
    } else {
      camera.resize({ worldWidth: layout.width, worldHeight: layout.height, viewWidth: viewW, viewHeight: viewH })
    }
    draw()
  }

  const draw = (): void => {
    worldEl.style.transform = `translate3d(${-camera.viewX * scale}px, ${-camera.viewY * scale}px, 0) scale(${scale})`
  }

  // ── Movement: drag, wheel, keys, and focus ──────────────────────────────
  let dragging = false
  let dragId = -1
  let lastX = 0
  let lastY = 0
  let moved = 0
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
    const dx = e.deltaX || (portrait ? 0 : e.deltaY)
    const dy = portrait ? e.deltaY : e.deltaY && e.deltaX ? e.deltaY : 0
    camera.moveBy(dx / scale, dy / scale)
  }
  const onKeyDown = (e: KeyboardEvent): void => {
    if (scene.hidden || paused) return
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
  const onFocusIn = (e: FocusEvent): void => {
    const t = e.target as HTMLElement | null
    if (!t?.classList.contains(spotClass) || paused) return
    const p = layout.places.find((q) => q.id === t.dataset['place'])
    if (!p) return
    const cx = p.rect.x + p.rect.w / 2
    const cy = p.rect.y + p.rect.h / 2
    const inView = cx >= camera.viewX + 40 && cx <= camera.viewX + viewW - 40
      && cy >= camera.viewY + 40 && cy <= camera.viewY + viewH - 40
    if (!inView) camera.moveTo(cx, cy)
  }
  scene.addEventListener('pointerdown', onDown)
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerup', endDrag)
  addEventListener('pointercancel', endDrag)
  scene.addEventListener('click', onClickCapture, true)
  scene.addEventListener('wheel', onWheel, { passive: false })
  addEventListener('keydown', onKeyDown)
  addEventListener('keyup', onKeyUp)
  worldEl.addEventListener('focusin', onFocusIn)
  off.push(() => {
    scene.removeEventListener('pointerdown', onDown)
    removeEventListener('pointermove', onMove)
    removeEventListener('pointerup', endDrag)
    removeEventListener('pointercancel', endDrag)
    scene.removeEventListener('click', onClickCapture, true)
    scene.removeEventListener('wheel', onWheel)
    removeEventListener('keydown', onKeyDown)
    removeEventListener('keyup', onKeyUp)
    worldEl.removeEventListener('focusin', onFocusIn)
  })

  off.push(ticker.subscribe((info) => {
    if (scene.hidden) return
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
  }, 20))

  layoutAll()
  const onResize = (): void => layoutAll()
  addEventListener('resize', onResize, { passive: true })
  addEventListener('orientationchange', onResize, { passive: true })
  off.push(() => removeEventListener('resize', onResize))
  off.push(() => removeEventListener('orientationchange', onResize))
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => layoutAll())
    ro.observe(scene)
    off.push(() => ro.disconnect())
  }
  log.debug(`${opts.root}: mounted`)

  return {
    setPaused(v: boolean): void {
      paused = v
      if (v) keys.clear()
      scene.classList.toggle('is-paused', v)
    },
    focusPlace(id: string): void {
      const p = layout.places.find((q) => q.id === id)
      if (!p) return
      if (parked === null) parked = { x: camera.x, y: camera.y }
      camera.moveTo(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2)
    },
    driftTo(x: number, y: number): void {
      camera.moveTo(x, y)
    },
    get at(): { x: number; y: number } {
      return { x: camera.x, y: camera.y }
    },
    restoreCamera(): void {
      if (!parked) return
      camera.moveTo(parked.x, parked.y)
      parked = null
    },
    screenRectOf(id: string): DOMRect | null {
      return worldEl.querySelector(`[data-place="${id}"]`)?.getBoundingClientRect() ?? null
    },
    setActive(id: string | null): void {
      for (const el of worldEl.querySelectorAll<HTMLElement>(`.${spotClass}`)) {
        el.classList.toggle('is-active', el.dataset['place'] === id)
      }
    },
    get layout(): L {
      return layout
    },
    get world(): HTMLElement {
      return worldEl
    },
    get ready(): Promise<unknown> {
      return ready
    },
    destroy(): void {
      undecorate?.()
      undecorate = null
      for (const t of timers) clearTimeout(t)
      timers.clear()
      for (const fn of off) fn()
      off.length = 0
    },
  }
}
