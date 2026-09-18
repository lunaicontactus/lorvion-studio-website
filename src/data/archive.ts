/**
 * The Secret Archive (PHASE 12): the dokkaebi's star-lit rest room, and
 * where their memories are kept.
 *
 * Like the playground, the room is the user's painted plate and the things
 * in it — the telescope, the jar of stars, the glass box on the table, the
 * chest, the lantern, the cushions — are already in the painting. The
 * places below are hit areas over them, measured off the plates with a
 * 100-unit grid (inv/p6/ar_grid_*.jpg); the delivered cut-outs are what
 * grows out of a place when it is touched. Nothing is painted twice, and
 * nothing here is a list.
 */
import type { PropDef } from '@/data/props'
import type { SceneLayout, ScenePlace } from '@/scenes/scene'

const ART = '/assets/images/archive'

export type ArchivePlaceId = 'star-jar' | 'music-box' | 'telescope' | 'memory-box' | 'lantern' | 'cushion'

export interface ArchivePlace extends ScenePlace {
  readonly id: ArchivePlaceId
}

export interface ArchiveLayout extends SceneLayout {
  readonly places: readonly ArchivePlace[]
  /** The glass, for the telescope: what fills the window when you look up. */
  readonly sky: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  /** A few stars in the glass that breathe. */
  readonly twinkles: readonly { readonly x: number; readonly y: number }[]
}

const PLACES_LANDSCAPE: readonly ArchivePlace[] = [
  { id: 'telescope', label: '망원경', caption: '망원경 · 별 보기', rect: { x: 535, y: 350, w: 175, h: 330 } },
  { id: 'star-jar', label: '별 항아리', caption: '별 항아리', rect: { x: 1480, y: 470, w: 150, h: 140 } },
  { id: 'music-box', label: '오르골', caption: '오르골', rect: { x: 1200, y: 585, w: 115, h: 110 } },
  { id: 'memory-box', label: '기억 상자', caption: '기억 상자 · 만들던 날들', rect: { x: 455, y: 575, w: 130, h: 95 } },
  { id: 'lantern', label: '작은 등', caption: '작은 등', rect: { x: 632, y: 600, w: 80, h: 100 } },
  { id: 'cushion', label: '방석과 담요', caption: '방석 · 조용히 쉬기', rect: { x: 625, y: 690, w: 220, h: 190 } },
]

const PLACES_PORTRAIT: readonly ArchivePlace[] = [
  { id: 'telescope', label: '망원경', caption: '망원경 · 별 보기', rect: { x: 640, y: 800, w: 165, h: 265 } },
  { id: 'star-jar', label: '별 항아리', caption: '별 항아리', rect: { x: 5, y: 820, w: 115, h: 135 } },
  { id: 'music-box', label: '오르골', caption: '오르골', rect: { x: 300, y: 1090, w: 105, h: 115 } },
  { id: 'memory-box', label: '기억 상자', caption: '기억 상자 · 만들던 날들', rect: { x: 800, y: 1100, w: 140, h: 115 } },
  { id: 'lantern', label: '작은 등', caption: '작은 등', rect: { x: 695, y: 1440, w: 130, h: 180 } },
  { id: 'cushion', label: '방석과 담요', caption: '방석 · 조용히 쉬기', rect: { x: 90, y: 1200, w: 360, h: 300 } },
]

export const ARCHIVE_LANDSCAPE: ArchiveLayout = {
  width: 1672, height: 941,
  plate: `${ART}/world_landscape.webp`,
  foreground: `${ART}/foreground.webp`,
  start: { x: 836, y: 470 },
  places: PLACES_LANDSCAPE,
  sky: { x: 450, y: 0, w: 1000, h: 430 },
  twinkles: [
    { x: 700, y: 120 }, { x: 900, y: 60 }, { x: 1050, y: 180 }, { x: 1250, y: 90 }, { x: 1400, y: 260 }, { x: 560, y: 220 },
  ],
}

export const ARCHIVE_PORTRAIT: ArchiveLayout = {
  width: 941, height: 1672,
  plate: `${ART}/world_portrait.webp`,
  foreground: `${ART}/foreground.webp`,
  start: { x: 470, y: 1000 },
  places: PLACES_PORTRAIT,
  sky: { x: 150, y: 0, w: 700, h: 720 },
  twinkles: [
    { x: 200, y: 300 }, { x: 480, y: 120 }, { x: 650, y: 420 }, { x: 300, y: 520 }, { x: 750, y: 280 },
  ],
}

export function archiveFor(portrait: boolean): ArchiveLayout {
  return portrait ? ARCHIVE_PORTRAIT : ARCHIVE_LANDSCAPE
}

/** The cut-outs that grow out of their place. */
export const ARCHIVE_PROPS: Readonly<Partial<Record<ArchivePlaceId, PropDef>>> = {
  'music-box': {
    art: `${ART}/music_box.webp`, w: 605, h: 729,
    // The lid, open, is the picture; the line sits below it on the box's front.
    surface: { x: 0.12, y: 0.62, w: 0.66, h: 0.24 },
    min: { w: 220, h: 90 },
  },
  'memory-box': {
    art: `${ART}/memory_box.webp`, w: 712, h: 575,
    // Over the lid: what the box held, laid on top of it.
    surface: { x: 0.08, y: 0.02, w: 0.84, h: 0.6 },
    min: { w: 300, h: 220 },
  },
}

/** The shooting star, over the glass. The user's own overlay, whole. */
export const SHOOTING_STAR = `${ART}/shooting_star.webp`
export const STAR_JAR_ART = `${ART}/star_jar.webp`
export const LANTERN_ART = `${ART}/lantern.webp`
export const TELESCOPE_ART = `${ART}/telescope.webp`
export const CUSHION_ART = `${ART}/cushion_blanket.webp`
