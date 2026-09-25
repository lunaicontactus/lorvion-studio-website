/**
 * The Secret Archive (PHASE 12/13): the dokkaebi's star-lit rest room.
 *
 * The painted plate, the camera and the places are the shared scene
 * (src/scenes/scene.ts). What is the archive's own:
 *
 *   - a few stars in the glass that breathe, each on its own beat;
 *   - the shooting star (the user's overlay, whole) — never on by itself:
 *     it goes over now and then in Healing Mode, and rarely on its own;
 *   - the lantern's light, a warm few percent, on or off;
 *   - the jar: a handful of tiny stars when it is touched, then still;
 *   - looking up (WORLD 2.4): the telescope is a way into a sky of its own
 *     (src/scenes/sky.ts), with the room gone from view and one plain way
 *     back;
 *   - the door beside the visitor (WORLD 2.4): the felt door they came
 *     through, from this side — the way back to the garage, always in
 *     view, never a button;
 *   - Healing Mode: the labels and the nav go, the stars stay, the camera
 *     drifts a little, a star falls now and then. Any touch or key ends it.
 */
import { mountScene, type SceneHandle } from '@/scenes/scene'
import { archiveFor, type ArchiveLayout, type ArchivePlace, SHOOTING_STAR } from '@/data/archive'
import { mountSky, type SkyHandle } from '@/scenes/sky'
import { motion } from '@/systems/motion'
import { ticker } from '@/systems/tick'

export interface ArchiveOptions {
  readonly onPlace?: (place: ArchivePlace) => void
  /** Healing Mode came on or went off. */
  readonly onHealing?: (on: boolean) => void
  /** Looking up began or ended. */
  readonly onSky?: (open: boolean) => void
  /** The door: the visitor is going back to the garage. */
  readonly onExit?: () => void
}

export interface ArchiveHandle extends SceneHandle<ArchiveLayout> {
  /** The jar: a handful of stars, once. */
  sparkle(): void
  /** The lantern, on or off. Returns the new state. */
  toggleLantern(): boolean
  readonly lanternOn: boolean
  /** A star across the glass, now. */
  shoot(): void
  /** Look up through the telescope, or stop. */
  openSky(): void
  closeSky(): void
  readonly skyOpen: boolean
  /** The sky: how many stars, how many have fallen. */
  readonly sky: { readonly stars: number; readonly shots: number } | null
  /** Healing Mode. */
  setHealing(on: boolean): void
  readonly healing: boolean
}

/** How often a star falls on its own, and in Healing Mode. */
const RARE_STAR = { min: 60_000, max: 120_000 }
const HEALING_STAR = { min: 12_000, max: 25_000 }
/** How far the camera drifts in Healing Mode, in world units, and how slowly. */
const DRIFT = { x: 26, y: 12, period: 26_000 }
/** The sky's fade, in and out, and the door's opening before the crossing. */
const SKY_FADE = 700
const DOOR_OPEN = 460

export function mountArchive(root: ParentNode = document, opts: ArchiveOptions = {}): ArchiveHandle | null {
  let shooting: HTMLElement | null = null
  let lamp: HTMLElement | null = null
  let lanternOn = false
  let healing = false
  let skyOpen = false
  let sceneEl: HTMLElement | null = null
  let worldEl: HTMLElement | null = null
  let laterFn: ((fn: () => void, ms: number) => void) | null = null
  /** The room's own clock: a star now and then, the drift. */
  let clock = 0
  let nextStar = 0
  let driftT0 = 0
  let home = { x: 0, y: 0 }

  const scene = mountScene<ArchiveLayout>(root, {
    root: 'archive',
    layoutFor: archiveFor,
    ...(opts.onPlace ? { onPlace: opts.onPlace } : {}),
    decorate: (world, layout, tools) => {
      worldEl = world
      laterFn = tools.later
      for (const [i, t] of layout.twinkles.entries()) {
        const s = document.createElement('span')
        s.className = 'archive__twinkle'
        s.style.left = `${t.x}px`
        s.style.top = `${t.y}px`
        s.style.animationDelay = `${-(i * 0.9) % 4.6}s`
        s.setAttribute('aria-hidden', 'true')
        world.append(s)
      }
      const star = document.createElement('img')
      star.className = 'archive__shooting'
      star.src = SHOOTING_STAR
      star.alt = ''
      star.decoding = 'async'
      star.setAttribute('aria-hidden', 'true')
      Object.assign(star.style, { left: `${layout.sky.x}px`, top: `${layout.sky.y}px`, width: `${layout.sky.w}px` })
      world.append(star)
      shooting = star
      const lantern = layout.places.find((p) => p.id === 'lantern')
      if (lantern) {
        const r = Math.max(lantern.rect.w, lantern.rect.h) * 1.6
        const l = document.createElement('div')
        l.className = 'archive__lamp'
        l.setAttribute('aria-hidden', 'true')
        Object.assign(l.style, {
          left: `${lantern.rect.x + lantern.rect.w / 2 - r}px`, top: `${lantern.rect.y + lantern.rect.h / 2 - r}px`,
          width: `${r * 2}px`, height: `${r * 2}px`,
        })
        l.classList.toggle('is-on', lanternOn)
        world.append(l)
        lamp = l
      }
      home = { x: layout.start.x, y: layout.start.y }
      return () => {
        shooting = null
        lamp = null
      }
    },
  })
  if (!scene) return null
  sceneEl = root.querySelector<HTMLElement>('[data-archive]')
  const skyEl = root.querySelector<HTMLElement>('[data-archive-sky]')
  const starsEl = root.querySelector<HTMLCanvasElement>('[data-archive-stars]')
  const restEl = root.querySelector<HTMLElement>('[data-archive-rest]')
  const doorEl = root.querySelector<HTMLButtonElement>('[data-archive-door]')

  const gap = (r: { min: number; max: number }): number => r.min + Math.random() * (r.max - r.min)
  nextStar = gap(RARE_STAR)

  const shoot = (): void => {
    if (!shooting) return
    shooting.classList.remove('is-falling')
    void shooting.offsetWidth
    shooting.classList.add('is-falling')
    laterFn?.(() => shooting?.classList.remove('is-falling'), 2800)
  }

  // ── The sky (WORLD 2.4) ─────────────────────────────────────────────────
  const sky: SkyHandle | null = starsEl ? mountSky(starsEl, { reduced: () => motion.reduced }) : null

  const off = ticker.subscribe((info) => {
    if (!sceneEl || sceneEl.hidden) return
    const dt = Math.min(info.delta, 64)
    clock += dt
    if (!motion.reduced && clock >= nextStar) {
      shoot()
      nextStar = clock + gap(healing ? HEALING_STAR : RARE_STAR)
    }
    if (healing && !motion.reduced) {
      const t = (clock - driftT0) / DRIFT.period * Math.PI * 2
      scene.driftTo(home.x + Math.sin(t) * DRIFT.x, home.y + Math.sin(t * 0.63) * DRIFT.y)
    }
  }, 25)

  const onSkyKey = (e: KeyboardEvent): void => {
    if (skyOpen && e.key === 'Escape') {
      e.preventDefault()
      handle.closeSky()
    }
  }
  document.addEventListener('keydown', onSkyKey)
  skyEl?.querySelector<HTMLElement>('[data-archive-sky-close]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    handle.closeSky()
  })
  const onResize = (): void => { if (skyOpen) sky?.resize() }
  addEventListener('resize', onResize)

  // ── The door back (WORLD 2.4) ───────────────────────────────────────────
  let exiting = false
  if (doorEl) {
    // The scene's drag must not start on the door, and a press is a press.
    doorEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      doorEl.classList.add('is-pressed')
    })
    const release = (): void => doorEl.classList.remove('is-pressed')
    doorEl.addEventListener('pointerup', release)
    doorEl.addEventListener('pointercancel', release)
    doorEl.addEventListener('pointerleave', release)
    doorEl.addEventListener('click', (e) => {
      e.stopPropagation()
      if (exiting || healing || skyOpen) return
      exiting = true
      // The handle turns, the leaf swings, the garage's light comes through;
      // then the crossing.
      doorEl.classList.add('is-opening')
      doorEl.classList.remove('is-pressed')
      laterFn?.(() => {
        opts.onExit?.()
        // Ready for next time, once the room is out of view.
        laterFn?.(() => {
          doorEl.classList.remove('is-opening')
          exiting = false
        }, 1400)
      }, motion.reduced ? 0 : DOOR_OPEN)
    })
  }

  const handle: ArchiveHandle = {
    ...scene,
    get layout() { return scene.layout },
    get world() { return scene.world },
    get ready() { return scene.ready },
    get at() { return scene.at },
    sparkle(): void {
      if (!worldEl) return
      const jar = scene.layout.places.find((p) => p.id === 'star-jar')
      if (!jar) return
      const spot = worldEl.querySelector<HTMLElement>('.spot--star-jar')
      spot?.classList.add('is-glowing')
      laterFn?.(() => spot?.classList.remove('is-glowing'), 1800)
      if (motion.reduced) return
      const n = 7
      for (let i = 0; i < n; i++) {
        const m = document.createElement('span')
        m.className = 'archive__mote'
        m.style.left = `${jar.rect.x + jar.rect.w * (0.3 + Math.random() * 0.4)}px`
        m.style.top = `${jar.rect.y + jar.rect.h * 0.3}px`
        m.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 90)}px`)
        m.style.setProperty('--dy', `${-40 - Math.round(Math.random() * 70)}px`)
        m.style.setProperty('--delay', `${i * 70}ms`)
        worldEl.append(m)
        laterFn?.(() => m.remove(), 2000)
      }
    },
    toggleLantern(): boolean {
      lanternOn = !lanternOn
      lamp?.classList.toggle('is-on', lanternOn)
      return lanternOn
    },
    get lanternOn() { return lanternOn },
    shoot,
    openSky(): void {
      if (!skyEl || skyOpen) return
      skyOpen = true
      skyEl.hidden = false
      void skyEl.offsetWidth
      skyEl.classList.add('is-open', 'is-entering')
      sceneEl?.classList.add('is-sky')
      document.body.classList.add('is-sky')
      sky?.start()
      scene.setPaused(true)
      opts.onSky?.(true)
      laterFn?.(() => skyEl.classList.remove('is-entering'), motion.reduced ? 0 : 900)
      skyEl.querySelector<HTMLElement>('[data-archive-sky-close]')?.focus()
    },
    closeSky(): void {
      if (!skyEl || !skyOpen) return
      skyOpen = false
      skyEl.classList.remove('is-open', 'is-entering')
      sceneEl?.classList.remove('is-sky')
      document.body.classList.remove('is-sky')
      const done = (): void => {
        if (skyOpen || !skyEl) return
        skyEl.hidden = true
        sky?.stop()
      }
      if (motion.reduced) done()
      else laterFn?.(done, SKY_FADE + 20)
      scene.setPaused(false)
      opts.onSky?.(false)
      // Back on the telescope, so the keyboard is where it was.
      worldEl?.querySelector<HTMLElement>('[data-place="telescope"]')?.focus({ preventScroll: true })
    },
    get skyOpen() { return skyOpen },
    get sky() { return sky ? { stars: sky.stars, shots: sky.shots } : null },
    setHealing(on: boolean): void {
      if (healing === on) return
      healing = on
      sceneEl?.classList.toggle('is-healing', on)
      document.body.classList.toggle('is-healing', on)
      if (on) {
        driftT0 = clock
        home = scene.at
        nextStar = clock + 2500
        if (restEl) {
          restEl.hidden = false
          void restEl.offsetWidth
          restEl.classList.add('is-in')
          laterFn?.(() => restEl.classList.remove('is-in'), 4200)
        }
      } else {
        scene.driftTo(home.x, home.y)
        nextStar = clock + gap(RARE_STAR)
        if (restEl) {
          restEl.classList.remove('is-in')
          restEl.hidden = true
        }
      }
      opts.onHealing?.(on)
    },
    get healing() { return healing },
    destroy(): void {
      off()
      sky?.stop()
      document.removeEventListener('keydown', onSkyKey)
      removeEventListener('resize', onResize)
      document.body.classList.remove('is-healing', 'is-sky')
      scene.destroy()
    },
  }
  return handle
}
