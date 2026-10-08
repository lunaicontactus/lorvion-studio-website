import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { FOOTER, NAV, ROUTES, sitemapXml } from '@/data/sitemap'
import { PROJECTS } from '@/data/projects'
import { ARTWORK, fullSrc } from '@/data/artwork'
import { CHARACTERS } from '@/data/characters'
import { BRAND_FILES, PRESS_MAILTO } from '@/ui/press'

/**
 * SITE UPGRADE PHASE H — Studio · Support · Contact · Press · LUNAI documents.
 */
const read = (f: string): string => readFileSync(f, 'utf8')

/** A LUNAI document's legal text: its intro, the date/operator row, the article. */
function legalText(html: string): string {
  const pick = (re: RegExp): string => (html.match(re) ?? []).join('\n')
  return [pick(/<p class="intro">[\s\S]*?<\/p>/), pick(/<div class="meta-row">[\s\S]*?<\/div>/), pick(/<article class="doc[^"]*">[\s\S]*<\/article>/)]
    .join('\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}
const sha = (t: string): string => createHash('sha256').update(t).digest('hex').slice(0, 16)

describe('the LUNAI documents keep their legal text (PHASE H)', () => {
  // Taken from production (main f3e8668, 2026-10-08) before PHASE H. A change
  // to a document's words is a legal change, not a design one: it needs the
  // user's decision, and then a new value here.
  const PROD: Readonly<Record<string, string>> = {
    'privacy.html': 'faaf50923ef8b59b',
    'terms.html': 'f3cd0d9ed22a2196',
    'account-deletion.html': '155a7d84421d4ece',
    'community-guidelines.html': '039ea29fba53bd16',
  }
  for (const [file, want] of Object.entries(PROD)) {
    it(`${file}: word for word as published`, () => {
      expect(sha(legalText(read(file))), file).toBe(want)
    })
  }

  it('names LUNAI as the product in every title and heading, and EUNGARAGE as who makes it', () => {
    for (const file of Object.keys(PROD)) {
      const html = read(file)
      expect(html.match(/<title>([^<]*)<\/title>/)?.[1], file).toMatch(/^LUNAI.* — EUNGARAGE$/)
      expect(html.match(/<h1>([^<]*)<\/h1>/)?.[1], file).toMatch(/^LUNAI /)
      expect(html, file).toContain('LUNAI는 EUNGARAGE가 만드는 앱입니다.')
      expect(html, file).not.toContain('EUNGARAGE · LUNAI')
    }
  })

  it('keeps every word of LUNAI support, its mail subject and its #policy-links', () => {
    const html = read('support.html')
    const text = html.replace(/<[^>]+>/g, '\n')
    for (const line of [
      '회원가입, 로그인 유지, 비밀번호 재설정 및 계정 복구 문제를 확인합니다.',
      '생성 실패, 저장 누락, 캐릭터 선택 오류 및 앨범 관련 문제를 확인합니다.',
      '친구 노래 재생, 공유 상태, 캐릭터 리액션 및 알림 문제를 확인합니다.',
      '개인정보 문의와 계정·데이터 삭제 방법을 안내합니다.',
      '앱 버전 및 빌드 번호', '기기 모델과 운영체제 버전', '문제가 발생한 날짜·시각과 단계', '가능한 경우 오류 화면 캡처',
      '비밀번호, 인증 코드, API 키 또는 전체 액세스 토큰은 보내지 마세요.',
      '문제가 생겼다면 아래 항목을 확인하거나 공식 이메일로 문의해 주세요.',
    ]) expect(text, line).toContain(line)
    expect(html).toContain('href="mailto:eungarage@gmail.com?subject=[LUNAI] 고객지원 문의"')
    expect(html).toContain('id="policy-links"')
    expect(html).toContain('id="lunai"')
  })
})

describe('CONTACT keeps its four doors and their subject lines', () => {
  it('support · business · press · other, each with the same pre-filled subject as before', () => {
    const html = read('contact.html')
    for (const id of ['game-support', 'business', 'press', 'other']) expect(html, id).toContain(`data-contact="${id}"`)
    for (const subject of ['%5B%EC%A7%80%EC%9B%90%5D%20', '%5B%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4%5D%20', '%5B%EC%96%B8%EB%A1%A0%5D%20', '%5B%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94%5D%20']) {
      expect(html, subject).toContain(`mailto:eungarage@gmail.com?subject=${subject}`)
    }
    expect(PRESS_MAILTO).toBe('mailto:eungarage@gmail.com?subject=%5B%EC%96%B8%EB%A1%A0%5D%20')
    // No address, phone or account that does not exist.
    expect(html).not.toMatch(/tel:|instagram|youtube|twitter\.com|x\.com|kakao/i)
  })
})

describe('PRESS — only what is true', () => {
  // What a visitor can read: the page and the code that writes it, not the
  // comments that say what must never be written.
  const press = read('src/ui/press.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '') + read('press.html')

  it('is a live, indexed page in the footer and the sitemap', () => {
    const route = ROUTES.find((r) => r.path === '/press.html')
    expect(route?.live).toBe(true)
    expect(route?.indexed).toBe(true)
    expect(FOOTER.flatMap((g) => g.links).some((l) => l.href === '/press.html')).toBe(true)
    expect(sitemapXml(PROJECTS.map((p) => p.id))).toContain('https://eungarage.com/press.html')
  })

  it('offers only files that exist: the logo files and every work\'s key art', () => {
    for (const f of BRAND_FILES) {
      expect(existsSync(`public${f.href}`), f.href).toBe(true)
      expect(existsSync(`public${f.preview}`), f.preview).toBe(true)
    }
    for (const p of PROJECTS) {
      const art = ARTWORK.find((a) => a.projectId === p.id)
      expect(art, p.id).toBeTruthy()
      expect(existsSync(`public${fullSrc(art!)}`), p.id).toBe(true)
    }
  })

  it('makes no claim the repository cannot back: no awards, reviews, quotes, numbers, dates or store links', () => {
    expect(press).not.toMatch(/수상|\bawards?\b|리뷰|\breviews?\b|평점|다운로드 수|\bdownloads\b|명의 팀|team of|설립|\bfounded\b|since 20|출시일|release date|steampowered|apps\.apple\.com|play\.google|wishlist|“|”/i)
  })
})

describe('STUDIO and the crew', () => {
  it('has each of the five a line in Korean, from the crew canon', () => {
    expect(CHARACTERS).toHaveLength(5)
    for (const c of CHARACTERS) expect(c.traitKo.length, c.id).toBeGreaterThan(8)
  })

  it('is no Vision / Mission / Values page', () => {
    const studio = read('studio.html') + read('src/ui/fallback.ts')
    expect(studio).not.toMatch(/vision|mission|values|비전|미션|핵심 가치/i)
  })
})

describe('one shell for every info page', () => {
  const PAGES = ['studio', 'support', 'contact', 'press', 'privacy', 'terms', 'account-deletion', 'community-guidelines', '404']
  it('the warm paper shell, not the old black one: no noise layer, no scroll-reveal on reading pages', () => {
    for (const p of PAGES) {
      const html = read(`${p}.html`)
      expect(html, p).toContain('<body class="works-page info-page">')
      expect(html, p).not.toContain('class="noise"')
      expect(html, p).not.toMatch(/class="[^"]*\breveal\b/)
      expect(html, p).not.toMatch(/lorvion/i)
      expect((html.match(/<h1[\s>]/g) ?? []).length, p).toBe(1)
    }
    expect(NAV.map((l) => l.href)).toEqual(['/works.html', '/archive.html', '/studio.html', '/support.html', '/contact.html'])
  })
})
