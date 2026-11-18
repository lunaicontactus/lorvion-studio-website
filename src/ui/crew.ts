/**
 * CREW page behaviour (EUNGARAGE 2.0): badges turn over, and each detail
 * shows its character walking. The markup is prerendered (crewHtml); this
 * only wires it. Without scripts both badge sides show, stacked.
 */
import { crewHtml } from '@/render/pages'
import { motion } from '@/systems/motion'

export function mountCrew(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>('[data-crew]')
  if (!host) return undefined
  if (!host.hasAttribute('data-prerendered')) host.innerHTML = crewHtml()
  host.classList.add('is-live')

  const onClick = (e: MouseEvent): void => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-badge-flip]')
    if (!b) return
    const card = b.closest('.badge')?.querySelector<HTMLElement>('[data-badge]')
    if (!card) return
    const on = b.getAttribute('aria-pressed') !== 'true'
    b.setAttribute('aria-pressed', String(on))
    card.classList.toggle('is-flipped', on)
    b.textContent = on ? '앞면 보기' : '사원증 뒤집기'
  }
  // Tapping the card itself turns it too (the button stays the accessible way).
  const onCard = (e: MouseEvent): void => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-badge]')
    if (!card || (e.target as HTMLElement).closest('a')) return
    card.closest('.badge')?.querySelector<HTMLButtonElement>('[data-badge-flip]')?.click()
  }
  host.addEventListener('click', onClick)
  host.addEventListener('click', onCard)

  // The walks: one shared timer for all six, only while on screen, never
  // under reduced motion.
  const walkers = [...host.querySelectorAll<HTMLImageElement>('[data-crew-walk]')]
  const frames = new Map(walkers.map((img) => [img, (img.dataset['crewWalk'] ?? '').split(' ').filter(Boolean)]))
  const visible = new Set<HTMLImageElement>()
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const img = en.target as HTMLImageElement
      if (en.isIntersecting) {
        visible.add(img)
        for (const src of frames.get(img) ?? []) { const i = new Image(); i.src = src }
      } else visible.delete(img)
    }
  })
  for (const w of walkers) io.observe(w)
  let n = 0
  const timer = setInterval(() => {
    if (motion.reduced || document.hidden) return
    n += 1
    for (const img of visible) {
      const f = frames.get(img)
      if (f && f.length) img.src = f[n % f.length]!
    }
  }, 110)

  return () => {
    clearInterval(timer)
    io.disconnect()
    host.removeEventListener('click', onClick)
    host.removeEventListener('click', onCard)
  }
}
