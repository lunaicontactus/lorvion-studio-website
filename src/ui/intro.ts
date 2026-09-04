/**
 * The opening curtain.
 *
 * Migrated from the old garage-door intro, which was the most battle-tested
 * piece of the previous site: it survives a slow image, a missing image, a
 * transition that never fires, a visitor who wants out, and a browser with no
 * sessionStorage. STEP 2 swaps the artwork for the alley shutter; the state
 * machine below does not change.
 */
import { motion } from '@/systems/motion'
import { log } from '@/systems/log'

export interface IntroOptions {
  readonly rootId?: string
  readonly skipId?: string
  readonly sessionKey?: string
  /** Hold the closed curtain at least this long so it reads as deliberate. */
  readonly minHoldMs?: number
  /** Give up waiting for the artwork after this. */
  readonly assetTimeoutMs?: number
  /** Absolute ceiling: the intro is gone by now, whatever happened. */
  readonly safetyMs?: number
  /** How long the opening transition is allowed to take. */
  readonly openMs?: number
  readonly onDone?: () => void
}

const DEFAULTS = {
  rootId: 'intro',
  skipId: 'introSkip',
  sessionKey: 'eungarage:introPlayed',
  minHoldMs: 380,
  assetTimeoutMs: 1400,
  safetyMs: 3500,
  openMs: 1500,
} as const

export function mountIntro(opts: IntroOptions = {}): () => void {
  const o = { ...DEFAULTS, ...opts }
  const root = document.getElementById(o.rootId)
  if (!root || root.dataset['init'] === '1') return () => undefined
  root.dataset['init'] = '1'

  const body = document.body
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const off: (() => void)[] = []
  let cleaned = false
  let opened = false

  const later = (fn: () => void, ms: number): void => {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }

  const cleanup = (): void => {
    if (cleaned) return
    cleaned = true
    for (const t of timers) clearTimeout(t)
    timers.clear()
    for (const fn of off) fn()
    off.length = 0
    body.classList.remove('is-intro-locked')
    root.classList.add('intro--done')
    root.remove()
    o.onDone?.()
  }

  const open = (): void => {
    if (opened || cleaned) return
    opened = true
    root.classList.add('intro--open')
    const curtain = root.querySelector('.intro__curtain')
    if (curtain) {
      const onEnd = (e: Event): void => {
        if ((e as TransitionEvent).propertyName === 'transform') cleanup()
      }
      curtain.addEventListener('transitionend', onEnd)
      off.push(() => curtain.removeEventListener('transitionend', onEnd))
    }
    // transitionend is not guaranteed (display changes, interrupted animations).
    later(cleanup, o.openMs)
  }

  // Second visit in this tab, or the visitor asked for less motion: no curtain.
  let played = false
  try {
    played = sessionStorage.getItem(o.sessionKey) === 'true'
  } catch {
    log.debug('sessionStorage unavailable; intro will replay')
  }
  const markPlayed = (): void => {
    try {
      sessionStorage.setItem(o.sessionKey, 'true')
    } catch {
      /* private mode — the intro simply plays again */
    }
  }

  if (played || motion.reduced) {
    markPlayed()
    cleanup()
    return cleanup
  }
  markPlayed()
  body.classList.add('is-intro-locked')

  const skip = document.getElementById(o.skipId)
  if (skip) {
    const onSkip = (): void => cleanup()
    skip.addEventListener('click', onSkip)
    off.push(() => skip.removeEventListener('click', onSkip))
    // The curtain is the only thing on screen: put focus where the way out is.
    skip.focus({ preventScroll: true })
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !cleaned) cleanup()
  }
  document.addEventListener('keydown', onKey)
  off.push(() => document.removeEventListener('keydown', onKey))

  // Wait for the artwork, but never on it.
  const art = root.querySelector('img')
  const start = Date.now()
  const ready = (): void => later(open, Math.max(0, o.minHoldMs - (Date.now() - start)))
  if (art && !art.complete) {
    art.addEventListener('load', ready, { once: true })
    art.addEventListener('error', ready, { once: true })
    later(ready, o.assetTimeoutMs)
  } else {
    ready()
  }

  later(() => {
    open()
    later(cleanup, o.openMs)
  }, o.safetyMs)

  return cleanup
}
