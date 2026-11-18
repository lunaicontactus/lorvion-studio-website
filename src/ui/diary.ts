/**
 * DIARY page behaviour (EUNGARAGE 2.0, PART 11): the kind filter, and a page
 * turn when a note opens. The notes are <details>, prerendered; this only
 * wires them. Opening a note by its address (diary.html#<id>) opens it.
 */
import { diaryHtml } from '@/render/pages'

export function mountDiary(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>('[data-diary]')
  if (!host) return undefined
  if (!host.hasAttribute('data-prerendered')) host.innerHTML = diaryHtml()

  const onClick = (e: MouseEvent): void => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-diary-filter]')
    if (!b) return
    const kind = b.dataset['diaryFilter'] ?? ''
    for (const x of host.querySelectorAll<HTMLButtonElement>('[data-diary-filter]')) x.setAttribute('aria-pressed', String(x === b))
    for (const li of host.querySelectorAll<HTMLElement>('.diary-entry')) li.hidden = kind !== '' && li.dataset['kind'] !== kind
  }
  const onToggle = (e: Event): void => {
    const d = e.target as HTMLDetailsElement
    if (!d.matches?.('.diary-note') || !d.open) return
    d.classList.remove('is-turning')
    void d.offsetWidth
    d.classList.add('is-turning')
  }
  const openHash = (): void => {
    const id = decodeURIComponent(location.hash.slice(1))
    const li = id ? document.getElementById(id) : null
    const d = li?.querySelector<HTMLDetailsElement>('.diary-note')
    if (d) {
      d.open = true
      li!.scrollIntoView({ block: 'start' })
    }
  }
  host.addEventListener('click', onClick)
  host.addEventListener('toggle', onToggle, true)
  window.addEventListener('hashchange', openHash)
  openHash()
  return () => {
    host.removeEventListener('click', onClick)
    host.removeEventListener('toggle', onToggle, true)
    window.removeEventListener('hashchange', openHash)
  }
}
