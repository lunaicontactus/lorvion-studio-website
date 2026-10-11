/**
 * The pages that exist so the room is never the only way in.
 *
 * A visitor who cannot or will not walk through the garage — a search
 * crawler, an app-store reviewer following a link, somebody on a slow phone —
 * still needs the studio. This page carries the same content the objects in
 * the room open, rendered from the same registries, so the two can never
 * drift apart. The works have their own pages (src/ui/works.ts).
 */
import { studioHtml } from '@/render/pages'

export function mountFallback(root: ParentNode = document): void {
  const studioHost = root.querySelector<HTMLElement>('[data-fallback-studio]')
  if (studioHost && !studioHost.hasAttribute('data-prerendered')) studioHost.innerHTML = studioHtml()
}
