/**
 * Who owns the music (WORLD 2.4).
 *
 * At any moment exactly one thing may be sounding as music: the garage's
 * own song, the radio's station, or the world outside the room (the
 * playground, the archive, a game). Room air and the loops under the music
 * are not music. The rule is written here, on its own, so it can be tested
 * without a browser; src/systems/audio.ts applies it to the players.
 */
export type MusicOwner = 'garage' | 'radio' | 'archive' | 'playground' | 'game' | null

export type WorldOwner = Exclude<MusicOwner, 'garage' | 'radio' | null>

export interface MusicState {
  /** Inside the garage. */
  readonly inRoom: boolean
  /** The radio's own switch, apart from the site's sound switch. */
  readonly radioOn: boolean
  /** The world's music, if the visitor is in one. */
  readonly world: WorldOwner | null
}

/** The one owner the state allows: the world if in one, else the room's. */
export function ownerFor(s: MusicState): MusicOwner {
  if (s.world) return s.world
  if (!s.inRoom) return null
  return s.radioOn ? 'radio' : 'garage'
}

/**
 * How the music changes hands, in milliseconds: the one going out finishes
 * before the next comes in — never both at once, never a crossfade.
 */
export const HANDS = {
  /** The garage's song down and out, before the station comes on. */
  garageOut: 800,
  /** The station up, once the room is silent. */
  radioIn: 600,
  /** The station down and out, before the room's song comes back. */
  radioOut: 500,
  /** The room's song back, from where it was. */
  garageIn: 800,
  /** One station down, the next up. */
  stationOut: 180,
  stationIn: 260,
  /** A world's music going out before another's, at a door. */
  world: 420,
} as const
