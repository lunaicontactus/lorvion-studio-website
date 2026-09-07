export type ProjectStatus = 'released' | 'inDevelopment' | 'prototype' | 'comingSoon'

export interface ProjectLink {
  readonly label: string
  readonly href: string
}

export interface ProjectConfig {
  readonly id: string
  readonly title: string
  /** One line. Long copy is deliberately not modelled here. */
  readonly tagline: string
  readonly taglineKo: string
  /** What kind of thing it is, in two or three words. */
  readonly genre: string
  readonly platforms: readonly string[]
  readonly status: ProjectStatus
  /** Null while the art does not exist yet — the slot renders as COMING SOON
   *  rather than being filled with a stand-in. */
  readonly keyArt: string | null
  readonly accent: string
  readonly links: readonly ProjectLink[]
  /** Which world scene dresses this project's page (STEP 12-15). */
  readonly world: string
}
