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

/**
 * Version 2 adds what the garage remembers: which things have been touched,
 * today's fridge snack, and the small collection on the shelf. A v1 save is
 * carried forward rather than thrown away — someone who visited before should
 * not lose the projects they had already opened.
 */
export interface SaveDataV2 extends Omit<SaveDataV1, 'v'> {
  readonly v: 2
  /** World object ids the visitor has touched. */
  touched: string[]
  /** ISO date the fridge last handed out a snack, and which one. */
  fridgeDay: string | null
  fridgeSnack: string | null
  /** How many times the fridge has been opened — the clue is earned, not rolled. */
  fridgeOpens: number
  /** Small things found around the room; shown on the shelf. */
  collection: string[]
}

/** The current schema. */
export type SaveData = SaveDataV2

export const SAVE_VERSION = 2 as const
