/**
 * PRESS KIT — `/press.html` (SITE UPGRADE PHASE H, docs/SITE_IA.md §11).
 *
 * Only what the repository already holds as fact: the studio's name, city and
 * address (src/data/site.ts), each work's type, genre, platform and status as
 * its own page states them (src/data/projects.ts), the key art on the garage
 * wall (src/data/artwork.ts), the logo files the site itself uses. No release
 * dates, awards, reviews, quotes, team size, founding year or store links:
 * none of them exist. Pictures are offered at the size the site keeps them.
 */
import { pressHtml } from '@/render/pages'

export { BRAND_FILES, PRESS_MAILTO } from '@/render/pages'

export function mountPress(root: ParentNode = document): void {
  const host = root.querySelector<HTMLElement>('[data-press]')
  if (host && !host.hasAttribute('data-prerendered')) host.innerHTML = pressHtml()
}
