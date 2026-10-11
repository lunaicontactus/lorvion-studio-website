/**
 * PUBLIC ARCHIVE — the record room, `/archive.html` (SITE UPGRADE PHASE G).
 *
 * The page is shelves: one per category that has anything on it
 * (src/data/publicArchive.ts), in the works pages' own paper-and-felt
 * language. A picture opens in the works' viewer, one at a time, with the
 * rest of its shelf behind ‹ ›. A work's screenshots are not copied here; the
 * card goes to that work's gallery. The songs play in the page, one at a time,
 * and only when asked.
 */
import { shelves, type ArchivePicture } from '@/data/publicArchive'
import { recordsIndexHtml, recordsShelvesHtml } from '@/render/pages'
import { makeViewer, type Shot } from '@/ui/works'

export function mountRecords(root: ParentNode = document): void {
  const host = root.querySelector<HTMLElement>('[data-records-shelves]')
  if (!host) return
  const index = root.querySelector<HTMLElement>('[data-records-index]')
  const list = shelves()

  if (index && !index.hasAttribute('data-prerendered')) index.innerHTML = recordsIndexHtml()
  if (!host.hasAttribute('data-prerendered')) host.innerHTML = recordsShelvesHtml()

  // On the page, not in a shelf: the shelves arrive with a transform, and a
  // fixed viewer inside one would scroll away with it.
  const viewer = makeViewer()
  ;(host.closest('main') ?? document.body).append(viewer.el)
  for (const s of list) {
    const pictures = s.entries.filter((e): e is ArchivePicture => e.kind === 'picture')
    if (!pictures.length) continue
    const shots: Shot[] = pictures.map((p) => ({
      src: p.full, w: p.w, h: p.h, caption: p.title,
      tag: [p.badge, p.date, p.source].filter(Boolean).join(' · '), polaroid: false,
    }))
    const shelf = host.querySelector(`[data-shelf="${s.category.id}"]`)
    for (const btn of shelf?.querySelectorAll<HTMLButtonElement>('[data-record-shot]') ?? []) {
      btn.addEventListener('click', () => viewer.open(shots, Number(btn.dataset['recordShot']), btn))
    }
  }

  // One song at a time, as everywhere else on the site (PHASE F).
  const tracks = [...host.querySelectorAll<HTMLAudioElement>('audio')]
  for (const a of tracks) {
    a.addEventListener('play', () => { for (const b of tracks) if (b !== a && !b.paused) b.pause() })
  }

  requestAnimationFrame(() => document.body.classList.add('is-arrived'))
}
