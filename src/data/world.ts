/**
 * The garage as a place, not a picture.
 *
 * The room is larger than the screen: the camera moves inside it and the crew
 * walk around in the same coordinates. Desktop is a wide room explored left to
 * right; portrait is a taller, narrower room explored up and down. Same zones,
 * same objects, same progression — only the coordinates differ, which is why
 * they are two data tables rather than one scaled by a factor.
 *
 * Nothing here is art. The room is drawn from these rectangles in CSS, so the
 * furniture and its hit area can never drift apart.
 */
import type { WorldLayout } from '@/types/world'

export const DESKTOP_WORLD: WorldLayout = {
  width: 3600,
  height: 1800,
  start: { x: 1800, y: 900 },
  floor: { top: 1180, bottom: 1660 },
  window: { x: 1520, y: 300, w: 560, h: 420 },
  zones: [
    { id: 'entry', label: 'Entry', rect: { x: 0, y: 900, w: 380, h: 900 } },
    { id: 'posterWall', label: 'Poster wall', rect: { x: 380, y: 300, w: 760, h: 880 } },
    { id: 'archive', label: 'Archive', rect: { x: 300, y: 820, w: 300, h: 420 }, blocks: { x: 300, y: 900, w: 300, h: 340 } },
    { id: 'shelf', label: 'Shelf', rect: { x: 880, y: 520, w: 320, h: 700 }, blocks: { x: 900, y: 940, w: 280, h: 300 } },
    { id: 'mainDesk', label: 'Main desk', rect: { x: 1280, y: 780, w: 620, h: 460 }, blocks: { x: 1300, y: 960, w: 580, h: 280 } },
    { id: 'centreFloor', label: 'Centre floor', rect: { x: 1200, y: 1240, w: 1200, h: 420 } },
    { id: 'workbench', label: 'Workbench', rect: { x: 2020, y: 800, w: 560, h: 440 }, blocks: { x: 2040, y: 950, w: 520, h: 290 } },
    { id: 'restArea', label: 'Rest area', rect: { x: 1560, y: 1300, w: 520, h: 320 }, blocks: { x: 1660, y: 1380, w: 320, h: 180 } },
    { id: 'tvArea', label: 'TV', rect: { x: 2660, y: 640, w: 420, h: 600 }, blocks: { x: 2680, y: 900, w: 380, h: 340 } },
    { id: 'radioArea', label: 'Radio', rect: { x: 2620, y: 480, w: 240, h: 200 } },
    { id: 'fridgeArea', label: 'Fridge', rect: { x: 3120, y: 660, w: 300, h: 620 }, blocks: { x: 3120, y: 700, w: 300, h: 560 } },
    { id: 'secretDoor', label: 'Secret door', rect: { x: 3440, y: 700, w: 160, h: 560 }, blocks: { x: 3440, y: 700, w: 160, h: 560 } },
  ],
  objects: [
    { id: 'exit-door', label: 'Back to the alley', zone: 'entry', action: { kind: 'exit' }, rect: { x: 40, y: 820, w: 260, h: 520 }, sfx: 'door' },
    { id: 'poster-lunai', label: 'LUNAI', zone: 'posterWall', action: { kind: 'project', projectId: 'lunai' }, rect: { x: 430, y: 360, w: 220, h: 330 } },
    { id: 'poster-liminal', label: 'LIMINAL', zone: 'posterWall', action: { kind: 'project', projectId: 'liminal' }, rect: { x: 690, y: 360, w: 220, h: 330 } },
    { id: 'poster-wormup', label: 'WORM UP!', zone: 'posterWall', action: { kind: 'project', projectId: 'wormup' }, rect: { x: 430, y: 730, w: 220, h: 330 } },
    { id: 'poster-rubato', label: 'RUBATO', zone: 'posterWall', action: { kind: 'project', projectId: 'rubato' }, rect: { x: 690, y: 730, w: 220, h: 330 } },
    { id: 'cabinet', label: 'Archive', zone: 'archive', action: { kind: 'panel', panelId: 'archive' }, rect: { x: 300, y: 860, w: 300, h: 380 }, sfx: 'drawer', inMenu: true },
    { id: 'shelf', label: 'Collection', zone: 'shelf', action: { kind: 'panel', panelId: 'shelf' }, rect: { x: 900, y: 560, w: 280, h: 420 }, sfx: 'drawer' },
    { id: 'pc', label: 'Games', zone: 'mainDesk', action: { kind: 'panel', panelId: 'pc' }, rect: { x: 1470, y: 760, w: 300, h: 230 }, sfx: 'keyboard', inMenu: true },
    { id: 'workbench', label: 'About the studio', zone: 'workbench', action: { kind: 'panel', panelId: 'about' }, rect: { x: 2060, y: 830, w: 420, h: 230 }, sfx: 'drawer', inMenu: true },
    { id: 'tv', label: 'Contact', zone: 'tvArea', action: { kind: 'panel', panelId: 'contact' }, rect: { x: 2700, y: 680, w: 340, h: 250 }, sfx: 'click', inMenu: true },
    { id: 'radio', label: 'Sound', zone: 'radioArea', action: { kind: 'panel', panelId: 'radio' }, rect: { x: 2650, y: 500, w: 190, h: 140 }, sfx: 'click' },
    { id: 'fridge', label: "Today's snack", zone: 'fridgeArea', action: { kind: 'panel', panelId: 'fridge' }, rect: { x: 3140, y: 700, w: 260, h: 540 }, sfx: 'wrapper' },
    { id: 'secret-door', label: 'Locked', zone: 'secretDoor', action: { kind: 'panel', panelId: 'secret' }, rect: { x: 3440, y: 720, w: 150, h: 520 }, sfx: 'bell', locked: true },
  ],
}

export const MOBILE_WORLD: WorldLayout = {
  width: 1100,
  height: 3400,
  start: { x: 550, y: 1000 },
  // Below the poster wall: the crew belong on the floor, not up the wall.
  floor: { top: 1700, bottom: 3260 },
  window: { x: 620, y: 190, w: 420, h: 320 },
  zones: [
    { id: 'entry', label: 'Entry', rect: { x: 0, y: 0, w: 1100, h: 240 } },
    { id: 'posterWall', label: 'Poster wall', rect: { x: 60, y: 560, w: 980, h: 620 } },
    { id: 'shelf', label: 'Shelf', rect: { x: 700, y: 1240, w: 340, h: 460 }, blocks: { x: 720, y: 1420, w: 300, h: 280 } },
    { id: 'archive', label: 'Archive', rect: { x: 70, y: 1260, w: 320, h: 440 }, blocks: { x: 70, y: 1340, w: 320, h: 360 } },
    { id: 'mainDesk', label: 'Main desk', rect: { x: 120, y: 1760, w: 860, h: 420 }, blocks: { x: 140, y: 1900, w: 820, h: 280 } },
    { id: 'centreFloor', label: 'Centre floor', rect: { x: 60, y: 2200, w: 980, h: 280 } },
    { id: 'workbench', label: 'Workbench', rect: { x: 100, y: 2260, w: 760, h: 380 }, blocks: { x: 120, y: 2390, w: 720, h: 250 } },
    { id: 'restArea', label: 'Rest area', rect: { x: 640, y: 2660, w: 400, h: 260 }, blocks: { x: 700, y: 2720, w: 280, h: 160 } },
    { id: 'tvArea', label: 'TV', rect: { x: 80, y: 2700, w: 480, h: 460 }, blocks: { x: 90, y: 2900, w: 440, h: 260 } },
    { id: 'radioArea', label: 'Radio', rect: { x: 620, y: 2480, w: 260, h: 180 } },
    { id: 'fridgeArea', label: 'Fridge', rect: { x: 720, y: 3000, w: 300, h: 400 }, blocks: { x: 720, y: 3020, w: 300, h: 380 } },
    { id: 'secretDoor', label: 'Secret door', rect: { x: 120, y: 3180, w: 300, h: 220 }, blocks: { x: 120, y: 3180, w: 300, h: 220 } },
  ],
  objects: [
    { id: 'exit-door', label: 'Back to the alley', zone: 'entry', action: { kind: 'exit' }, rect: { x: 400, y: 40, w: 300, h: 180 }, sfx: 'door' },
    { id: 'poster-lunai', label: 'LUNAI', zone: 'posterWall', action: { kind: 'project', projectId: 'lunai' }, rect: { x: 110, y: 600, w: 210, h: 260 } },
    { id: 'poster-liminal', label: 'LIMINAL', zone: 'posterWall', action: { kind: 'project', projectId: 'liminal' }, rect: { x: 370, y: 600, w: 210, h: 260 } },
    { id: 'poster-wormup', label: 'WORM UP!', zone: 'posterWall', action: { kind: 'project', projectId: 'wormup' }, rect: { x: 630, y: 600, w: 210, h: 260 } },
    { id: 'poster-rubato', label: 'RUBATO', zone: 'posterWall', action: { kind: 'project', projectId: 'rubato' }, rect: { x: 370, y: 890, w: 210, h: 260 } },
    { id: 'cabinet', label: 'Archive', zone: 'archive', action: { kind: 'panel', panelId: 'archive' }, rect: { x: 70, y: 1300, w: 320, h: 400 }, sfx: 'drawer', inMenu: true },
    { id: 'shelf', label: 'Collection', zone: 'shelf', action: { kind: 'panel', panelId: 'shelf' }, rect: { x: 720, y: 1280, w: 300, h: 380 }, sfx: 'drawer' },
    { id: 'pc', label: 'Games', zone: 'mainDesk', action: { kind: 'panel', panelId: 'pc' }, rect: { x: 350, y: 1770, w: 400, h: 280 }, sfx: 'keyboard', inMenu: true },
    { id: 'workbench', label: 'About the studio', zone: 'workbench', action: { kind: 'panel', panelId: 'about' }, rect: { x: 150, y: 2290, w: 480, h: 230 }, sfx: 'drawer', inMenu: true },
    { id: 'tv', label: 'Contact', zone: 'tvArea', action: { kind: 'panel', panelId: 'contact' }, rect: { x: 110, y: 2740, w: 400, h: 280 }, sfx: 'click', inMenu: true },
    { id: 'radio', label: 'Sound', zone: 'radioArea', action: { kind: 'panel', panelId: 'radio' }, rect: { x: 640, y: 2500, w: 210, h: 150 }, sfx: 'click' },
    { id: 'fridge', label: "Today's snack", zone: 'fridgeArea', action: { kind: 'panel', panelId: 'fridge' }, rect: { x: 730, y: 3020, w: 270, h: 370 }, sfx: 'wrapper' },
    { id: 'secret-door', label: 'Locked', zone: 'secretDoor', action: { kind: 'panel', panelId: 'secret' }, rect: { x: 130, y: 3190, w: 280, h: 200 }, sfx: 'bell', locked: true },
  ],
}

export function worldFor(portrait: boolean): WorldLayout {
  return portrait ? MOBILE_WORLD : DESKTOP_WORLD
}
