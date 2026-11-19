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
import { setMochiCrew, setNewCrew } from '@/data/sprites'
import { mountNav } from '@/ui/nav'
import { mountReveal } from '@/ui/reveal'
import { mountSoundToggle } from '@/ui/soundToggle'
import { mountFallback } from '@/ui/fallback'
import { mountWorks } from '@/ui/works'
import { mountRecords } from '@/ui/records'
import { mountPress } from '@/ui/press'

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
    guard('works', () => mountWorks()),
    guard('records', () => mountRecords()),
    guard('press', () => mountPress()),
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

  // Which crew's frames the room asks for. Set before anything mounts, so no
  // character is built against one set and drawn from the other.
  setNewCrew(flags.newCrew)
  setMochiCrew(flags.mochiCrew)
  // The room module reads this when it loads (src/data/world.ts), and the
  // page styles key off it: one attribute, no import of the room here.
  document.documentElement.dataset['room'] = flags.pinkRoom ? 'pink' : 'felt'
  // The alley's first paint is in the HTML, in pink; the felt alley is the
  // same files one folder up.
  if (!flags.pinkRoom) {
    for (const el of document.querySelectorAll<HTMLImageElement | HTMLSourceElement>('[data-alley] img, [data-alley] source')) {
      for (const attr of ['src', 'srcset'] as const) {
        const v = el.getAttribute(attr)
        if (v?.includes('/alley/pink/')) el.setAttribute(attr, v.replace('/alley/pink/', '/alley/'))
      }
    }
  }
  // The one character drawn in the markup rather than by the room: whoever
  // leans round the door while the shutter is still going up. It has to be
  // the same crew as the room behind it, including on the rollback path.
  for (const img of document.querySelectorAll<HTMLImageElement>('[data-alley-peek] img')) {
    const want = img.dataset[flags.mochiCrew ? 'crewMochi' : flags.newCrew ? 'crewV2' : 'crewV1']
    if (want && img.getAttribute('src') !== want) img.src = want
  }

  // EUNGARAGE 2.0 pages: each page's script is loaded on its own page only,
  // so the rest of the site does not download it (the PHASE K budgets).
  const PAGES: readonly [string, string, () => Promise<() => (() => void) | undefined>][] = [
    ['[data-crew]', 'crew', () => import('@/ui/crew').then((m) => m.mountCrew)],
    ['[data-diary]', 'diary', () => import('@/ui/diary').then((m) => m.mountDiary)],
    ['[data-arcade]', 'arcade', () => import('@/ui/arcade').then((m) => m.mountArcade)],
    ['[data-guestbook]', 'guestbook', () => import('@/ui/guestbook').then((m) => m.mountGuestbook)],
    ['[data-stars]', 'stars', () => import('@/ui/stars').then((m) => m.mountStars)],
    ['[data-radio]', 'radio', () => import('@/ui/radio').then((m) => m.mountRadio)],
    ['[data-settings]', 'settings', () => import('@/ui/settings').then((m) => m.mountSettings)],
    ['[data-admin]', 'admin', () => import('@/ui/admin').then((m) => m.mountAdmin)],
  ]
  for (const [sel, name, load] of PAGES) {
    if (!document.querySelector(sel)) continue
    let off: Teardown | undefined
    let gone = false
    void load()
      .then((mount) => { if (!gone) off = guard(name, () => mount()) })
      .catch((err: unknown) => {
        log.error(`"${name}" failed to load`, err)
        document.documentElement.dataset['bootError'] = name
      })
    teardowns.push(() => {
      gone = true
      off?.()
    })
  }

  if (flags.alley && document.querySelector('[data-alley]')) {
    // On demand (PHASE K): only the home page has the alley, and the rest of
    // the site need not download or run the room. The build preloads this
    // chunk on the home page (vite.config.ts preloadWorld).
    let off: Teardown | undefined
    let gone = false
    void import('@/app/world')
      .then((m) => { if (!gone) off = guard('world', () => m.mountWorld()) })
      .catch((err: unknown) => {
        log.error('"world" failed to load', err)
        document.documentElement.dataset['bootError'] = 'world'
      })
    teardowns.push(() => {
      gone = true
      off?.()
    })
  }

  for (const el of document.querySelectorAll<HTMLElement>('[data-year]')) {
    el.textContent = String(new Date().getFullYear())
  }

  log.debug('booted', { flags, phase: clock.phase, save: save.data })

  return () => {
    for (const fn of teardowns.reverse()) fn()
  }
}
