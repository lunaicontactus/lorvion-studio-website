/**
 * The garage as a place, not a picture.
 *
 * The room is a painted panorama larger than the screen — 3600x1200 in
 * landscape, 1100x2619 stacked in portrait — and the camera moves inside it.
 * Every rectangle below was read off that artwork with a percentage grid, so a
 * hit area sits on the thing it belongs to rather than near it.
 *
 * Nothing is drawn twice: the PC, TV, fridge, posters and secret door are all
 * painted into the room, so the objects here are hit areas over them. The
 * keyed cut-outs of the same furniture are used inside the panels, where they
 * read as the object you just touched.
 */
import type { WorldLayout } from '@/types/world'

const ART = '/assets/images/garage'

export const DESKTOP_WORLD: WorldLayout = {
  width: 3600,
  height: 1200,
  start: { x: 1800, y: 600 },
  floor: { top: 900, bottom: 1130 },
  window: { x: 1440, y: 156, w: 576, h: 360 },
  zones: [
    { id: 'entry', label: 'Entry', rect: { x: 3100, y: 900, w: 500, h: 230 } },
    { id: 'posterWall', label: 'Poster wall', rect: { x: 430, y: 300, w: 860, h: 340 } },
    { id: 'archive', label: 'Archive', rect: { x: 660, y: 690, w: 250, h: 220 }, blocks: { x: 660, y: 699, w: 250, h: 201 } },
    { id: 'shelf', label: 'Shelf', rect: { x: 90, y: 50, w: 300, h: 600 }, blocks: { x: 90, y: 380, w: 300, h: 460 } },
    { id: 'mainDesk', label: 'Main desk', rect: { x: 1300, y: 560, w: 940, h: 340 }, blocks: { x: 1320, y: 760, w: 900, h: 140 } },
    { id: 'centreFloor', label: 'Centre floor', rect: { x: 1300, y: 930, w: 1200, h: 200 } },
    { id: 'workbench', label: 'Workbench', rect: { x: 2030, y: 270, w: 270, h: 360 } },
    { id: 'restArea', label: 'Rest area', rect: { x: 180, y: 900, w: 900, h: 230 }, blocks: { x: 300, y: 880, w: 620, h: 120 } },
    { id: 'tvArea', label: 'TV', rect: { x: 2660, y: 560, w: 320, h: 340 }, blocks: { x: 2660, y: 760, w: 320, h: 140 } },
    { id: 'fridgeArea', label: 'Fridge', rect: { x: 2330, y: 300, w: 260, h: 620 }, blocks: { x: 2330, y: 700, w: 260, h: 220 } },
    { id: 'secretDoor', label: 'Secret door', rect: { x: 3170, y: 520, w: 270, h: 400 }, blocks: { x: 3170, y: 520, w: 270, h: 400 } },
  ],
  objects: [
    // Read off the panorama with a rectangle overlay, then checked against it.
    { id: 'shelf', label: 'Collection', zone: 'shelf', action: { kind: 'panel', panelId: 'shelf' }, rect: { x: 244, y: 205, w: 171, h: 412 }, outline: 'shelf', sfx: 'drawer' },
    { id: 'poster-lunai', label: 'LUNAI', zone: 'posterWall', action: { kind: 'project', projectId: 'lunai' }, rect: { x: 455, y: 335, w: 168, h: 282 }, outline: 'poster' },
    { id: 'poster-liminal', label: 'LIMINAL', zone: 'posterWall', action: { kind: 'project', projectId: 'liminal' }, rect: { x: 651, y: 335, w: 168, h: 280 }, outline: 'poster' },
    { id: 'poster-wormup', label: 'WORM UP!', zone: 'posterWall', action: { kind: 'project', projectId: 'wormup' }, rect: { x: 848, y: 320, w: 191, h: 302 }, outline: 'poster' },
    { id: 'poster-rubato', label: 'RUBATO', zone: 'posterWall', action: { kind: 'project', projectId: 'rubato' }, rect: { x: 1068, y: 328, w: 197, h: 300 }, outline: 'poster' },
    { id: 'cabinet', label: 'Archive', zone: 'archive', action: { kind: 'panel', panelId: 'archive' }, rect: { x: 850, y: 761, w: 143, h: 140 }, outline: 'cabinet', sfx: 'drawer', inMenu: true },
    { id: 'pc', label: 'Games', zone: 'mainDesk', action: { kind: 'panel', panelId: 'pc' }, rect: { x: 1462, y: 563, w: 233, h: 200 }, outline: 'monitor', sfx: 'keyboard', inMenu: true },
    { id: 'workbench', label: 'About the studio', zone: 'workbench', action: { kind: 'panel', panelId: 'about' }, rect: { x: 2048, y: 256, w: 274, h: 344 }, outline: 'rect', sfx: 'drawer', inMenu: true },
    { id: 'fridge', label: "Today's snack", zone: 'fridgeArea', action: { kind: 'panel', panelId: 'fridge' }, rect: { x: 2346, y: 560, w: 211, h: 395 }, outline: 'fridge', sfx: 'wrapper' },
    { id: 'tv', label: 'Contact', zone: 'tvArea', action: { kind: 'panel', panelId: 'contact' }, rect: { x: 2674, y: 583, w: 304, h: 196 }, outline: 'tv', sfx: 'click', inMenu: true },
    { id: 'secret-door', label: 'Locked', zone: 'secretDoor', action: { kind: 'panel', panelId: 'secret' }, rect: { x: 3212, y: 603, w: 204, h: 372 }, outline: 'arch', sfx: 'bell' },
  ],
}

export const MOBILE_WORLD: WorldLayout = {
  width: 1100,
  height: 2619,
  start: { x: 550, y: 700 },
  // Two walkable strips: the middle floor and the bottom one. The wall
  // between them is blocked, so nobody strolls up the plaster.
  floor: { top: 1547, bottom: 2570 },
  window: { x: 300, y: 1720, w: 300, h: 230 },
  zones: [
    { id: 'posterWall', label: 'Poster wall', rect: { x: 330, y: 240, w: 610, h: 200 } },
    { id: 'shelf', label: 'Shelf', rect: { x: 60, y: 110, w: 240, h: 460 } },
    { id: 'archive', label: 'Archive', rect: { x: 350, y: 555, w: 220, h: 160 } },
    { id: 'restArea', label: 'Rest area', rect: { x: 150, y: 1560, w: 500, h: 130 }, blocks: { x: 150, y: 1560, w: 340, h: 90 } },
    { id: 'mainDesk', label: 'Main desk', rect: { x: 400, y: 1560, w: 500, h: 130 } },
    { id: 'workbench', label: 'Workbench', rect: { x: 820, y: 1110, w: 160, h: 270 } },
    { id: 'centreFloor', label: 'Centre floor', rect: { x: 150, y: 2460, w: 800, h: 110 } },
    { id: 'fridgeArea', label: 'Fridge', rect: { x: 260, y: 2100, w: 160, h: 360 } },
    { id: 'tvArea', label: 'TV', rect: { x: 490, y: 2160, w: 190, h: 300 } },
    { id: 'secretDoor', label: 'Secret door', rect: { x: 830, y: 2110, w: 160, h: 340 } },
    // The plaster between the two floors is not walkable.
    { id: 'entry', label: 'Wall', rect: { x: 0, y: 1700, w: 1100, h: 740 }, blocks: { x: 0, y: 1700, w: 1100, h: 740 } },
  ],
  objects: [
    { id: 'shelf', label: 'Collection', zone: 'shelf', action: { kind: 'panel', panelId: 'shelf' }, rect: { x: 172, y: 345, w: 128, h: 105 }, outline: 'shelf', sfx: 'drawer' },
    { id: 'poster-lunai', label: 'LUNAI', zone: 'posterWall', action: { kind: 'project', projectId: 'lunai' }, rect: { x: 324, y: 238, w: 111, h: 202 }, outline: 'poster' },
    { id: 'poster-liminal', label: 'LIMINAL', zone: 'posterWall', action: { kind: 'project', projectId: 'liminal' }, rect: { x: 459, y: 238, w: 118, h: 202 }, outline: 'poster' },
    { id: 'poster-wormup', label: 'WORM UP!', zone: 'posterWall', action: { kind: 'project', projectId: 'wormup' }, rect: { x: 610, y: 232, w: 155, h: 213 }, outline: 'poster' },
    { id: 'poster-rubato', label: 'RUBATO', zone: 'posterWall', action: { kind: 'project', projectId: 'rubato' }, rect: { x: 789, y: 238, w: 126, h: 202 }, outline: 'poster' },
    { id: 'cabinet', label: 'Archive', zone: 'archive', action: { kind: 'panel', panelId: 'archive' }, rect: { x: 424, y: 522, w: 142, h: 82 }, outline: 'cabinet', sfx: 'drawer', inMenu: true },
    { id: 'pc', label: 'Games', zone: 'mainDesk', action: { kind: 'panel', panelId: 'pc' }, rect: { x: 439, y: 1251, w: 158, h: 135 }, outline: 'monitorPortrait', sfx: 'keyboard', inMenu: true },
    { id: 'workbench', label: 'About the studio', zone: 'workbench', action: { kind: 'panel', panelId: 'about' }, rect: { x: 831, y: 1152, w: 169, h: 147 }, outline: 'rect', sfx: 'drawer', inMenu: true },
    { id: 'fridge', label: "Today's snack", zone: 'fridgeArea', action: { kind: 'panel', panelId: 'fridge' }, rect: { x: 276, y: 2121, w: 158, h: 285 }, outline: 'fridge', sfx: 'wrapper' },
    { id: 'tv', label: 'Contact', zone: 'tvArea', action: { kind: 'panel', panelId: 'contact' }, rect: { x: 506, y: 2138, w: 196, h: 169 }, outline: 'tv', sfx: 'click', inMenu: true },
    { id: 'secret-door', label: 'Locked', zone: 'secretDoor', action: { kind: 'panel', panelId: 'secret' }, rect: { x: 862, y: 2149, w: 129, h: 270 }, outline: 'arch', sfx: 'bell' },
  ],
}

/** The painted room behind everything, one plate per orientation. */
export const ROOM_ART = {
  landscape: { src: `${ART}/room_landscape.webp`, w: 3600, h: 1200 },
  portrait: { src: `${ART}/room_portrait.webp`, w: 1100, h: 2619 },
} as const

/** Keyed cut-outs of the same furniture, shown inside the panel it opens. */
export const OBJECT_ART: Record<string, string> = {
  pc: `${ART}/pc.webp`,
  workbench: `${ART}/workbench.webp`,
  cabinet: `${ART}/cabinet.webp`,
  tv: `${ART}/tv.webp`,
  'secret-door': `${ART}/secret_door.webp`,
  fridge: `${ART}/fridge.webp`,
  shelf: `${ART}/shelf.webp`,
}

export function worldFor(portrait: boolean): WorldLayout {
  return portrait ? MOBILE_WORLD : DESKTOP_WORLD
}
