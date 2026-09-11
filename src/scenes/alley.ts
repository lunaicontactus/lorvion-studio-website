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

export function mountAlley(root: ParentNode = document, opts: AlleyOptions = {}): () => void {
  const scene = root.querySelector<HTMLElement>('[data-alley]')
  if (!scene) return () => undefined

  const plateEl = scene.querySelector<HTMLElement>('[data-alley-plate]')
  const baseImg = scene.querySelector<HTMLImageElement>('[data-alley-base]')
  const enterBtn = scene.querySelector<HTMLButtonElement>('[data-alley-enter]')

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
  const finish = (): void => {
    if (finished) return
    finished = true
    setPhase('inside')
    scene.classList.add('alley--inside')
    opts.onEntered?.()
    log.debug('alley: inside')
  }

  const enter = (): void => {
    if (phase !== 'idle') return // one way in, once
    setPhase('entering')
    enterBtn?.setAttribute('disabled', '')

    if (motion.reduced) {
      // No theatre: the shutter is up, the light is on, we are inside.
      scene.classList.add('alley--rise', 'alley--light')
      finish()
      return
    }

    const beat = (cls: string, at: number): void => later(() => scene.classList.add(cls), at)
    beat('alley--bump', BEATS.bump)
    beat('alley--flicker', BEATS.flicker)
    beat('alley--hesitate', BEATS.hesitate)
    later(() => {
      scene.classList.remove('alley--hesitate')
      scene.classList.add('alley--rise')
    }, BEATS.rise)
    beat('alley--light', BEATS.light)
    beat('alley--peek', BEATS.peek)
    beat('alley--push', BEATS.push)
    // Whatever the transitions do, we are inside by the deadline.
    later(finish, BEATS.inside)
  }

  if (enterBtn) {
    const onClick = (): void => enter()
    enterBtn.addEventListener('click', onClick)
    off.push(() => enterBtn.removeEventListener('click', onClick))
  }

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
