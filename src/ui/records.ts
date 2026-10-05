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
import { shelves, type ArchiveEntry, type ArchivePicture } from '@/data/publicArchive'
import { makeViewer, type Shot } from '@/ui/works'

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const minutes = (secs: number): string => `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`

function card(e: ArchiveEntry, k: number): string {
  switch (e.kind) {
    case 'picture':
      return `
        <li><button class="work-shot records-card" type="button" data-record-shot="${k}" aria-label="${esc(e.title)} 크게 보기">
          <span class="records-card__pic"><img src="${e.thumb}" alt="" loading="lazy" decoding="async" width="${e.w}" height="${e.h}"></span>
          <span class="work-shot__cap records-card__t">${esc(e.title)}</span>
          ${e.note ? `<span class="records-card__note">${esc(e.note)}</span>` : ''}
          ${e.date || e.source ? `<span class="records-card__when">${[e.date, e.source].filter(Boolean).map((x) => esc(x!)).join(' · ')}</span>` : ''}
        </button></li>`
    case 'gallery':
      return `
        <li><a class="work-shot records-card records-card--link" href="${e.href}" data-record-gallery="${e.projectId}">
          <span class="records-card__pic"><img src="${e.thumb}" alt="" loading="lazy" decoding="async"></span>
          <span class="work-shot__cap records-card__t">${esc(e.title)}</span>
          <span class="records-card__note">${esc(e.note)} <span aria-hidden="true">→</span></span>
        </a></li>`
    case 'track':
      return `
        <li class="records-track" data-record-track="${e.id}">
          <p class="records-track__head"><b>${esc(e.title)}</b> <span class="records-track__len">${minutes(e.length)}</span></p>
          <p class="records-track__note">${esc(e.note)}</p>
          <audio controls preload="none" src="${e.src}" aria-label="${esc(e.title)}"></audio>
        </li>`
  }
}

export function mountRecords(root: ParentNode = document): void {
  const host = root.querySelector<HTMLElement>('[data-records-shelves]')
  if (!host) return
  const index = root.querySelector<HTMLElement>('[data-records-index]')
  const list = shelves()

  if (index) {
    index.innerHTML = list.map((s) =>
      `<a class="records-index__a" href="#${s.category.id}">${esc(s.category.label)}</a>`).join('')
  }
  host.innerHTML = list.map((s) => `
    <section class="work-sec records-shelf" id="${s.category.id}" aria-labelledby="shelf-${s.category.id}">
      <h2 class="work-sec__h" id="shelf-${s.category.id}">${esc(s.category.label)} <span class="records-shelf__ko">${esc(s.category.ko)}</span></h2>
      <p class="records-shelf__line">${esc(s.category.line)}</p>
      <ul class="${s.category.id === 'sound' ? 'records-tracks' : 'work-gallery records-grid'}" data-shelf="${s.category.id}">
        ${s.entries.map((e, k) => card(e, k)).join('')}
      </ul>
    </section>`).join('')

  // On the page, not in a shelf: the shelves arrive with a transform, and a
  // fixed viewer inside one would scroll away with it.
  const viewer = makeViewer()
  ;(host.closest('main') ?? document.body).append(viewer.el)
  for (const s of list) {
    const pictures = s.entries.filter((e): e is ArchivePicture => e.kind === 'picture')
    if (!pictures.length) continue
    const shots: Shot[] = pictures.map((p) => ({
      src: p.full, w: p.w, h: p.h, caption: p.title,
      tag: [p.date, p.source].filter(Boolean).join(' · '), polaroid: false,
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
