/**
 * The Korean alley entrance.
 *
 * A visitor arrives in a lane, not on a landing page: a shutter with a small
 * sign over it, and one way in. Pressing ENTER flickers the lamp, warms the
 * gap under the shutter, and lifts it.
 *
 * The whole sequence is under three seconds and every part of it is optional —
 * reduced motion, a failed image and a returning visitor all still get in.
 */
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
      // No theatre: the shutter is simply already up.
      finish()
      return
    }

    // lamp flicker -> warm light under the shutter -> the shutter lifts
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
    const glow = scene.querySelector<HTMLElement>('[data-alley-glow]')
    if (sign || glow) {
      let t = 0
      off.push(
        ticker.subscribe((info) => {
          t += info.delta
          if (sign) {
            // Barely there: a degree and a half, twelve seconds a cycle.
            sign.style.setProperty('--sway', `${Math.sin(t / 1900) * 1.5}deg`)
          }
          if (glow) {
            glow.style.setProperty('--breathe', String(0.82 + Math.sin(t / 2600) * 0.18))
          }
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
