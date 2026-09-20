/**
 * WORKS — the worlds the dokkaebi have made, and each one's workbench.
 *
 * Two pages read the one record of the works (src/data/projects.ts) that the
 * garage PC reads too:
 *
 *   works.html          the index: each work as its own kind of object on the
 *                       table — a diary, a case file, a trail map, a score
 *                       book, a letter with a ticket — not five equal cards.
 *   works/<id>.html     one work: what it is, what a player does in it, what
 *                       it promises, its world, its pictures — and, once it is
 *                       out, what has changed for the people playing it.
 *
 * What is deliberately not here: how far the build has got, what is being
 * implemented this week, commits, test numbers. A visitor came to see the
 * work. The making is in the archive's polaroids, one small way in from each
 * page.
 *
 * The title and the one line are in each page's own markup (so they are there
 * without scripts, and for anything that reads the page before it runs); the
 * rest is built here. Pictures open on request, one at a time, in a viewer
 * that keeps the keyboard where it was.
 */
import { PROJECTS, STATE_LABEL, coverOf, getProject, updatesOf, workHref, workPicture } from '@/data/projects'
import { artworkFor, wallSrc } from '@/data/artwork'
import { polaroidsOf } from '@/data/polaroids'
import type { ProjectConfig } from '@/types/project'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The small picture a work is recognised by: the wall print, or its hero's thumbnail. */
function thumbOf(p: ProjectConfig): string {
  if (p.hero) return workPicture(p.id, p.hero.name, 'thumb')
  const piece = artworkFor(p.id)
  return piece ? wallSrc(piece) : ''
}

/** The cover's own size, so its box is its shape before it arrives. */
function coverSize(p: ProjectConfig): { w: number; h: number } {
  if (p.hero) return { w: p.hero.w, h: p.hero.h }
  const piece = artworkFor(p.id)
  return piece ? { w: piece.width, h: piece.height } : { w: 4, h: 3 }
}

// ── The index ──────────────────────────────────────────────────────────────

/**
 * What each work is as a thing on the table. The trims are drawn in CSS
 * (src/styles/works.css); here is only which pieces each object has.
 */
const TRIMS: Readonly<Record<string, { kind: string; label: string; bits: string }>> = {
  lunai: {
    kind: '감정 기록철', label: 'DIARY',
    bits: '<i class="record__spine"></i><i class="record__band"></i><i class="record__moon"></i>',
  },
  liminal: {
    kind: '사건 기록 파일', label: 'CASE FILE',
    bits: '<i class="record__tab">경계관리국</i><i class="record__clip"></i><i class="record__stamp">기록</i>',
  },
  wormup: {
    kind: '산길 지도', label: 'TRAIL MAP',
    bits: '<i class="record__route"></i><i class="record__badge record__badge--a">200</i><i class="record__badge record__badge--b">13</i>',
  },
  lumiora: {
    kind: '빛나는 악보책', label: 'SCORE',
    bits: '<i class="record__staff"></i><i class="record__glow"></i>',
  },
  rubato: {
    kind: '오래된 악보와 편지', label: '1791 · WIEN',
    bits: '<i class="record__seal"></i><i class="record__ticket">OPERA · 1791</i>',
  },
}

function renderIndex(host: HTMLElement): void {
  host.innerHTML = PROJECTS.map((p, i) => {
    const t = TRIMS[p.id] ?? { kind: '', label: '', bits: '' }
    return `
    <li class="records__item" style="--i:${i}">
      <a class="record record--${p.id}" href="${workHref(p.id)}" data-record="${p.id}" style="--accent:${p.accent}">
        <span class="record__trim" aria-hidden="true">${t.bits}</span>
        <span class="record__photo"><img src="${thumbOf(p)}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async"></span>
        <span class="record__body">
          <span class="record__kind">${esc(t.kind)} <span aria-hidden="true">·</span> ${esc(t.label)}</span>
          <span class="record__title">${esc(p.title)}</span>
          <span class="record__line">${esc(p.taglineKo)}</span>
          <span class="record__meta">${esc(p.genre)} · ${esc(p.platforms.join(' · '))}</span>
          <span class="record__status" data-state="${p.releaseState}">${STATE_LABEL[p.releaseState]}</span>
        </span>
      </a>
    </li>`
  }).join('')
}

// ── One work ───────────────────────────────────────────────────────────────

function renderWork(main: HTMLElement, p: ProjectConfig): void {
  main.style.setProperty('--accent', p.accent)
  const hero = main.querySelector<HTMLElement>('[data-work-hero]')
  const body = main.querySelector<HTMLElement>('[data-work-body]')
  if (!hero || !body) return

  const cover = coverOf(p)
  const size = coverSize(p)
  const coverCaption = p.hero?.caption ?? `${p.title} 키 아트`
  if (cover) {
    hero.insertAdjacentHTML('afterbegin', `
      <figure class="work-hero__frame">
        <img src="${cover}" width="${size.w}" height="${size.h}" alt="${esc(`${p.title} — ${coverCaption}`)}" decoding="async" fetchpriority="high">
        <figcaption class="work-hero__plate">${esc(p.title)}</figcaption>
      </figure>`)
  }
  const text = hero.querySelector<HTMLElement>('.work-hero__text')
  text?.insertAdjacentHTML('afterbegin', `<p class="work-hero__kicker">${esc(p.kind)}</p>`)
  text?.insertAdjacentHTML('beforeend', `
    <dl class="work-tags">
      <div><dt>TYPE</dt><dd>${esc(p.kind)}</dd></div>
      <div><dt>GENRE</dt><dd>${esc(p.genre)}</dd></div>
      <div><dt>PLATFORM</dt><dd>${esc(p.platforms.join(' · '))}</dd></div>
      ${p.perspective ? `<div><dt>PERSPECTIVE</dt><dd>${esc(p.perspective)}</dd></div>` : ''}
    </dl>
    <p class="work-hero__state"><span class="record__status" data-state="${p.releaseState}">${STATE_LABEL[p.releaseState]}</span></p>`)

  const traces = polaroidsOf(p.id)
  const updates = updatesOf(p)
  const index = PROJECTS.findIndex((x) => x.id === p.id)
  const prev = PROJECTS[(index + PROJECTS.length - 1) % PROJECTS.length]!
  const next = PROJECTS[(index + 1) % PROJECTS.length]!

  body.innerHTML = `
    <section class="work-sec work-note" aria-labelledby="about-h">
      <h2 class="work-sec__h" id="about-h">ABOUT</h2>
      <div class="work-note__paper">${p.about.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
    </section>

    <section class="work-sec" aria-labelledby="core-h">
      <h2 class="work-sec__h" id="core-h">CORE EXPERIENCE</h2>
      <ol class="work-cards">${p.core.map((c) => `
        <li class="work-card"><b class="work-card__t">${esc(c.title)}</b><span class="work-card__x">${esc(c.text)}</span></li>`).join('')}
      </ol>
    </section>

    ${(p.lists ?? []).map((list, n) => `
    <section class="work-sec" aria-labelledby="list-h-${n}">
      <h2 class="work-sec__h" id="list-h-${n}">${esc(list.title)}</h2>
      <ol class="work-list">${list.rows.map((r, k) => `
        <li class="work-list__row"><span class="work-list__n" aria-hidden="true">${k + 1}</span><b>${esc(r.name)}</b><span>${esc(r.text)}</span></li>`).join('')}
      </ol>
    </section>`).join('')}

    <section class="work-sec" aria-labelledby="features-h">
      <h2 class="work-sec__h" id="features-h">FEATURES</h2>
      <ul class="work-features">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    </section>

    <section class="work-sec" aria-labelledby="gallery-h">
      <h2 class="work-sec__h" id="gallery-h">GALLERY</h2>
      <ul class="work-gallery">${p.gallery.map((g, k) => `
        <li><button class="work-shot" type="button" data-shot="${k}" aria-label="${esc(g.caption)} 크게 보기">
          <img src="${workPicture(p.id, g.name, 'thumb')}" alt="" loading="lazy" decoding="async">
          <span class="work-shot__cap">${esc(g.caption)}</span>
        </button></li>`).join('')}
      </ul>
    </section>

    ${updates.length ? `
    <section class="work-sec" aria-labelledby="updates-h">
      <h2 class="work-sec__h" id="updates-h">UPDATE NOTES</h2>
      <ol class="work-updates">${updates.map((u) => `
        <li class="work-update">
          <p class="work-update__head"><b>v${esc(u.version)}</b> <span>${esc(u.title)}</span>
            <time datetime="${u.date.replace(/\./g, '-')}">${esc(u.date)}</time></p>
          <ul>${u.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        </li>`).join('')}
      </ol>
    </section>` : ''}

    <section class="work-sec" aria-labelledby="links-h">
      <h2 class="work-sec__h" id="links-h">LINKS</h2>
      <p class="work-links work-links--foot">${p.links.map((l) => l.href
        ? `<a class="work-link" href="${l.href}">${esc(l.label)} <span aria-hidden="true">↗</span></a>`
        : `<span class="work-link work-link--note">${esc(l.label)}</span>`).join('')}</p>
      ${traces.length ? `<p class="work-traces"><button class="work-traces__go" type="button" data-traces>
        작업 흔적 보기 <span class="work-traces__n">폴라로이드 ${traces.length}장</span></button></p>` : ''}
    </section>

    <nav class="work-next" aria-label="다른 작품">
      <a href="${workHref(prev.id)}"><span aria-hidden="true">←</span> ${esc(prev.title)}</a>
      <a href="/works.html">WORKS</a>
      <a href="${workHref(next.id)}">${esc(next.title)} <span aria-hidden="true">→</span></a>
    </nav>`

  const viewer = makeViewer()
  main.append(viewer.el)
  const shots = p.gallery.map((g) => ({
    src: workPicture(p.id, g.name, 'full'), w: g.w, h: g.h, caption: g.caption, tag: '', polaroid: false,
  }))
  for (const btn of body.querySelectorAll<HTMLButtonElement>('[data-shot]')) {
    btn.addEventListener('click', () => viewer.open(shots, Number(btn.dataset['shot']), btn))
  }
  const traceBtn = body.querySelector<HTMLButtonElement>('[data-traces]')
  traceBtn?.addEventListener('click', () => viewer.open(traces.map((t) => ({
    src: t.src, w: 1, h: 1, caption: t.title ?? p.title, tag: t.date ?? '작업 흔적', polaroid: true,
  })), 0, traceBtn))
}

// ── The viewer: one picture at a time ─────────────────────────────────────

interface Shot {
  readonly src: string
  readonly w: number
  readonly h: number
  readonly caption: string
  readonly tag: string
  readonly polaroid: boolean
}

function makeViewer(): { el: HTMLElement; open: (shots: readonly Shot[], at: number, from: HTMLElement) => void } {
  const el = document.createElement('div')
  el.className = 'work-view'
  el.hidden = true
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', '그림 보기')
  el.innerHTML = `
    <div class="work-view__shade" data-view-close></div>
    <figure class="work-view__fig">
      <img class="work-view__img" alt="">
      <figcaption class="work-view__cap"><span data-view-cap></span> <span class="work-view__tag" data-view-tag></span></figcaption>
    </figure>
    <div class="work-view__bar">
      <button type="button" class="work-view__btn" data-view-step="-1" aria-label="앞 그림">‹</button>
      <span class="work-view__count" data-view-count></span>
      <button type="button" class="work-view__btn" data-view-step="1" aria-label="다음 그림">›</button>
      <button type="button" class="work-view__btn work-view__close" data-view-close aria-label="닫기">✕</button>
    </div>`
  const img = el.querySelector<HTMLImageElement>('.work-view__img')!
  let list: readonly Shot[] = []
  let at = 0
  let from: HTMLElement | null = null
  const show = (k: number): void => {
    at = (k + list.length) % list.length
    const s = list[at]!
    img.src = s.src
    img.alt = s.caption
    if (!s.polaroid) img.style.aspectRatio = `${s.w}/${s.h}`
    else img.style.removeProperty('aspect-ratio')
    el.classList.toggle('is-polaroid', s.polaroid)
    el.querySelector('[data-view-cap]')!.textContent = s.caption
    el.querySelector('[data-view-tag]')!.textContent = s.tag
    el.querySelector('[data-view-count]')!.textContent = `${at + 1} / ${list.length}`
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-view-step]')) b.hidden = list.length < 2
  }
  const close = (): void => {
    el.hidden = true
    document.body.classList.remove('is-viewing')
    document.removeEventListener('keydown', onKey)
    from?.focus()
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowRight') show(at + 1)
    else if (e.key === 'ArrowLeft') show(at - 1)
    else if (e.key === 'Tab') {
      // The focus stays in the viewer while it is open.
      const f = [...el.querySelectorAll<HTMLElement>('button:not([hidden])')]
      const i = f.indexOf(document.activeElement as HTMLElement)
      e.preventDefault()
      f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length]?.focus()
      return
    } else return
    e.preventDefault()
  }
  for (const b of el.querySelectorAll<HTMLElement>('[data-view-close]')) b.addEventListener('click', close)
  for (const b of el.querySelectorAll<HTMLButtonElement>('[data-view-step]')) {
    b.addEventListener('click', () => show(at + Number(b.dataset['viewStep'])))
  }
  // A swipe on a phone turns the picture.
  let x0: number | null = null
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0]?.clientX ?? null }, { passive: true })
  el.addEventListener('touchend', (e) => {
    const x1 = e.changedTouches[0]?.clientX
    if (x0 !== null && x1 !== undefined && Math.abs(x1 - x0) > 48) show(at + (x1 < x0 ? 1 : -1))
    x0 = null
  })
  return {
    el,
    open(shots, k, origin) {
      list = shots
      from = origin
      show(k)
      el.hidden = false
      document.body.classList.add('is-viewing')
      document.addEventListener('keydown', onKey)
      el.querySelector<HTMLElement>('.work-view__close')?.focus()
    },
  }
}

// ── Mount ──────────────────────────────────────────────────────────────────

export function mountWorks(root: ParentNode = document): void {
  const records = root.querySelector<HTMLElement>('[data-records]')
  if (records) renderIndex(records)
  const main = root.querySelector<HTMLElement>('[data-works-detail]')
  const project = main ? getProject(main.dataset['worksDetail'] ?? '') : undefined
  if (main && project) renderWork(main, project)
  // The page has arrived: the paper settles (src/styles/works.css).
  if (records || main) requestAnimationFrame(() => document.body.classList.add('is-arrived'))
}
