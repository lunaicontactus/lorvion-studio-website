/**
 * The Korean alley — the prologue to the garage, not a landing page.
 *
 * At rest the lane is quietly alive: the sign sways, the lamp breathes, the
 * and now and then one thing left on the pavement shifts a hair. Never two
 * at once, never anything big.
 *
 * ENTER is a way in, not a link. Something bumps inside, the lamp flickers,
 * the shutter hesitates and then rolls up, warm light spills out, a small
 * shadow crosses the doorway, and the camera pushes through. The scene ends
 * on a warm interior wash — the surface the garage (STEP 3) takes over from.
 *
 * The base plate is cover-fitted, so every layer is placed in percentages of
 * the box the base actually occupies; see src/data/alley.ts.
 */
import {
  ALLEY_LANDSCAPE,
  ALLEY_PORTRAIT,
  ALLEY_ART,
  PROP_NAMES,
  type AlleyPlate,
  type LayerPlacement,
} from '@/data/alley'
import { motion } from '@/systems/motion'
import { ticker } from '@/systems/tick'
import { log } from '@/systems/log'

export type AlleyPhase = 'idle' | 'entering' | 'inside'

export interface AlleyOptions {
  /** Called once the camera is through the door and the wash is up. */
  readonly onEntered?: () => void
  /**
   * Each beat of the entrance as it happens, by name (PHASE 7): the host
   * plays the shutter on `rise` and brings the room's sound up on `light`,
   * so the sound is on the picture and not on the click.
   */
  readonly onBeat?: (beat: keyof typeof BEATS | 'enter' | 'skip') => void
  /**
   * Whether the room behind the door is ready to be shown. If it is not by
   * the time the camera is through, the entrance says so — one short line,
   * no progress bar — and finishes when it is. Never invented: with the
   * plate already here the line is never shown at all.
   */
  readonly ready?: () => Promise<unknown> | null
  /**
   * A visitor who has been here before gets the short version: the same
   * door, opened in a second rather than two and a bit. Read at ENTER, so
   * a first visit that leaves and comes back through the alley is short the
   * second time.
   */
  readonly returning?: () => boolean
}

/**
 * The entrance beats, in milliseconds after the click: the lock knocks, the
 * lamp catches, the shutter hesitates and then goes up, the light comes on
 * inside, and the camera moves through the door.
 *
 * The whole thing is 2.3 seconds. It was 3.15, which is fine the first time
 * and tiresome the fifth: this is a door, not a title sequence.
 */
const BEATS = {
  bump: 0,
  flicker: 180,
  hesitate: 420,
  rise: 640,
  light: 1150,
  /** Somebody looks round the door frame, once the shutter is clear of it. */
  peek: 1300,
  push: 1550,
  inside: 2300,
} as const

/**
 * The same beats for somebody who has seen them (PHASE 7): no knock, no
 * hesitation, the shutter straight up and through in just over a second.
 * The stylesheet's `alley--quick` shortens the transitions to match.
 */
const QUICK: Record<keyof typeof BEATS, number> = {
  bump: 0, flicker: 0, hesitate: 0, rise: 40, light: 300, peek: 380, push: 520, inside: 1100,
}

/** How long the entrance will wait for the room before going in anyway. */
const READY_CAP_MS = 8000

export function mountAlley(root: ParentNode = document, opts: AlleyOptions = {}): () => void {
  const scene = root.querySelector<HTMLElement>('[data-alley]')
  if (!scene) return () => undefined

  const plateEl = scene.querySelector<HTMLElement>('[data-alley-plate]')
  const baseImg = scene.querySelector<HTMLImageElement>('[data-alley-base]')
  const enterBtn = scene.querySelector<HTMLButtonElement>('[data-alley-enter]')
  const skipBtn = scene.querySelector<HTMLButtonElement>('[data-alley-skip]')
  const loadingEl = scene.querySelector<HTMLElement>('[data-alley-loading]')

  const timers = new Set<ReturnType<typeof setTimeout>>()
  const off: (() => void)[] = []
  let phase: AlleyPhase = 'idle'

  const later = (fn: () => void, ms: number): void => {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }
  const setPhase = (next: AlleyPhase): void => {
    phase = next
    scene.dataset['phase'] = next
  }
  setPhase('idle')

  // ── Plate ────────────────────────────────────────────────────────────────
  const layout = (): void => {
    if (!plateEl) return
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return

    // Follow the plate the browser chose; a second opinion of our own would
    // eventually disagree with <picture> and misplace the shutter.
    const portrait = baseImg?.naturalWidth
      ? baseImg.naturalWidth < baseImg.naturalHeight
      : r.height >= r.width
    const plate: AlleyPlate = portrait ? ALLEY_PORTRAIT : ALLEY_LANDSCAPE
    const ratio = plate.base.w / plate.base.h
    const w = Math.max(r.width, r.height * ratio)
    const h = w / ratio

    plateEl.style.width = `${w}px`
    plateEl.style.height = `${h}px`
    // The camera pushes towards the doorway, so the plate scales about it.
    plateEl.style.transformOrigin = `${plate.doorway.x}% ${plate.doorway.y}%`
    scene.dataset['orientation'] = portrait ? 'portrait' : 'landscape'

    const place = (el: HTMLElement | null, p: LayerPlacement, art: { w: number; h: number }): void => {
      if (!el) return
      const px = (w * p.width) / 100
      el.style.left = `${p.left}%`
      el.style.width = `${p.width}%`
      el.style.height = `${(px * art.h) / art.w}px`
      if (p.top !== undefined) {
        el.style.top = `${p.top}%`
        el.style.bottom = 'auto'
      } else {
        el.style.bottom = `${p.bottom ?? 0}%`
        el.style.top = 'auto'
      }
    }
    const shutterEl = scene.querySelector<HTMLElement>('[data-alley-layer="shutter"]')
    place(shutterEl, plate.shutter, ALLEY_ART.shutter)
    shutterEl?.style.setProperty('--drum', `${ALLEY_ART.shutter.drum * 100}%`)
    shutterEl?.style.setProperty('--drum-frac', String(ALLEY_ART.shutter.drum))
    place(scene.querySelector('[data-alley-layer="sign"]'), plate.sign, ALLEY_ART.sign)
    // Props whose art does not exist yet have a slot but no element; they are
    // skipped rather than stood in for.
    for (const name of PROP_NAMES) {
      const el = scene.querySelector<HTMLElement>(`[data-alley-prop="${name}"]`)
      if (!(el instanceof HTMLImageElement)) continue
      const art = { w: el.naturalWidth || 1, h: el.naturalHeight || 1 }
      place(el, plate.props[name], art)
      const tilt = plate.props[name].tilt ?? 0
      el.style.setProperty('--tilt', `${tilt}deg`)
    }

    // The interior light and the pushed-through wash live in the doorway box.
    const d = plate.doorway
    for (const el of scene.querySelectorAll<HTMLElement>('[data-alley-doorway]')) {
      el.style.left = `${d.x - d.w / 2}%`
      el.style.top = `${d.y - d.h / 2}%`
      el.style.width = `${d.w}%`
      el.style.height = `${d.h}%`
    }

    if (enterBtn) {
      const plateTop = (r.height - h) / 2
      enterBtn.style.top = `${plateTop + (h * plate.enterY) / 100}px`
    }
  }

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
  // ── Dressing ─────────────────────────────────────────────────────────────
  // The lane appears when its two big images are here, together. The base
  // paints an open doorway that the shutter covers, so showing the base alone
  // is a door that opens and then shuts itself. A failed or slow image must
  // never leave the entrance blank, so the deadline shows whatever arrived.
  const DRESS_DEADLINE_MS = 1600
  const shutterImg = scene.querySelector<HTMLImageElement>('[data-alley-shutter-img]')
  const plateArt = [baseImg, shutterImg].filter((i): i is HTMLImageElement => !!i)
  let dressed = false
  const dress = (): void => {
    if (dressed) return
    dressed = true
    layout()
    scene.classList.add('alley--dressed')
  }
  const dressWhenReady = (): void => {
    layout()
    if (plateArt.every((img) => img.complete)) dress()
  }
  for (const img of plateArt) {
    img.addEventListener('load', dressWhenReady)
    img.addEventListener('error', dressWhenReady)
    off.push(() => {
      img.removeEventListener('load', dressWhenReady)
      img.removeEventListener('error', dressWhenReady)
    })
  }
  dressWhenReady()
  later(dress, DRESS_DEADLINE_MS)

  // ── Entrance ─────────────────────────────────────────────────────────────
  let finished = false
  /** Been through once already this page: the next time is the short one. */
  let beenIn = false
  const finish = (): void => {
    if (finished) return
    finished = true
    beenIn = true
    scene.classList.remove('alley--loading')
    if (loadingEl) loadingEl.hidden = true
    setPhase('inside')
    scene.classList.add('alley--inside')
    opts.onEntered?.()
    log.debug('alley: inside')
  }

  /**
   * The camera is through. Go in — unless the room is honestly not here
   * yet, in which case say so and go in the moment it is. The line is never
   * shown for a room that has already arrived, and a room that never arrives
   * does not trap the visitor at the door.
   */
  const finishWhenReady = (): void => {
    const pending = opts.ready?.() ?? null
    if (!pending) {
      finish()
      return
    }
    let settled = false
    const done = (): void => {
      settled = true
      finish()
    }
    void Promise.resolve(pending).then(done, done)
    // Give the plate a frame to be already here before saying anything.
    later(() => {
      if (settled || finished) return
      scene.classList.add('alley--loading')
      if (loadingEl) loadingEl.hidden = false
    }, 120)
    later(finish, READY_CAP_MS)
  }

  const enter = (): void => {
    if (phase !== 'idle') return // one way in, once
    setPhase('entering')
    enterBtn?.setAttribute('disabled', '')
    opts.onBeat?.('enter')

    if (motion.reduced) {
      // No theatre: the shutter is up, the light is on, we are inside.
      scene.classList.add('alley--rise', 'alley--light')
      opts.onBeat?.('rise')
      opts.onBeat?.('light')
      finishWhenReady()
      return
    }

    const quick = beenIn || opts.returning?.() === true
    const at = quick ? QUICK : BEATS
    scene.classList.toggle('alley--quick', quick)
    // The way out of the sequence, for anybody who has seen it.
    if (skipBtn) {
      skipBtn.hidden = false
      skipBtn.focus({ preventScroll: true })
    }

    const beat = (cls: string, name: keyof typeof BEATS): void => later(() => {
      scene.classList.add(cls)
      opts.onBeat?.(name)
    }, at[name])
    if (!quick) {
      beat('alley--bump', 'bump')
      beat('alley--flicker', 'flicker')
      beat('alley--hesitate', 'hesitate')
    }
    later(() => {
      scene.classList.remove('alley--hesitate')
      scene.classList.add('alley--rise')
      opts.onBeat?.('rise')
    }, at.rise)
    beat('alley--light', 'light')
    beat('alley--peek', 'peek')
    beat('alley--push', 'push')
    // Whatever the transitions do, we are inside by the deadline.
    later(finishWhenReady, at.inside)
  }

  /**
   * Skip (PHASE 7): a click, a tap, Enter, Space or Escape while the door is
   * opening finishes it now. Everything the beats would have added is added,
   * so the picture the room takes over from is the same one.
   */
  const skip = (): void => {
    if (phase !== 'entering' || finished) return
    for (const tm of timers) clearTimeout(tm)
    timers.clear()
    scene.classList.remove('alley--hesitate')
    scene.classList.add('alley--rise', 'alley--light', 'alley--push')
    opts.onBeat?.('skip')
    finishWhenReady()
  }

  if (enterBtn) {
    const onClick = (): void => enter()
    enterBtn.addEventListener('click', onClick)
    off.push(() => enterBtn.removeEventListener('click', onClick))
  }
  if (skipBtn) {
    const onSkipClick = (e: Event): void => {
      e.stopPropagation()
      skip()
    }
    skipBtn.addEventListener('click', onSkipClick)
    off.push(() => skipBtn.removeEventListener('click', onSkipClick))
  }
  const onScenePointer = (e: PointerEvent): void => {
    if (phase !== 'entering') return
    // The ENTER button's own click is what started this; a second press on
    // it while it is disabled is not a skip.
    if ((e.target as HTMLElement | null)?.closest('[data-alley-enter]')) return
    skip()
  }
  const onSceneKey = (e: KeyboardEvent): void => {
    if (phase !== 'entering') return
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      skip()
    }
  }
  scene.addEventListener('pointerdown', onScenePointer)
  document.addEventListener('keydown', onSceneKey)
  off.push(() => {
    scene.removeEventListener('pointerdown', onScenePointer)
    document.removeEventListener('keydown', onSceneKey)
  })

  // ── Ambient life ─────────────────────────────────────────────────────────
  // Continuous drifts on their own slow periods, plus one small "event" at a
  // time on the pavement with a cooldown, so the lane never looks busy.
  if (!motion.reduced) {
    const sign = scene.querySelector<HTMLElement>('[data-alley-layer="sign"]')
    const lamp = scene.querySelector<HTMLElement>('[data-alley-lamp]')
    const events: { el: HTMLElement | null; cls: string; ms: number }[] = [
      { el: scene.querySelector('[data-alley-prop="parcelStack"]'), cls: 'is-twitch', ms: 420 },
    ]
    let t = 0
    let nextEvent = 3500 + Math.random() * 2500
    let busyUntil = 0
    let eventIdx = 0
    off.push(
      ticker.subscribe((info) => {
        t += info.delta
        if (phase !== 'idle') return
        if (sign) sign.style.setProperty('--sway', `${Math.sin(t / 1900) * 1.5}deg`)
        if (lamp) lamp.style.setProperty('--breathe', String(0.82 + Math.sin(t / 2600) * 0.18))
        if (t >= nextEvent && t >= busyUntil) {
          // Round-robin rather than random, so nothing repeats twice running.
          const ev = events[eventIdx++ % events.length]
          if (ev?.el) {
            const el = ev.el
            el.classList.add(ev.cls)
            later(() => el.classList.remove(ev.cls), ev.ms)
            busyUntil = t + ev.ms
          }
          nextEvent = t + 4000 + Math.random() * 4000
        }
      }, 10),
    )
  }

  return () => {
    for (const tm of timers) clearTimeout(tm)
    timers.clear()
    for (const fn of off) fn()
    off.length = 0
  }
}
