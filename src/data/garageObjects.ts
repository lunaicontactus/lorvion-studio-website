/**
 * The room is the menu.
 *
 * Each entry is one thing a visitor can reach. `inMainMenu` marks the four that
 * also appear as plain text navigation, because discovering the room must never
 * be the only way to find the games.
 */
import type { InteractiveObjectConfig } from '@/types/interactive'

export const GARAGE_OBJECTS: readonly InteractiveObjectConfig[] = [
  {
    id: 'poster-wall',
    label: 'Games',
    zone: 'left',
    action: { kind: 'openPanel', panelId: 'projects' },
    inMainMenu: true,
    sfx: 'paper',
  },
  {
    id: 'dev-pc',
    label: 'Devlog',
    zone: 'centre',
    action: { kind: 'openPanel', panelId: 'devlog' },
    inMainMenu: true,
    sfx: 'keyboard',
  },
  {
    id: 'work-desk',
    label: 'About the studio',
    zone: 'centre',
    action: { kind: 'openPanel', panelId: 'about' },
    inMainMenu: true,
    sfx: 'paper',
  },
  {
    id: 'radio',
    label: 'Contact',
    zone: 'right',
    action: { kind: 'openPanel', panelId: 'contact' },
    inMainMenu: true,
    sfx: 'telephone',
  },
  {
    id: 'cabinet',
    label: 'Archive',
    zone: 'left',
    action: { kind: 'openPanel', panelId: 'archive' },
    inMainMenu: false,
    sfx: 'case-open',
  },
  {
    id: 'old-tv',
    label: 'Trailers',
    zone: 'right',
    action: { kind: 'openPanel', panelId: 'trailers' },
    inMainMenu: false,
    sfx: 'button',
  },
  {
    id: 'locked-door',
    label: 'Locked door',
    zone: 'door',
    action: { kind: 'locked', requires: 3 },
    inMainMenu: false,
    sfx: 'door',
  },
] as const

export const MAIN_MENU_OBJECTS = GARAGE_OBJECTS.filter((o) => o.inMainMenu)
