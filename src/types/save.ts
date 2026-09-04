/** Everything the site remembers about a visitor. No accounts, no personal data. */
export interface SaveDataV1 {
  readonly v: 1
  /** How many separate visits (not page views) this browser has made. */
  visitCount: number
  /** ISO date of the previous visit, or null on the first one. */
  lastVisit: string | null
  /** Project ids the visitor has opened. */
  visitedProjects: string[]
  /** DOKKA CREW ids the visitor has met — drives DOKKADEX. */
  discoveredCharacters: string[]
  /** Easter egg ids already fired (used for once-only eggs). */
  easterEggs: string[]
  /** 0-3. Three mini-game first-clears open the secret room. */
  secretProgress: number
  /** Sound is off until the visitor asks for it. */
  soundEnabled: boolean
}

/** The current schema. Bump the union when a V2 arrives. */
export type SaveData = SaveDataV1

export const SAVE_VERSION = 1 as const
