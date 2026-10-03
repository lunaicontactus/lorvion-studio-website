/**
 * WHAT'S NEW — what the parcel by the door brings, once there is news
 * (SITE UPGRADE PHASE D).
 *
 * Empty on purpose. There is no devlog and no announcement to show yet, and
 * the parcel does not make one up: until something real is written here, it
 * keeps bringing the week's shopping (src/data/garage/parcels.ts). When an
 * item is added, the parcel brings the newest one the visitor has not opened
 * yet, with its real date and, where there is one, the page it is about.
 */
export interface NewsItem {
  readonly id: string
  /** The real date, YYYY.MM.DD. */
  readonly date: string
  readonly title: string
  readonly body: string
  /** A page on this site the news is about. */
  readonly href?: string
}

export const NEWS: readonly NewsItem[] = []

/** The newest item not yet seen, if any. */
export function nextNews(seen: readonly string[], items: readonly NewsItem[] = NEWS): NewsItem | null {
  return [...items].sort((a, b) => b.date.localeCompare(a.date)).find((n) => !seen.includes(n.id)) ?? null
}
