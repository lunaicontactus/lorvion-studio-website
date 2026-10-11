/**
 * The pages' content as HTML, from the same records the room reads.
 *
 * PHASE J: these were built in the browser only, so a page read without its
 * script — a search crawler that does not run it, a link preview, a slow
 * phone before the module arrives — had a title and nothing under it. The
 * build now writes the same HTML into each page (vite.config.ts, prerender),
 * and the page's own script finds it there and only wires it up
 * (`data-prerendered`). One function per piece, used by both, so the two
 * can never differ.
 *
 * Pure: strings in, strings out, no DOM. Studio (src/ui/fallback.ts), press
 * (src/ui/press.ts), works (src/ui/works.ts), records (src/ui/records.ts).
 */
import { PROJECTS, STATE_LABEL, coverOf, updatesOf, workHref, workPicture } from '@/data/projects'
import { artworkFor, fullSrc, wallSrc } from '@/data/artwork'
import { developmentOf, shelves, type ArchiveEntry } from '@/data/publicArchive'
import { SITE_CONFIG, contactRows } from '@/data/site'
import { CHARACTERS } from '@/data/characters'
import type { ProjectConfig } from '@/types/project'

export const esc = (t: string): string =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// ── Works ──────────────────────────────────────────────────────────────────

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
  // The Steam game (PHASE C): a worm's life on paper, soil at its foot and a
  // sprout coming up — the runner's trail map and its 200 · 13 badges are gone.
  wormup: {
    kind: '흙 묻은 일기', label: "WORM'S LIFE",
    bits: '<i class="record__soil"></i><i class="record__sprout"></i>',
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

/** works.html: each work as its own object on the table. */
export function worksIndexHtml(): string {
  return PROJECTS.map((p, i) => {
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
          <span class="record__meta">${esc(p.genre)} · ${p.platforms.map((x) => `<span>${esc(x)}</span>`).join(' · ')}</span>
          <span class="record__status" data-state="${p.releaseState}">${STATE_LABEL[p.releaseState]}</span>
        </span>
      </a>
    </li>`
  }).join('')
}

/** The pieces a work's page adds to the title and lines in its own markup. */
export function workHeroHtml(p: ProjectConfig): { figure: string; kicker: string; line: string; tail: string } {
  const cover = coverOf(p)
  const size = coverSize(p)
  const coverCaption = p.hero?.caption ?? `${p.title} 키 아트`
  return {
    figure: cover ? `
      <figure class="work-hero__frame">
        <img src="${cover}" width="${size.w}" height="${size.h}" alt="${esc(`${p.title} — ${coverCaption}`)}" decoding="async" fetchpriority="high">
        <figcaption class="work-hero__plate">${esc(p.title)}</figcaption>
      </figure>` : '',
    kicker: `<p class="work-hero__kicker">${esc(p.kind)}</p>`,
    // The work's one strongest sentence, once, under its name.
    line: p.line ? `<p class="work-hero__line">${esc(p.line)}</p>` : '',
    tail: `
    <dl class="work-tags">
      <div><dt>TYPE</dt><dd>${esc(p.kind)}</dd></div>
      <div><dt>GENRE</dt><dd>${esc(p.genre)}</dd></div>
      <div><dt>PLATFORM</dt><dd>${esc(p.platforms.join(' · '))}</dd></div>
      ${p.perspective ? `<div><dt>PERSPECTIVE</dt><dd>${esc(p.perspective)}</dd></div>` : ''}
    </dl>
    <p class="work-hero__state"><span class="record__status" data-state="${p.releaseState}">${STATE_LABEL[p.releaseState]}</span></p>
    ${p.statusNote ? `<p class="work-hero__note">${esc(p.statusNote)}</p>` : ''}`,
  }
}

/** A work's page under its hero: about, core, lists, features, characters, gallery, notes, links. */
export function workBodyHtml(p: ProjectConfig): string {
  // Its development pictures from the public archive (PHASE G); the gallery
  // above is the game, these are the making.
  const traces = developmentOf(p.id)
  const updates = updatesOf(p)
  const index = PROJECTS.findIndex((x) => x.id === p.id)
  const prev = PROJECTS[(index + PROJECTS.length - 1) % PROJECTS.length]!
  const next = PROJECTS[(index + 1) % PROJECTS.length]!

  return `
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

    ${p.characters?.length ? `
    <section class="work-sec" aria-labelledby="chars-h">
      <h2 class="work-sec__h" id="chars-h">CHARACTERS</h2>
      <ul class="work-chars">${p.characters.map((c) => `
        <li class="work-char">
          <img src="${workPicture(p.id, c.picture, 'thumb')}" width="${c.w}" height="${c.h}" alt="" loading="lazy" decoding="async">
          <b class="work-char__n">${esc(c.name)}</b>${c.role ? `<span class="work-char__r">${esc(c.role)}</span>` : ''}
        </li>`).join('')}
      </ul>
    </section>` : ''}

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
      ${p.links.some((l) => l.href) ? `<p class="work-links work-links--foot">${p.links.filter((l) => l.href).map((l) =>
        `<a class="work-link" href="${l.href}">${esc(l.label)} <span aria-hidden="true">↗</span></a>`).join('')}</p>` : ''}
      ${p.links.filter((l) => !l.href).map((l) => `<p class="work-plan">${esc(l.label)}</p>`).join('')}
      <p class="work-traces">${traces.length ? `<button class="work-traces__go" type="button" data-traces>
        작업 흔적 보기 <span class="work-traces__n">${traces.length}장</span></button>` : ''}
        <a class="work-traces__archive" href="/archive.html#${traces.length ? 'development' : 'concept'}">기록실에서 보기 <span aria-hidden="true">→</span></a></p>
    </section>

    <nav class="work-next" aria-label="다른 작품">
      <a href="${workHref(prev.id)}"><span aria-hidden="true">←</span> ${esc(prev.title)}</a>
      <a href="/works.html">WORKS</a>
      <a href="${workHref(next.id)}">${esc(next.title)} <span aria-hidden="true">→</span></a>
    </nav>`
}

// ── Studio ─────────────────────────────────────────────────────────────────

/** The approved crew's own face (the same frame src/ui/panels.ts ownerPortrait uses). */
const face = (id: string): string => `/assets/images/dokkaebi-v2/${id}/idle/front/${id}_idle_front_01.webp`

/**
 * STUDIO (SITE UPGRADE PHASE H, docs/SITE_IA.md §8): who, how the work gets
 * made, the crew, what is being made now, and how to reach the people. Short,
 * and nothing that is not true — no team size, no founding year, no dates.
 */
export function studioHtml(): string {
  const making = PROJECTS.map((p) => `
      <li class="studio-work"><a href="${workHref(p.id)}">
        <b class="studio-work__t">${esc(p.title)}</b>
        <span class="studio-work__g">${esc(p.genre)}</span>
        <span class="studio-work__s"><span class="record__status" data-state="${p.releaseState}">${STATE_LABEL[p.releaseState]}</span> ${esc(p.platforms.join(' · '))}</span>
      </a></li>`).join('')
  const crew = CHARACTERS.map((c) => `
      <li class="studio-crew__one">
        <img src="${face(c.id)}" alt="" width="60" height="84" loading="lazy" decoding="async">
        <span><b>${esc(c.name)}</b> ${esc(c.traitKo)}</span>
      </li>`).join('')
  const mail = contactRows().find((r) => r.key === 'email')
  return `
    <section aria-labelledby="studio-how">
      <h2 id="studio-how">차고에서 하는 일</h2>
      <p>작은 곳에서 직접 만들고, 고치고, 실험합니다. 감정과 캐릭터, 그리고 그들이 사는 세계를 중심으로 만듭니다.</p>
      <p>만들면서 남은 그림과 시험 화면은 날짜와 함께 <a href="/archive.html">기록실</a>에 남겨 둡니다.</p>
    </section>
    <section aria-labelledby="studio-crew">
      <h2 id="studio-crew">도깨비 크루</h2>
      <p>밤마다 차고에서 일하는 다섯.</p>
      <ul class="studio-crew">${crew}
      </ul>
    </section>
    <section aria-labelledby="studio-making">
      <h2 id="studio-making">지금 만드는 것</h2>
      <ul class="studio-works">${making}
      </ul>
      <p class="link-list"><a href="/works.html">WORKS 전체 보기 <span aria-hidden="true">→</span></a></p>
    </section>
    <section aria-labelledby="studio-contact" id="contact">
      <h2 id="studio-contact">연락</h2>
      <p>${esc(SITE_CONFIG.companyName)} · ${esc(SITE_CONFIG.location)}</p>
      ${mail ? `<p class="link-list"><a href="${mail.href}">${esc(mail.value)}</a></p>` : ''}
      <p><a class="info-button" href="/contact.html">문의하기 <span aria-hidden="true">→</span></a>
         <a class="info-button info-button--quiet" href="/press.html">PRESS KIT</a></p>
    </section>`
}

// ── Press ──────────────────────────────────────────────────────────────────

/** The press subject line, the same as the contact page's PRESS card. */
export const PRESS_MAILTO = `mailto:${SITE_CONFIG.email}?subject=%5B%EC%96%B8%EB%A1%A0%5D%20`

const B = '/assets/images/brand'
export const BRAND_FILES: readonly { label: string; note: string; href: string; preview: string; dark: boolean }[] = [
  { label: '로고 · 밝은 바탕용', note: 'PNG · 1871×360 · 투명 배경', href: `${B}/eungarage_logo_lockup.png`, preview: `${B}/eungarage_logo_lockup.webp`, dark: false },
  { label: '로고 · 어두운 바탕용', note: 'WEBP · 1871×360 · 투명 배경', href: `${B}/eungarage_logo_lockup_light.webp`, preview: `${B}/eungarage_logo_lockup_light.webp`, dark: true },
  { label: '짧은 로고 · 밝은 바탕용', note: 'WEBP · 671×128 · 투명 배경', href: `${B}/eungarage_logo_nav.webp`, preview: `${B}/eungarage_logo_nav.webp`, dark: false },
  { label: '짧은 로고 · 어두운 바탕용', note: 'WEBP · 671×128 · 투명 배경', href: `${B}/eungarage_logo_nav_light.webp`, preview: `${B}/eungarage_logo_nav_light.webp`, dark: true },
  // The preview is the 192 px icon (the 512 px one is 265 KB for a 44 px picture).
  { label: '아이콘', note: 'PNG · 512×512', href: '/assets/images/icon-512.png', preview: '/assets/images/icon-192.png', dark: false },
]

function pressWorks(): string {
  return PROJECTS.map((p) => {
    const art = artworkFor(p.id)
    const cover = art ? wallSrc(art) : p.hero ? workPicture(p.id, p.hero.name, 'thumb') : null
    return `
    <li class="press-work" data-press-work="${p.id}">
      ${cover ? `<img class="press-work__art" src="${cover}" alt="" loading="lazy" decoding="async">` : ''}
      <div class="press-work__body">
        <h3>${esc(p.title)}</h3>
        <p class="press-work__line">${esc(p.taglineKo)}</p>
        <dl class="press-facts">
          <div><dt>TYPE</dt><dd>${esc(p.kind)}</dd></div>
          <div><dt>GENRE</dt><dd>${esc(p.genre)}</dd></div>
          <div><dt>PLATFORM</dt><dd>${esc(p.platforms.join(' · '))}</dd></div>
          <div><dt>STATUS</dt><dd><span class="record__status" data-state="${p.releaseState}">${STATE_LABEL[p.releaseState]}</span>${p.statusNote ? ` ${esc(p.statusNote)}` : ''}</dd></div>
        </dl>
        <p class="link-list press-work__links">
          ${art ? `<a href="${fullSrc(art)}" download>키아트 받기 <span aria-hidden="true">↓</span></a>` : ''}
          <a href="${workHref(p.id)}#gallery-h">게임 화면 ${p.gallery.length}장 <span aria-hidden="true">→</span></a>
          <a href="${workHref(p.id)}">작품 페이지 <span aria-hidden="true">→</span></a>
        </p>
      </div>
    </li>`
  }).join('')
}

/** /press.html: facts only (src/ui/press.ts says what is and is not here). */
export function pressHtml(): string {
  return `
    <section aria-labelledby="press-about">
      <h2 id="press-about">EUNGARAGE</h2>
      <p>밤마다 도깨비들이 게임을 만드는 작은 차고. 감정과 캐릭터, 그리고 그들이 사는 세계를 중심으로 게임을 만듭니다.</p>
      <dl class="press-facts">
        <div><dt>NAME</dt><dd>${esc(SITE_CONFIG.companyName)}</dd></div>
        <div><dt>BASED IN</dt><dd>${esc(SITE_CONFIG.location)}</dd></div>
        <div><dt>WEB</dt><dd><a href="https://eungarage.com/">eungarage.com</a></dd></div>
        <div><dt>CONTACT</dt><dd><a href="mailto:${SITE_CONFIG.email}">${esc(SITE_CONFIG.email ?? '')}</a></dd></div>
      </dl>
    </section>
    <section aria-labelledby="press-works">
      <h2 id="press-works">작품</h2>
      <p>지금 공개된 다섯 작품입니다. 모두 개발 중입니다.</p>
      <ul class="press-works">${pressWorks()}
      </ul>
    </section>
    <section aria-labelledby="press-brand">
      <h2 id="press-brand">로고와 브랜드</h2>
      <ul class="press-brand">${BRAND_FILES.map((f) => `
        <li class="press-brand__one">
          <span class="press-brand__pic${f.dark ? ' is-dark' : ''}"><img src="${f.preview}" alt="" loading="lazy" decoding="async"></span>
          <span><b>${esc(f.label)}</b> <span class="press-brand__note">${esc(f.note)}</span></span>
          <a href="${f.href}" download>받기 <span aria-hidden="true">↓</span></a>
        </li>`).join('')}
      </ul>
    </section>
    <section aria-labelledby="press-contact">
      <h2 id="press-contact">언론 문의</h2>
      <p>인터뷰, 기사, 영상, 자료 사용 범위에 대한 문의는 메일로 보내 주세요. 제목에 [언론]이 미리 적힙니다.</p>
      <p><a class="info-button" href="${PRESS_MAILTO}" data-press-mail>언론 문의 메일 보내기 <span aria-hidden="true">↗</span></a></p>
    </section>`
}

// ── Records ────────────────────────────────────────────────────────────────

const minutes = (secs: number): string => `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`

function card(e: ArchiveEntry, k: number): string {
  switch (e.kind) {
    case 'picture':
      return `
        <li><button class="work-shot records-card" type="button" data-record-shot="${k}" aria-label="${esc(e.title)} 크게 보기">
          <span class="records-card__pic"><img src="${e.thumb}" alt="" loading="lazy" decoding="async" width="${e.w}" height="${e.h}">${
            e.badge ? `<span class="records-card__badge" data-badge>${esc(e.badge)}</span>` : ''}</span>
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

/** archive.html: the index of shelves. */
export function recordsIndexHtml(): string {
  const list = shelves()
  return list.map((s) =>
      `<a class="records-index__a" href="#${s.category.id}">${esc(s.category.label)}</a>`).join('')
}

/** archive.html: the shelves. */
export function recordsShelvesHtml(): string {
  const list = shelves()
  return list.map((s) => `
    <section class="work-sec records-shelf" id="${s.category.id}" aria-labelledby="shelf-${s.category.id}">
      <h2 class="work-sec__h" id="shelf-${s.category.id}">${esc(s.category.label)} <span class="records-shelf__ko">${esc(s.category.ko)}</span></h2>
      <p class="records-shelf__line">${esc(s.category.line)}</p>
      <ul class="${s.category.id === 'sound' ? 'records-tracks' : 'work-gallery records-grid'}" data-shelf="${s.category.id}">
        ${s.entries.map((e, k) => card(e, k)).join('')}
      </ul>
    </section>`).join('')
}
