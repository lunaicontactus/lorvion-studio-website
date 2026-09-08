/**
 * Application entry.
 *
 * Every subsystem is mounted behind its own try/catch: a failure in the sound
 * toggle must not stop navigation from working. There is no framework to catch
 * errors for us, so the boundary is explicit.
 */
import { flags } from '@/systems/flags'
import { log } from '@/systems/log'
import { clock } from '@/systems/clock'
import { installVisibilityGate } from '@/systems/tick'
import { registerVisit, save } from '@/systems/storage'
import { installImageFallback } from '@/systems/assets'
import { motion } from '@/systems/motion'
import { mountNav } from '@/ui/nav'
import { mountReveal } from '@/ui/reveal'
import { mountSoundToggle } from '@/ui/soundToggle'
import { mountWorld } from '@/app/world'
import { mountFallback } from '@/ui/fallback'

type Teardown = () => void

/** Run a mount step; a thrown error is contained and reported, never fatal. */
function guard(name: string, fn: () => Teardown | void): Teardown {
  try {
    return fn() ?? ((): void => undefined)
  } catch (err) {
    log.error(`"${name}" failed to mount`, err)
    document.documentElement.dataset['bootError'] = name
    return (): void => undefined
  }
}

export function boot(): Teardown {
  const teardowns: Teardown[] = []
  const root = document.documentElement

  // Publish world state as data attributes so CSS can dress without JS hooks.
  root.dataset['phase'] = clock.phase
  root.dataset['motion'] = motion.reduced ? 'reduced' : 'full'
  root.dataset['storage'] = save.persistent ? 'persistent' : 'ephemeral'

  // body.loading holds scroll until the first paint is dressed. If `load`
  // already fired (bfcache, a cached reload) the listener would never run, so
  // check the state as well as listening for it — leaving the class on locks
  // the page at the top forever.
  const clearLoading = (): void => document.body.classList.remove('loading')
  if (document.readyState === 'complete') clearLoading()
  else window.addEventListener('load', clearLoading, { once: true })
  // Whatever happens, never leave the page unscrollable.
  const loadingSafety = setTimeout(clearLoading, 4000)

  teardowns.push(
    () => {
      clearTimeout(loadingSafety)
      window.removeEventListener('load', clearLoading)
    },
    guard('visibility-gate', () => installVisibilityGate()),
    guard('image-fallback', () => installImageFallback()),
    guard('visit', () => {
      registerVisit()
    }),
    guard('nav', () => mountNav()),
    guard('fallback', () => mountFallback()),
    guard('reveal', () => mountReveal()),
    guard('sound-toggle', () => mountSoundToggle()),
  )

  const offPhase = clock.subscribe((p) => {
    root.dataset['phase'] = p
  })
  clock.start()
  teardowns.push(() => {
    offPhase()
    clock.stop()
  })

  teardowns.push(
    motion.subscribe((reduced) => {
      root.dataset['motion'] = reduced ? 'reduced' : 'full'
    }),
  )

  if (flags.alley && document.querySelector('[data-alley]')) {
    teardowns.push(guard('world', () => mountWorld()))
  }

  for (const el of document.querySelectorAll<HTMLElement>('[data-year]')) {
    el.textContent = String(new Date().getFullYear())
  }

  log.debug('booted', { flags, phase: clock.phase, save: save.data })

  return () => {
    for (const fn of teardowns.reverse()) fn()
  }
}
