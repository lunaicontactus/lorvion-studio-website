/**
 * The Dokkaebi Playground as a place (PHASE 9).
 *
 * One painted plate per orientation, and the camera moves inside it the way
 * it does in the garage. The three buildings, the arch back into the garage
 * and the small signpost are all *in the painting* — the user's master plate
 * already has them — so, as in the garage, the places below are hit areas
 * over what is painted and draw nothing of their own. The delivered
 * building cut-outs are used only where the garage uses its furniture
 * cut-outs: as the thing that grows out of its place when it is touched.
 * Nothing is painted twice.
 *
 * Every rectangle was read off the plate with a 100-unit grid
 * (inv/p6/pg_grid_*.jpg). World units are the plate's own pixels.
 */
import type { PropDef } from '@/data/props'
import type { SceneLayout, ScenePlace } from '@/scenes/scene'

const ART = '/assets/images/playground'

export type PlaceId = 'poko-office' | 'snack-stall' | 'parcel-office' | 'garage-door' | 'signpost'

export interface Place extends ScenePlace {
  readonly id: PlaceId
  /** The game behind the door, if this is one of the three. */
  readonly game?: 'mugunghwa' | 'snack' | 'parcel'
}

export interface Fire {
  readonly x: number
  readonly y: number
  /** Relative size; the smallest are the furthest away. */
  readonly scale: number
  /** Seconds, so no two breathe together. */
  readonly period: number
  readonly phase: number
}

export interface PlaygroundLayout extends SceneLayout {
  readonly places: readonly Place[]
  readonly fires: readonly Fire[]
}

const PLACES_LANDSCAPE: readonly Place[] = [
  { id: 'poko-office', label: 'POKO 사무실', caption: 'POKO 사무실 · 부장님 몰래', rect: { x: 110, y: 110, w: 360, h: 290 }, game: 'mugunghwa' },
  { id: 'snack-stall', label: '간식 노점', caption: '간식 노점 · 야식 심부름', rect: { x: 610, y: 205, w: 380, h: 175 }, game: 'snack' },
  { id: 'parcel-office', label: '택배 사무소', caption: '택배 사무소 · 택배 정리', rect: { x: 1250, y: 160, w: 400, h: 250 }, game: 'parcel' },
  { id: 'signpost', label: '이정표', caption: '이정표', rect: { x: 415, y: 615, w: 90, h: 110 } },
  { id: 'garage-door', label: '차고로 돌아가기', caption: '차고 문 · 돌아가기', rect: { x: 700, y: 540, w: 330, h: 220 } },
]

const PLACES_PORTRAIT: readonly Place[] = [
  { id: 'poko-office', label: 'POKO 사무실', caption: 'POKO 사무실 · 부장님 몰래', rect: { x: 105, y: 205, w: 305, h: 215 }, game: 'mugunghwa' },
  { id: 'snack-stall', label: '간식 노점', caption: '간식 노점 · 야식 심부름', rect: { x: 235, y: 565, w: 360, h: 165 }, game: 'snack' },
  { id: 'parcel-office', label: '택배 사무소', caption: '택배 사무소 · 택배 정리', rect: { x: 700, y: 445, w: 240, h: 195 }, game: 'parcel' },
  { id: 'signpost', label: '이정표', caption: '이정표', rect: { x: 100, y: 1120, w: 90, h: 105 } },
  { id: 'garage-door', label: '차고로 돌아가기', caption: '차고 문 · 돌아가기', rect: { x: 345, y: 1030, w: 270, h: 240 } },
]

export const PLAYGROUND_LANDSCAPE: PlaygroundLayout = {
  width: 1672, height: 941,
  plate: `${ART}/world_landscape.webp`,
  foreground: `${ART}/foreground.webp`,
  // On the arch, which is where the visitor came in — and high enough that
  // on a phone held sideways, where the plate is cut top and bottom, the
  // three buildings are in the first view with it.
  start: { x: 865, y: 470 },
  places: PLACES_LANDSCAPE,
  // Three, over the water on the left, by the bridge on the right, and low
  // by the pond: the painting already has small lights in these places.
  fires: [
    { x: 185, y: 515, scale: 1, period: 6.2, phase: 0 },
    { x: 1310, y: 470, scale: 0.8, period: 7.4, phase: 2.1 },
    { x: 1585, y: 560, scale: 0.65, period: 5.6, phase: 3.7 },
  ],
}

export const PLAYGROUND_PORTRAIT: PlaygroundLayout = {
  width: 941, height: 1672,
  plate: `${ART}/world_portrait.webp`,
  foreground: `${ART}/foreground.webp`,
  start: { x: 470, y: 1090 },
  places: PLACES_PORTRAIT,
  fires: [
    { x: 70, y: 545, scale: 0.85, period: 6.2, phase: 0 },
    { x: 870, y: 1080, scale: 0.8, period: 7.4, phase: 2.1 },
    { x: 780, y: 1000, scale: 0.6, period: 5.6, phase: 3.7 },
  ],
}

export function playgroundFor(portrait: boolean): PlaygroundLayout {
  return portrait ? PLAYGROUND_PORTRAIT : PLAYGROUND_LANDSCAPE
}

/**
 * The building cut-outs, as things that grow out of their place (the same
 * mechanism as the garage's furniture, src/ui/panels.ts). The surface is the
 * doorway or counter, where the one line and the way in sit.
 */
export const PLACE_PROPS: Readonly<Partial<Record<PlaceId, PropDef>>> = {
  'poko-office': {
    art: `${ART}/poko_office.webp`, w: 770, h: 723,
    surface: { x: 0.24, y: 0.36, w: 0.52, h: 0.34 },
    min: { w: 240, h: 150 },
  },
  'snack-stall': {
    art: `${ART}/snack_stall.webp`, w: 768, h: 808,
    surface: { x: 0.18, y: 0.5, w: 0.62, h: 0.26 },
    min: { w: 260, h: 120 },
  },
  'parcel-office': {
    art: `${ART}/parcel_office.webp`, w: 771, h: 940,
    surface: { x: 0.2, y: 0.46, w: 0.56, h: 0.3 },
    min: { w: 240, h: 150 },
  },
  signpost: {
    art: `${ART}/signpost.webp`, w: 648, h: 973,
    // The three painted arms, top to bottom: glasses, bowl, parcel.
    surface: { x: 0.34, y: 0.1, w: 0.6, h: 0.57 },
    min: { w: 200, h: 300 },
  },
  // The arch back into the garage opens nothing: it is the way home.
}

/** The signpost's three arms, for the reader: where each points. */
export const SIGNPOST_ARMS: readonly { readonly place: PlaceId; readonly text: string }[] = [
  { place: 'poko-office', text: 'POKO 사무실' },
  { place: 'snack-stall', text: '간식 노점' },
  { place: 'parcel-office', text: '택배 사무소' },
]
