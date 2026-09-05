/**
 * The alley layers.
 *
 * One wide base for landscape, one tall base for portrait — a portrait crop of
 * a 16:9 alley would lose the sign, and the brief rules out a shrunk desktop.
 * Everything above the base is a shared transparent layer positioned by CSS, so
 * the two orientations cost two images rather than two sets.
 */
export interface AlleyLayer {
  readonly id: string
  readonly src: string
  /** Landscape and portrait share a layer unless this narrows it. */
  readonly only?: 'landscape' | 'portrait'
  /** Parallax depth: 0 sits flat, 1 moves most. */
  readonly depth: number
  readonly alt: string
}

const DIR = '/assets/images/alley'

export const ALLEY_LAYERS: readonly AlleyLayer[] = [
  { id: 'base-landscape', src: `${DIR}/alley_base_desktop.webp`, only: 'landscape', depth: 0, alt: '' },
  { id: 'base-portrait', src: `${DIR}/alley_base_mobile.webp`, only: 'portrait', depth: 0, alt: '' },
  { id: 'shutter', src: `${DIR}/alley_shutter.webp`, depth: 0.15, alt: '' },
  { id: 'sign', src: `${DIR}/alley_sign.webp`, depth: 0.3, alt: '' },
  { id: 'props', src: `${DIR}/alley_props.webp`, depth: 0.6, alt: '' },
] as const

/** Files the entrance cannot open without. */
export const ALLEY_CRITICAL = ['base-landscape', 'base-portrait', 'shutter'] as const

/** Only one base is ever fetched — <picture> resolves the orientation. */
export const ALLEY_BASE_IDS = ['base-landscape', 'base-portrait'] as const
