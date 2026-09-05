/**
 * The Korean alley entrance.
 *
 * A visitor arrives in a lane, not on a landing page: a shutter with a small
 * sign over it, and one way in. Pressing ENTER flickers the lamp, warms the gap
 * under the shutter, and lifts it.
 *
 * The base plate is cover-fitted, so the shutter would slide off the painted
 * doorway if it were positioned against the viewport. Instead the scene works
 * out the box the base actually occupies and places every layer in percentages
 * of that, which keeps the shutter in its doorway at any window shape.
 *
 * The whole sequence is under three seconds and every part of it is optional —
 * reduced motion, a failed image and a returning visitor all still get in.
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

export type AlleyPhase = 'idle' | 'entering' | 'open'

export interface AlleyOptions {
  /** Called once the shutter is up and the interior is exposed. */
  readonly onEntered?: () => void
  /** Total budget for the entrance, ms. Hard ceiling, never exceeded. */
  readonly enterMs?: number
}

const DEFAULT_ENTER_MS = 2600

export function mountAlley(root: ParentNode = document, opts: AlleyOptions = {}): () => void {
  const scene = root.querySelector<HTMLElement>('[data-alley]')
  if (!scene) return () => undefined

  const plateEl = scene.querySelector<HTMLElement>('[data-alley-plate]')
  const baseImg = scene.querySelector<HTMLImageElement>('[data-alley-base]')
  const enterBtn = scene.querySelector<HTMLButtonElement>('[data-alley-enter]')
  const budget = opts.enterMs ?? DEFAULT_ENTER_MS

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
  // Size the plate the way object-fit: cover would, then hand every layer its
  // box as a percentage of it.
  const layout = (): void => {
    if (!plateEl) return
    const r = scene.getBoundingClientRect()
    if (!r.width || !r.height) return

    // Take the orientation from the plate the browser actually chose, not from
    // a second measurement of our own. <picture> resolves the source and we
    // only follow it; two independent answers would eventually disagree and
    // put the shutter somewhere other than the doorway.
    const chosen = baseImg?.naturalWidth
      ? baseImg.naturalWidth < baseImg.naturalHeight
      : r.height >= r.width
    const plate: AlleyPlate = chosen ? ALLEY_PORTRAIT : ALLEY_LANDSCAPE
    const portrait = chosen
    const ratio = plate.base.w / plate.base.h
    const w = Math.max(r.width, r.height * ratio)
    const h = w / ratio

    plateEl.style.width = `${w}px`
    plateEl.style.height = `${h}px`
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
    // The roll housing is the top slice of the same image; the slats live in a
    // clipped box under it and roll up out of sight.
    shutterEl?.style.setProperty('--drum', `${ALLEY_ART.shutter.drum * 100}%`)
    shutterEl?.style.setProperty('--drum-frac', String(ALLEY_ART.shutter.drum))
    place(scene.querySelector('[data-alley-layer="sign"]'), plate.sign, ALLEY_ART.sign)
    for (const name of PROP_NAMES) {
      place(scene.querySelector(`[data-alley-prop="${name}"]`), plate.props[name], ALLEY_ART[name])
    }

    // The glow sits exactly where the shutter is, so light appears in the gap.
    const glow = scene.querySelector<HTMLElement>('[data-alley-glow-slot]')
    const s = plate.shutter
    if (glow) {
      glow.style.left = `${s.left}%`
      glow.style.width = `${s.width}%`
      glow.style.top = `${s.top ?? 0}%`
      glow.style.height = `${((w * s.width) / 100) * (ALLEY_ART.shutter.h / ALLEY_ART.shutter.w)}px`
    }
    // The button belongs on the pavement below the doorway, not floating over
    // the shutter, so it is anchored to the plate like everything else.
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
  // Every time the base settles — first decode, or <picture> swapping source
  // when the orientation changes — the plate has to be worked out again.
  if (baseImg) {
    const onBase = (): void => layout()
    baseImg.addEventListener('load', onBase)
    baseImg.addEventListener('error', onBase)
    off.push(() => {
      baseImg.removeEventListener('load', onBase)
      baseImg.removeEventListener('error', onBase)
    })
    if (baseImg.complete) layout()
  }

  // ── Entrance ─────────────────────────────────────────────────────────────
  let finished = false
  const finish = (): void => {
    if (finished) return
    finished = true
    setPhase('open')
    scene.classList.add('alley--open')
    opts.onEntered?.()
    log.debug('alley: entered')
  }

  const enter = (): void => {
    if (phase !== 'idle') return // one way in, once
    setPhase('entering')
    enterBtn?.setAttribute('disabled', '')

    if (motion.reduced) {
      finish() // no theatre: the shutter is simply already up
      return
    }

    scene.classList.add('alley--flicker')
    later(() => scene.classList.add('alley--warm'), 220)
    later(() => scene.classList.add('alley--lifting'), 420)
    // Whatever the transition does, the way in is open by the deadline.
    later(finish, budget)
  }

  if (enterBtn) {
    const onClick = (): void => enter()
    enterBtn.addEventListener('click', onClick)
    off.push(() => enterBtn.removeEventListener('click', onClick))
  }

  // Idle drift: the sign sways, the lamp breathes. One subscriber for the whole
  // scene rather than a CSS animation per prop, so it stops with the tab.
  if (!motion.reduced) {
    const sign = scene.querySelector<HTMLElement>('[data-alley-layer="sign"]')
    const lamp = scene.querySelector<HTMLElement>('[data-alley-lamp]')
    if (sign || lamp) {
      let t = 0
      off.push(
        ticker.subscribe((info) => {
          t += info.delta
          // Barely there: a degree and a half, twelve seconds a cycle.
          if (sign) sign.style.setProperty('--sway', `${Math.sin(t / 1900) * 1.5}deg`)
          if (lamp) lamp.style.setProperty('--breathe', String(0.82 + Math.sin(t / 2600) * 0.18))
        }, 10),
      )
    }
  }

  return () => {
    for (const t of timers) clearTimeout(t)
    timers.clear()
    for (const fn of off) fn()
    off.length = 0
  }
}
