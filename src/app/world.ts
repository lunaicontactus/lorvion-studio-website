/**
 * Joining the alley to the garage.
 *
 * One page, two places. ENTER finishes its push through the doorway and the
 * garage takes over the screen from exactly that view — no reload, no route
 * change — and the door in the corner of the room brings you back. The panels
 * a thing opens are decided here rather than inside the scene, so the room
 * stays a room and does not know what a dialog is.
 */
import { mountAlley } from '@/scenes/alley'
import { mountGarage, type GarageHandle } from '@/scenes/garage'
import { Panels, secretMet } from '@/ui/panels'
import { PROJECTS } from '@/data/projects'
import { audio } from '@/systems/audio'
import { log } from '@/systems/log'
import type { WorldObject } from '@/types/world'

export function mountWorld(): () => void {
  const alleyEl = document.querySelector<HTMLElement>('[data-alley]')
  const garageEl = document.querySelector<HTMLElement>('[data-garage]')
  const panelRoot = document.querySelector<HTMLElement>('[data-panel-root]')
  if (!garageEl || !panelRoot) return () => undefined

  const off: (() => void)[] = []
  let garage: GarageHandle | null = null

  const panels = new Panels(panelRoot, {
    onOpenChange: (open) => garage?.setPaused(open),
    onProgress: () => refreshSecret(),
  })

  const refreshSecret = (): void => {
    garageEl.dataset['secret'] = secretMet() ? 'unlocked' : 'locked'
  }

  const openFor = (obj: WorldObject): void => {
    const action = obj.action
    switch (action.kind) {
      case 'exit':
        leaveGarage()
        return
      case 'project': {
        const project = PROJECTS.find((p) => p.id === action.projectId)
        if (project) panels.openProject(project)
        return
      }
      case 'panel':
        switch (action.panelId) {
          case 'pc':
            panels.openPc()
            break
          case 'building':
            panels.openBuilding()
            break
          case 'contact':
            panels.openContact()
            break
          case 'fridge':
            panels.openFridge()
            break
          case 'studio':
            panels.openStudio()
            break
          case 'shelf':
            panels.openShelf()
            break
          case 'secret': {
            const opened = panels.openSecret()
            if (!opened) {
              const el = garageEl.querySelector('.thing--secret-door')
              el?.classList.add('is-rattling')
              setTimeout(() => el?.classList.remove('is-rattling'), 460)
            }
            break
          }
          default:
            log.debug('world: no panel for', action.panelId)
        }
        refreshSecret()
        return
    }
  }

  const enterGarage = (): void => {
    garageEl.hidden = false
    document.body.classList.add('is-inside')
    // A visitor cannot have interacted without a gesture reaching us first.
    audio.unlock()
    if (!garage) {
      garage = mountGarage(document, {
        onObject: openFor,
        onExit: () => leaveGarage(),
      })
    }
    refreshSecret()
    log.debug('world: inside the garage')
  }

  const leaveGarage = (): void => {
    panels.close()
    garageEl.hidden = true
    document.body.classList.remove('is-inside')
    alleyEl?.classList.remove('alley--inside', 'alley--push')
    audio.play('door', 0.4)
  }

  off.push(
    mountAlley(document, {
      onEntered: () => enterGarage(),
    }),
  )

  return () => {
    garage?.destroy()
    for (const fn of off) fn()
    off.length = 0
  }
}
