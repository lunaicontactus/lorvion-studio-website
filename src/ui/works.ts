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
 * The title and the one line are in each page's own markup; the rest is
 * written into the page by the build from src/render/pages.ts (PHASE J), so
 * it is there without scripts too, and is only wired up here. Pictures open on request, one at a time, in a viewer
 * that keeps the keyboard where it was.
 */
import { getProject, workPicture } from '@/data/projects'
import { developmentOf } from '@/data/publicArchive'
import { workBodyHtml, workHeroHtml, worksIndexHtml } from '@/render/pages'
import type { ProjectConfig } from '@/types/project'

// ── The index ──────────────────────────────────────────────────────────────

function renderIndex(host: HTMLElement): void {
  // Built into the page by the build (src/render/pages.ts); only when it is
  // not (the dev shell's own fetch, a page from before PHASE J) is it built here.
  if (!host.hasAttribute('data-prerendered')) host.innerHTML = worksIndexHtml()
}

// ── One work ───────────────────────────────────────────────────────────────

function renderWork(main: HTMLElement, p: ProjectConfig): void {
  main.style.setProperty('--accent', p.accent)
  const hero = main.querySelector<HTMLElement>('[data-work-hero]')
  const body = main.querySelector<HTMLElement>('[data-work-body]')
  if (!hero || !body) return

  if (!main.hasAttribute('data-prerendered')) {
    const h = workHeroHtml(p)
    if (h.figure) hero.insertAdjacentHTML('afterbegin', h.figure)
    const text = hero.querySelector<HTMLElement>('.work-hero__text')
    text?.insertAdjacentHTML('afterbegin', h.kicker)
    if (h.line) text?.querySelector('.work-hero__title')?.insertAdjacentHTML('afterend', h.line)
    text?.insertAdjacentHTML('beforeend', h.tail)
    body.innerHTML = workBodyHtml(p)
  }
  const traces = developmentOf(p.id)

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
    src: t.full, w: t.w, h: t.h, caption: t.title, tag: t.date ?? '작업 흔적', polaroid: false,
  })), 0, traceBtn))
}

// ── The viewer: one picture at a time ─────────────────────────────────────

export interface Shot {
  readonly src: string
  readonly w: number
  readonly h: number
  readonly caption: string
  readonly tag: string
  readonly polaroid: boolean
}

export function makeViewer(): { el: HTMLElement; open: (shots: readonly Shot[], at: number, from: HTMLElement) => void } {
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
