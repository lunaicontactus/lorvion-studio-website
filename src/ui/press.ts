/**
 * PRESS KIT — `/press.html` (SITE UPGRADE PHASE H, docs/SITE_IA.md §11).
 *
 * Only what the repository already holds as fact: the studio's name, city and
 * address (src/data/site.ts), each work's type, genre, platform and status as
 * its own page states them (src/data/projects.ts), the key art on the garage
 * wall (src/data/artwork.ts), the logo files the site itself uses. No release
 * dates, awards, reviews, quotes, team size, founding year or store links:
 * none of them exist. Pictures are offered at the size the site keeps them.
 */
import { PROJECTS, STATE_LABEL, workHref, workPicture } from '@/data/projects'
import { artworkFor, fullSrc, wallSrc } from '@/data/artwork'
import { SITE_CONFIG } from '@/data/site'

const esc = (t: string): string =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** The press subject line, the same as the contact page's PRESS card. */
export const PRESS_MAILTO = `mailto:${SITE_CONFIG.email}?subject=%5B%EC%96%B8%EB%A1%A0%5D%20`

const B = '/assets/images/brand'
export const BRAND_FILES: readonly { label: string; note: string; href: string; preview: string; dark: boolean }[] = [
  { label: '로고 · 밝은 바탕용', note: 'PNG · 1871×360 · 투명 배경', href: `${B}/eungarage_logo_lockup.png`, preview: `${B}/eungarage_logo_lockup.webp`, dark: false },
  { label: '로고 · 어두운 바탕용', note: 'WEBP · 1871×360 · 투명 배경', href: `${B}/eungarage_logo_lockup_light.webp`, preview: `${B}/eungarage_logo_lockup_light.webp`, dark: true },
  { label: '짧은 로고 · 밝은 바탕용', note: 'WEBP · 671×128 · 투명 배경', href: `${B}/eungarage_logo_nav.webp`, preview: `${B}/eungarage_logo_nav.webp`, dark: false },
  { label: '짧은 로고 · 어두운 바탕용', note: 'WEBP · 671×128 · 투명 배경', href: `${B}/eungarage_logo_nav_light.webp`, preview: `${B}/eungarage_logo_nav_light.webp`, dark: true },
  { label: '아이콘', note: 'PNG · 512×512', href: '/assets/images/icon-512.png', preview: '/assets/images/icon-512.png', dark: false },
]

function works(): string {
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

export function mountPress(root: ParentNode = document): void {
  const host = root.querySelector<HTMLElement>('[data-press]')
  if (!host) return
  host.innerHTML = `
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
      <ul class="press-works">${works()}
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
