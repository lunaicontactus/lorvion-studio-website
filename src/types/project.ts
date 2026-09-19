/**
 * What a project is allowed to say about itself — the one shape the garage
 * PC, the WORKS index and each work's own page all read (src/data/projects.ts).
 */

/**
 * Where a project really is. Nothing is ever `released` unless a store page
 * exists. `testflight` is a build testers install through Apple's TestFlight
 * (not public); `prototype` is a playable proof of one part of the game.
 */
export type ProjectStatus = 'released' | 'testflight' | 'inDevelopment' | 'prototype' | 'comingSoon'

export interface ProjectLink {
  readonly label: string
  /** Absent for a line that is not a link (a private build, COMING SOON). */
  readonly href?: string
}

/** A thing done, being done, or not started — from the project's own records. */
export interface BuildItem {
  readonly label: string
  readonly state: 'done' | 'doing' | 'todo'
}

/** One entry of the development log: a real commit in the project's repository. */
export interface DevLogEntry {
  /** YYYY.MM.DD, the commit's date. */
  readonly date: string
  readonly text: string
  /** The commit's short hash. */
  readonly ref: string
}

/** A picture from the project's own repository (scripts/works_images.py). */
export interface GalleryPicture {
  /** File stem under /assets/images/works/<id>/. */
  readonly name: string
  readonly w: number
  readonly h: number
  readonly caption: string
  /** What it is, so a greybox is never mistaken for the finished game. */
  readonly kind: 'screen' | 'art' | 'concept' | 'greybox'
}

/** A list the page shows under its own heading (LUMIORA's composers, RUBATO's cast). */
export interface ProjectList {
  readonly title: string
  readonly rows: readonly { readonly name: string; readonly text: string }[]
}

export interface ProjectConfig {
  readonly id: string
  readonly title: string
  /** One line, English. */
  readonly tagline: string
  /** One line, Korean. */
  readonly taglineKo: string
  /** What kind of thing it is (TYPE on its page). */
  readonly kind: string
  /** In two or three words. */
  readonly genre: string
  readonly platforms: readonly string[]
  readonly status: ProjectStatus
  readonly engine: string
  /** Where it is now, in one line (CURRENT MILESTONE). */
  readonly milestone: string
  /** The key picture: the wall print's full copy, or a picture of the game. */
  readonly keyArt: string | null
  readonly accent: string
  readonly links: readonly ProjectLink[]
  /** Which world scene dresses this project on the PC. */
  readonly world: string
  /** WHAT IS THIS? — three to five short lines. */
  readonly about: readonly string[]
  /** CORE EXPERIENCE — what a player actually does. */
  readonly core: readonly { readonly title: string; readonly text: string }[]
  /** CURRENT BUILD, as of `asOf`. */
  readonly build: readonly BuildItem[]
  readonly asOf: string
  readonly devLog: readonly DevLogEntry[]
  readonly gallery: readonly GalleryPicture[]
  readonly lists?: readonly ProjectList[]
  /** The picture the work's page opens on, if not the key art. */
  readonly hero?: { readonly name: string; readonly w: number; readonly h: number; readonly caption: string }
}
