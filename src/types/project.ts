/**
 * What a work says about itself in public — the one shape the garage PC, the
 * WORKS index and each work's own page read (src/data/projects.ts).
 *
 * Public only. How far the build has got, what is on the bench this week, the
 * commits, the test numbers, the QA builds: none of that is here, because
 * none of it belongs on a page about the work. The making is kept in the
 * archive's polaroids; what changes after a release is kept in `updates`,
 * written by hand.
 */

/**
 * How far along a work is, said the way a visitor would say it. Never an
 * internal stage (a greybox, a slice, a build number, a QA round): a work
 * being built is `inDevelopment`, whatever this week's milestone is called.
 * `testing` is for a test a visitor can actually join.
 */
export type ReleaseState = 'concept' | 'inDevelopment' | 'comingSoon' | 'testing' | 'available' | 'released'

export interface ProjectLink {
  readonly label: string
  /** Absent for a line that is not a link (COMING SOON). */
  readonly href?: string
}

/** A picture of the work, from its own repository (scripts/works_images.py). */
export interface GalleryPicture {
  /** File stem under /assets/images/works/<id>/. */
  readonly name: string
  readonly w: number
  readonly h: number
  readonly caption: string
}

/** A list the work shows under its own heading (LUMIORA's worlds, RUBATO's cast). */
export interface ProjectList {
  readonly title: string
  readonly rows: readonly { readonly name: string; readonly text: string }[]
}

/**
 * What changed for the people playing it, after a release. Written by hand
 * once an update is out — never generated from commits, which are a record of
 * work, not of what a player will notice.
 */
export interface UpdateNote {
  /** The version the product itself uses: `1.1`. */
  readonly version: string
  /** `2027.03.12` */
  readonly date: string
  readonly title: string
  readonly changes: readonly string[]
}

export interface ProjectConfig {
  readonly id: string
  readonly title: string
  /** One line, English. */
  readonly tagline: string
  /** One line, Korean. */
  readonly taglineKo: string
  /** What kind of thing it is (TYPE). */
  readonly kind: string
  /** In two or three words. */
  readonly genre: string
  readonly platforms: readonly string[]
  readonly releaseState: ReleaseState
  /** Only where it is part of what the work is (LIMINAL's first person). */
  readonly perspective?: string
  readonly keyArt: string | null
  readonly accent: string
  readonly links: readonly ProjectLink[]
  /** Which world scene dresses this work on the PC. */
  readonly world: string
  /** ABOUT — three to five short lines about the work, not about making it. */
  readonly about: readonly string[]
  /** CORE EXPERIENCE — what a player actually does. */
  readonly core: readonly { readonly title: string; readonly text: string }[]
  /** FEATURES — what the work already promises. */
  readonly features: readonly string[]
  readonly gallery: readonly GalleryPicture[]
  /** WORLD / STORY, where a work has one to show. */
  readonly lists?: readonly ProjectList[]
  /** Shown only once the work is out, and only if there are any. */
  readonly updates?: readonly UpdateNote[]
  /** The picture the work's page opens on, if not the key art. */
  readonly hero?: { readonly name: string; readonly w: number; readonly h: number; readonly caption: string }
}
