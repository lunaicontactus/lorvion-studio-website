/**
 * Joining the alley to the garage, and running what the room's things do.
 *
 * One page, two places. ENTER finishes its push through the doorway and the
 * garage takes over the screen from exactly that view — no reload, no route
 * change — and the door in the corner of the room brings you back.
 *
 * Everything a thing does goes through one machine (src/systems/interaction),
 * so there is a single answer to "what is open, and may this click happen
 * now". Adding a thing is a registry entry plus a case in `interfaceFor`; no
 * object gets its own listeners scattered through the file.
 */
import { mountAlley } from '@/scenes/alley'
import { mountGarage, type GarageHandle } from '@/scenes/garage'
import { Panels } from '@/ui/panels'
import { Interaction } from '@/systems/interaction'
import { PROJECTS } from '@/data/projects'
import { worldFor } from '@/data/world'
import { audio } from '@/systems/audio'
import { motion } from '@/systems/motion'
import { log } from '@/systems/log'
import type { WorldObject } from '@/types/world'

/** Which nav link stands for which thing in the room. */
const NAV_TARGETS: Readonly<Record<string, string>> = {
  games: 'pc',
  studio: 'workbench',
  contact: 'tv',
}

export function mountWorld(): () => void {
  const alleyEl = document.querySelector<HTMLElement>('[data-alley]')
  const garageEl = document.querySelector<HTMLElement>('[data-garage]')
  const panelRoot = document.querySelector<HTMLElement>('[data-panel-root]')
  if (!garageEl || !panelRoot) return () => undefined

  const off: (() => void)[] = []
  let garage: GarageHandle | null = null
  let inside = false

  const panels = new Panels(panelRoot, {
    onClose: () => interaction.dismiss(),
    onGoTo: (id) => goTo(id),
  })

  const objectById = (id: string): WorldObject | undefined =>
    [...worldFor(false).objects, ...worldFor(true).objects].find((o) => o.id === id)

  /** The interface a thing opens. One place, chosen by the registry. */
  const interfaceFor = (obj: WorldObject): void => {
    const action = obj.action
    if (action.kind === 'exit') {
      leaveGarage()
      return
    }
    if (action.kind === 'project') {
      const project = PROJECTS.find((p) => p.id === action.projectId)
      if (project) panels.openPoster(project)
      return
    }
    switch (action.panelId) {
      case 'pc':
        panels.openPc()
        break
      case 'building':
        panels.openStudioDesk()
        break
      case 'contact':
        panels.openContact()
        break
      case 'fridge':
        panels.openFridge()
        break
      case 'cabinet':
        panels.openCabinet()
        break
      case 'shelf':
        panels.openShelf()
        break
      case 'secret':
        panels.openSecret()
        break
      default:
        log.debug('world: no interface for', action.panelId)
    }
  }

  const interaction = new Interaction({
    focus: (id) => {
      garage?.focusObject(id)
      // The visitor comes first: whoever is standing at that thing moves off,
      // and nobody starts a new errand while it is open.
      garage?.npc?.yieldTo(id)
      garage?.npc?.setCalm(true)
    },
    restore: () => {
      garage?.restoreCamera()
      garage?.npc?.setCalm(false)
    },
    open: (id) => {
      const obj = objectById(id)
      if (obj) interfaceFor(obj)
    },
    close: () => panels.close(),
    setPaused: (v) => garage?.setPaused(v),
    onUnavailable: (id) => {
      // In the room, but nothing behind it yet. Say so where it stands.
      const el = garageEl.querySelector(`.thing--${id}`)
      el?.classList.add('is-rattling')
      setTimeout(() => el?.classList.remove('is-rattling'), 460)
      audio.play('click', 0.25)
    },
  })

  // ── History ──────────────────────────────────────────────────────────────
  // An open thing is a history entry, so Back closes it instead of leaving the
  // site. Nothing else about the page is routed: this is one document.
  const pushOpen = (id: string): void => {
    // pushState fires no popstate, so there is nothing to guard against here.
    history.pushState({ garageObject: id }, '', `#${id}`)
  }
  /**
   * Closing from inside the page consumes its own history entry rather than
   * calling `history.back()`. Back is asynchronous: with two objects opened
   * and closed quickly, its event could arrive after the next entry had been
   * pushed, and the room would re-open the thing you had just shut.
   */
  const popOpen = (): void => {
    if (history.state?.garageObject) history.replaceState({}, '', location.pathname)
  }
  const onPopState = (): void => {
    // A real Back press. Anything open closes; nothing leaves the page.
    if (interaction.state === 'OBJECT_OPEN') {
      interaction.dismiss()
      return
    }
    const id = String(history.state?.garageObject ?? location.hash.replace('#', ''))
    if (id) goTo(id, { fromHistory: true })
  }
  window.addEventListener('popstate', onPopState)
  off.push(() => window.removeEventListener('popstate', onPopState))

  /** Touch a thing by name: from the room, from the nav, or from a link. */
  const goTo = (id: string, opts: { readonly fromHistory?: boolean } = {}): void => {
    const obj = objectById(id)
    if (!obj) return
    const start = (): void => {
      const started = interaction.request(id, {
        enabled: obj.enabled,
        instant: motion.reduced,
      })
      if (started && !opts.fromHistory) pushOpen(id)
    }
    if (inside) start()
    else enterGarage({ then: start })
  }

  // ── The room ─────────────────────────────────────────────────────────────
  const enterGarage = (opts: { readonly then?: () => void } = {}): void => {
    garageEl.hidden = false
    document.body.classList.add('is-inside')
    // A visitor cannot have interacted without a gesture reaching us first.
    audio.unlock()
    if (!garage) {
      garage = mountGarage(document, {
        onObject: (obj) => goTo(obj.id),
        onExit: () => leaveGarage(),
      })
    }
    inside = true
    log.debug('world: inside the garage')
    if (opts.then) setTimeout(opts.then, 60)
  }

  const leaveGarage = (): void => {
    interaction.dismiss({ instant: true })
    garageEl.hidden = true
    document.body.classList.remove('is-inside')
    inside = false
    alleyEl?.classList.remove('alley--inside', 'alley--push')
    audio.play('door', 0.4)
  }

  // ── Escape, and the nav ──────────────────────────────────────────────────
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    // Also while the camera is still on its way: a visitor who presses Escape
    // during the move means it, and should not have a panel open on them.
    if (interaction.state !== 'OBJECT_OPEN' && interaction.state !== 'OBJECT_FOCUSING') return
    e.preventDefault()
    popOpen()
    interaction.dismiss()
  }
  document.addEventListener('keydown', onKey)
  off.push(() => document.removeEventListener('keydown', onKey))

  // The top nav and the room are the same site: GAMES is the PC.
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.nav-links a')) {
    const key = (link.textContent ?? '').trim().toLowerCase()
    const target = NAV_TARGETS[key]
    if (!target) continue // SUPPORT keeps its own page.
    const onClick = (e: MouseEvent): void => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      goTo(target)
    }
    link.addEventListener('click', onClick)
    off.push(() => link.removeEventListener('click', onClick))
  }

  off.push(
    mountAlley(document, {
      onEntered: () => {
        enterGarage()
        // Someone arrived on /#pc: open it once the room is up.
        const wanted = location.hash.replace('#', '')
        if (wanted && objectById(wanted)) setTimeout(() => goTo(wanted, { fromHistory: true }), 240)
      },
    }),
  )

  return () => {
    interaction.destroy()
    garage?.destroy()
    for (const fn of off) fn()
    off.length = 0
  }
}
