/**
 * The site's map, in one place (SITE UPGRADE PHASE B).
 *
 * Every page used to carry its own copy of the nav and the footer: fourteen
 * copies, three different footers, two link styles, and a legal page with no
 * way back to the garage. Now the pages carry markers (`<!--@nav-->`,
 * `<!--@footer-->`, `<!--@pages-->`) and the build fills them from here
 * (vite.config.ts), as plain HTML: the links are in the page before any
 * script runs, for crawlers and for a visitor whose scripts failed. The
 * sitemap is written from the same table.
 *
 * Imported by vite.config.ts, so no `@/` imports in this file.
 *
 * A route is in the nav or the footer only when its page exists; a planned
 * route is listed here so the plan is in the code, and nothing links to it
 * until its page is built. ARCHIVE went live in PHASE G, PRESS in PHASE H.
 */

export const ORIGIN = 'https://eungarage.com'
export const CONTACT_EMAIL = 'eungarage@gmail.com'

export type RouteGroup = 'home' | 'works' | 'archive' | 'studio' | 'support' | 'contact' | 'press' | 'legal' | 'system'

export interface Route {
  /** The URL path. */
  readonly path: string
  readonly group: RouteGroup
  /** What the page is for, in a line (for the docs and the tests). */
  readonly role: string
  /** Built and reachable. A planned route is never linked. */
  readonly live: boolean
  /** Listed in sitemap.xml. */
  readonly indexed: boolean
}

export const ROUTES: readonly Route[] = [
  { path: '/', group: 'home', role: '골목 입구 → 차고(포인트&클릭) → 놀이터 · 비밀 보관소', live: true, indexed: true },
  { path: '/works.html', group: 'works', role: 'WORKS — 작품 5개 목록', live: true, indexed: true },
  // Each work's page: /works/<id>.html, one per entry in src/data/projects.ts.
  { path: '/archive.html', group: 'archive', role: 'PUBLIC ARCHIVE — 공식 기록실', live: true, indexed: true },
  { path: '/studio.html', group: 'studio', role: '스튜디오 소개', live: true, indexed: true },
  { path: '/support.html', group: 'support', role: '작품별 고객지원(현재 서비스 중인 LUNAI)', live: true, indexed: true },
  { path: '/contact.html', group: 'contact', role: '문의 — 게임 지원 · 비즈니스 · 언론 · 기타', live: true, indexed: true },
  { path: '/press.html', group: 'press', role: 'PRESS KIT — 언론 · 크리에이터 · 파트너', live: true, indexed: true },
  { path: '/privacy.html', group: 'legal', role: 'LUNAI 개인정보처리방침', live: true, indexed: true },
  { path: '/terms.html', group: 'legal', role: 'LUNAI 이용약관', live: true, indexed: true },
  { path: '/community-guidelines.html', group: 'legal', role: 'LUNAI 커뮤니티 이용규칙', live: true, indexed: true },
  { path: '/account-deletion.html', group: 'legal', role: 'LUNAI 계정 삭제 안내', live: true, indexed: true },
  { path: '/games.html', group: 'system', role: '예전 주소 → /works.html', live: true, indexed: false },
  { path: '/404.html', group: 'system', role: '없는 주소', live: true, indexed: false },
]

const isLive = (path: string): boolean => ROUTES.some((r) => r.path === path && r.live)

export interface Link {
  readonly label: string
  readonly href: string
  /** The page group this link stands for, for `aria-current`. */
  readonly group?: RouteGroup
}

/**
 * The top nav: WORKS first (DECISIONS #2), then the studio, its records, and
 * the two ways to reach the people. Always small; the garage is the page.
 */
const NAV_ALL: readonly Link[] = [
  { label: 'Works', href: '/works.html', group: 'works' },
  { label: 'Archive', href: '/archive.html', group: 'archive' },
  { label: 'Studio', href: '/studio.html', group: 'studio' },
  { label: 'Support', href: '/support.html', group: 'support' },
  { label: 'Contact', href: '/contact.html', group: 'contact' },
]
export const NAV: readonly Link[] = NAV_ALL.filter((l) => isLive(l.href))

/** The footer: the studio's pages, then LUNAI's documents, then the address. */
const FOOTER_ALL: readonly { readonly title: string; readonly links: readonly Link[] }[] = [
  {
    title: 'EUNGARAGE',
    links: [
      { label: 'Garage', href: '/' },
      { label: 'Works', href: '/works.html' },
      { label: 'Archive', href: '/archive.html' },
      { label: 'Studio', href: '/studio.html' },
      { label: 'Press', href: '/press.html' },
      { label: 'Contact', href: '/contact.html' },
    ],
  },
  {
    title: 'SUPPORT',
    links: [
      { label: 'Support', href: '/support.html' },
      { label: 'LUNAI Privacy', href: '/privacy.html' },
      { label: 'Terms', href: '/terms.html' },
      { label: 'Community', href: '/community-guidelines.html' },
      { label: 'Account deletion', href: '/account-deletion.html' },
    ],
  },
]
export const FOOTER = FOOTER_ALL.map((g) => ({ ...g, links: g.links.filter((l) => isLive(l.href)) }))

/** Which group a path belongs to. */
export function groupOf(path: string): RouteGroup | null {
  const p = path === '/index.html' ? '/' : path
  if (/^\/works\/[^/]+\.html$/.test(p)) return 'works'
  return ROUTES.find((r) => r.path === p)?.group ?? null
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** `aria-current`: the page itself, or the section a page sits in. */
function current(link: Link, path: string): string {
  const p = path === '/index.html' ? '/' : path
  if (link.href === p) return ' aria-current="page"'
  if (link.group && link.group === groupOf(p)) return ' aria-current="true"'
  return ''
}

const SOUND_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="sound-toggle__on" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="sound-toggle__off" d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'

/**
 * The nav for the page at `path`. The garage's own bar is light, so it takes
 * the dark logo; every other page is dark and takes the light one.
 */
export function renderNav(path: string): string {
  const home = groupOf(path) === 'home'
  const logo = home ? 'eungarage_logo_nav.webp' : 'eungarage_logo_nav_light.webp'
  const links = NAV.map((l) => `      <a href="${l.href}"${current(l, path)}>${esc(l.label)}</a>`).join('\n')
  return `<nav class="site-nav">
  <div class="container nav-inner">
    <a class="brand" href="/" aria-label="EUNGARAGE home">
      <img class="brand-logo" src="/assets/images/brand/${logo}" width="671" height="128" alt="EUNGARAGE" decoding="async">
    </a>
    <div class="nav-links">
${links}
    </div>
    <button class="sound-toggle" type="button" data-sound-toggle aria-pressed="false" aria-label="소리 켜기">
      ${SOUND_ICON}
    </button>
    <button class="menu-toggle" aria-label="메뉴 열기"><span></span><span></span></button>
  </div>
</nav>`
}

/** The footer, the same on every page that has one (the garage does not). */
export function renderFooter(path: string): string {
  const groups = FOOTER.map((g) => `      <div class="footer-group">
        <p class="footer-group__title">${esc(g.title)}</p>
${g.links.map((l) => `        <a href="${l.href}"${current(l, path).replace(' aria-current="true"', '')}>${esc(l.label)}</a>`).join('\n')}
      </div>`).join('\n')
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <div class="footer-brand">
      <img class="footer-logo" src="/assets/images/brand/eungarage_logo_lockup_light.webp" width="1871" height="360" alt="EUNGARAGE" loading="lazy" decoding="async">
      <p>밤마다 도깨비들이 게임을 만드는 작은 차고.</p>
    </div>
    <div class="footer-links">
${groups}
      <div class="footer-group">
        <p class="footer-group__title">EMAIL</p>
        <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
      </div>
    </div>
    <div class="footer-copy">
      <span>© <span data-year></span> EUNGARAGE. All rights reserved.</span>
      <span>Seoul, Republic of Korea · Independent studio</span>
    </div>
  </div>
</footer>`
}

/**
 * The garage page's own list of every page, hidden from sight: the garage has
 * no footer, and a crawler or a visitor without scripts still finds the rest.
 */
export function renderPageIndex(): string {
  const links = [...NAV, ...FOOTER.flatMap((g) => g.links)]
    .filter((l, i, all) => l.href !== '/' && all.findIndex((m) => m.href === l.href) === i)
  return `<nav class="visually-hidden" aria-label="EUNGARAGE 페이지">
${links.map((l) => `    <a href="${l.href}">${esc(l.label)}</a>`).join('\n')}
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
  </nav>`
}

/** sitemap.xml: every live, indexed route and every work's page. */
export function sitemapXml(workIds: readonly string[]): string {
  const paths = [
    ...ROUTES.filter((r) => r.live && r.indexed).map((r) => r.path),
  ]
  // The works' own pages go straight after the list of works.
  const at = paths.indexOf('/works.html') + 1
  paths.splice(at, 0, ...workIds.map((id) => `/works/${id}.html`))
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `<url><loc>${ORIGIN}${p}</loc></url>`).join('\n')}
</urlset>
`
}
