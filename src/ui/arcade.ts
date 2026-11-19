/**
 * ARCADE page behaviour (EUNGARAGE 2.0, PART 14): this browser's best score
 * on each card. The cards themselves are prerendered (arcadeHtml).
 */
import { arcadeHtml } from '@/render/pages2'
import { progressFor } from '@/games/scores'

export function mountArcade(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>('[data-arcade]')
  if (!host) return undefined
  if (!host.hasAttribute('data-prerendered')) host.innerHTML = arcadeHtml()
  for (const card of host.querySelectorAll<HTMLElement>('[data-arcade-game]')) {
    const p = progressFor(card.dataset['arcadeGame'] ?? '')
    const b = card.querySelector('[data-arcade-best] b')
    if (b && p.plays > 0) b.textContent = `${p.best}점${p.stars > 0 ? ` · ${'★'.repeat(p.stars)}` : ''}`
  }
  return undefined
}
