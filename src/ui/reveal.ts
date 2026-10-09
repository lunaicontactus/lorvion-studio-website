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

  // Shown once any of it has come a little way up the screen. Not a share of
  // its own height: that ratio is out of reach for anything much taller than
  // the screen — LUNAI's privacy policy is 6,000 px on a phone and needed
  // 1,081 px of an 844 px screen, so its text never appeared there.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        io.unobserve(entry.target)
      }
    },
    { threshold: 0, rootMargin: '0px 0px -12% 0px' },
  )
  for (const el of items) io.observe(el)
  return () => io.disconnect()
}
