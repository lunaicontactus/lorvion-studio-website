/**
 * Reveal-on-scroll.
 *
 * Anything that starts hidden has to end up visible even when the observer
 * never fires — an unsupported browser or a print stylesheet would otherwise
 * leave the page blank.
 */
import { motion } from '@/systems/motion'

export function mountReveal(
  selector = '.reveal, .project',
  root: ParentNode = document,
): () => void {
  const items = [...root.querySelectorAll<HTMLElement>(selector)]
  if (items.length === 0) return () => undefined

  const showAll = (): void => {
    for (const el of items) el.classList.add('is-visible')
  }

  if (motion.reduced || typeof IntersectionObserver === 'undefined') {
    showAll()
    return () => undefined
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        io.unobserve(entry.target)
      }
    },
    { threshold: 0.18 },
  )
  for (const el of items) io.observe(el)
  return () => io.disconnect()
}
