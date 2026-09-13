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
 *
 * `enabled` is the whole switch for a thing: false means it is in the room and
 * says so when touched, but has nothing behind it yet. Turning one on is a
 * one-word change here plus the interaction it names.
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
    { id: 'shelf', label: 'Collection', zone: 'shelf', kind: 'storage', enabled: true, action: { kind: 'panel', panelId: 'shelf' }, rect: { x: 244, y: 205, w: 171, h: 412 }, outline: 'shelf', sfx: 'drawer' },
    { id: 'poster-lunai', label: 'LUNAI', zone: 'posterWall', kind: 'paper', enabled: true, action: { kind: 'project', projectId: 'lunai' }, rect: { x: 455, y: 335, w: 168, h: 288 }, outline: 'poster' },
    { id: 'poster-liminal', label: 'LIMINAL', zone: 'posterWall', kind: 'paper', enabled: true, action: { kind: 'project', projectId: 'liminal' }, rect: { x: 651, y: 335, w: 168, h: 280 }, outline: 'poster' },
    { id: 'poster-wormup', label: 'WORM UP!', zone: 'posterWall', kind: 'paper', enabled: true, action: { kind: 'project', projectId: 'wormup' }, rect: { x: 848, y: 320, w: 191, h: 302 }, outline: 'poster' },
    { id: 'poster-rubato', label: 'RUBATO', zone: 'posterWall', kind: 'paper', enabled: true, action: { kind: 'project', projectId: 'rubato' }, rect: { x: 1068, y: 328, w: 197, h: 300 }, outline: 'poster' },
    { id: 'cabinet', label: 'Studio file', zone: 'archive', kind: 'storage', enabled: true, action: { kind: 'panel', panelId: 'cabinet' }, rect: { x: 850, y: 761, w: 143, h: 130 }, outline: 'cabinet', sfx: 'drawer', inMenu: true },
    { id: 'pc', label: 'Games', zone: 'mainDesk', kind: 'screen', enabled: true, action: { kind: 'panel', panelId: 'pc' }, rect: { x: 1462, y: 563, w: 233, h: 200 }, outline: 'monitor', sfx: 'keyboard', inMenu: true },
    { id: 'workbench', label: 'Currently building', zone: 'workbench', kind: 'desk', enabled: true, action: { kind: 'panel', panelId: 'building' }, rect: { x: 2048, y: 256, w: 274, h: 344 }, outline: 'rect', sfx: 'drawer', inMenu: true },
    { id: 'fridge', label: "Today's snack", zone: 'fridgeArea', kind: 'appliance', enabled: true, action: { kind: 'panel', panelId: 'fridge' }, rect: { x: 2362, y: 573, w: 200, h: 397 }, outline: 'fridge', sfx: 'wrapper' },
    { id: 'tv', label: 'Contact', zone: 'tvArea', kind: 'screen', enabled: true, action: { kind: 'panel', panelId: 'contact' }, rect: { x: 2680, y: 585, w: 305, h: 203 }, outline: 'tv', sfx: 'click', inMenu: true },
    { id: 'secret-door', label: 'Locked', zone: 'secretDoor', kind: 'door', enabled: true, action: { kind: 'panel', panelId: 'secret' }, rect: { x: 3212, y: 603, w: 210, h: 372 }, outline: 'arch', sfx: 'bell' },
    // Not in the painting: the week's parcel, put down between the television
    // and the door mat. Its base line is below the walkway (the crew's feet
    // stop at 1075), so anyone passing goes behind it. 130 x 108 keeps the
    // cut-out's own 520:431, and both states share that canvas.
    { id: 'parcel', label: 'Parcel', zone: 'entry', kind: 'storage', enabled: true, action: { kind: 'toggle' }, rect: { x: 3030, y: 1004, w: 130, h: 108 }, art: `${ART}/prop_parcel_closed.webp`, artOpen: `${ART}/prop_parcel_open.webp`, sfx: 'wrapper' },
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
    { id: 'shelf', label: 'Collection', zone: 'shelf', kind: 'storage', enabled: true, action: { kind: 'panel', panelId: 'shelf' }, rect: { x: 172, y: 345, w: 128, h: 105 }, outline: 'shelf', sfx: 'drawer' },
    { id: 'poster-lunai', label: 'LUNAI', zone: 'posterWall', kind: 'paper', enabled: true, action: { kind: 'project', projectId: 'lunai' }, rect: { x: 324, y: 238, w: 111, h: 202 }, outline: 'poster' },
    { id: 'poster-liminal', label: 'LIMINAL', zone: 'posterWall', kind: 'paper', enabled: true, action: { kind: 'project', projectId: 'liminal' }, rect: { x: 459, y: 238, w: 118, h: 202 }, outline: 'poster' },
    { id: 'poster-wormup', label: 'WORM UP!', zone: 'posterWall', kind: 'paper', enabled: true, action: { kind: 'project', projectId: 'wormup' }, rect: { x: 610, y: 232, w: 155, h: 213 }, outline: 'poster' },
    { id: 'poster-rubato', label: 'RUBATO', zone: 'posterWall', kind: 'paper', enabled: true, action: { kind: 'project', projectId: 'rubato' }, rect: { x: 789, y: 238, w: 126, h: 202 }, outline: 'poster' },
    { id: 'cabinet', label: 'Studio file', zone: 'archive', kind: 'storage', enabled: true, action: { kind: 'panel', panelId: 'cabinet' }, rect: { x: 424, y: 522, w: 142, h: 82 }, outline: 'cabinet', sfx: 'drawer', inMenu: true },
    { id: 'pc', label: 'Games', zone: 'mainDesk', kind: 'screen', enabled: true, action: { kind: 'panel', panelId: 'pc' }, rect: { x: 439, y: 1251, w: 158, h: 135 }, outline: 'monitorPortrait', sfx: 'keyboard', inMenu: true },
    { id: 'workbench', label: 'Currently building', zone: 'workbench', kind: 'desk', enabled: true, action: { kind: 'panel', panelId: 'building' }, rect: { x: 831, y: 1152, w: 169, h: 147 }, outline: 'rect', sfx: 'drawer', inMenu: true },
    { id: 'fridge', label: "Today's snack", zone: 'fridgeArea', kind: 'appliance', enabled: true, action: { kind: 'panel', panelId: 'fridge' }, rect: { x: 276, y: 2121, w: 158, h: 306 }, outline: 'fridge', sfx: 'wrapper' },
    { id: 'tv', label: 'Contact', zone: 'tvArea', kind: 'screen', enabled: true, action: { kind: 'panel', panelId: 'contact' }, rect: { x: 508, y: 2138, w: 190, h: 147 }, outline: 'tv', sfx: 'click', inMenu: true },
    { id: 'secret-door', label: 'Locked', zone: 'secretDoor', kind: 'door', enabled: true, action: { kind: 'panel', panelId: 'secret' }, rect: { x: 862, y: 2149, w: 129, h: 270 }, outline: 'arch', sfx: 'bell' },
    // The lower floor has no walkway in portrait, so the parcel only has to
    // clear the television stand and the mat. 150 wide is 53px at 390.
    { id: 'parcel', label: 'Parcel', zone: 'centreFloor', kind: 'storage', enabled: true, action: { kind: 'toggle' }, rect: { x: 655, y: 2436, w: 150, h: 124 }, art: `${ART}/prop_parcel_closed.webp`, artOpen: `${ART}/prop_parcel_open.webp`, sfx: 'wrapper' },
  ],
}

/**
 * Placed on the floor, not in the painting, and not a hit area: the cup of
 * noodles beside the rug. `y` is the base line, which is what sorts it
 * against the crew — somebody sitting on the rug is behind it, somebody
 * walking along the front of the room is in front of it.
 */
export const DECOR: Readonly<Record<'landscape' | 'portrait', readonly { readonly art: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }[]>> = {
  landscape: [
    { art: `${ART}/prop_cup_ramen_open.webp`, x: 1384, y: 1078, w: 44, h: 55 },
  ],
  portrait: [
    { art: `${ART}/prop_cup_ramen_open.webp`, x: 462, y: 1672, w: 40, h: 50 },
  ],
}

/**
 * What the label under the pointer says. Korean, because the visitor is: the
 * aria-labels above stay as they are for the tests and the screen readers
 * that already know them. One line per thing, naming what it opens.
 */
export const CAPTIONS: Readonly<Record<string, string>> = {
  pc: 'PC · 작품과 미니게임',
  workbench: '작업대 · 스튜디오',
  tv: 'TV · 연락하기',
  fridge: '냉장고 · 오늘의 간식',
  cabinet: '캐비닛 · 자료',
  shelf: '선반 · 컬렉션',
  'secret-door': '잠긴 문',
  parcel: '택배 · 열어 보기',
  'poster-lunai': 'LUNAI',
  'poster-liminal': 'LIMINAL',
  'poster-wormup': 'WORM UP!',
  'poster-rubato': 'RUBATO',
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
