import { sitemapXml } from '@/data/sitemap'
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { PROJECTS, getProject, updatesOf, workPicture } from '@/data/projects'
import { developmentOf } from '@/data/publicArchive'

/**
 * WORKS: the five works as the studio's own records say they are, and the
 * pages that show them. What is checked is what goes wrong with a portfolio
 * page: a status nobody can back up, a log with no commit behind it, a
 * picture that is not there, a page whose title says one thing and the data
 * another, and old copy coming back.
 */
const read = (f: string): string => readFileSync(f, 'utf8')

describe('the works, as their records say', () => {
  it('has the five works, each with a page of its own', () => {
    expect(PROJECTS.map((p) => p.id)).toEqual(['lunai', 'liminal', 'wormup', 'lumiora', 'rubato'])
    for (const p of PROJECTS) expect(existsSync(`works/${p.id}.html`), p.id).toBe(true)
  })

  it('says only how far along it is, in words a visitor uses', () => {
    const PUBLIC = ['concept', 'inDevelopment', 'comingSoon', 'testing', 'available', 'released']
    for (const p of PROJECTS) {
      expect(PUBLIC, p.id).toContain(p.releaseState)
      // Never a stage from inside the work: a build number, a greybox, a
      // slice, a QA round.
      expect(p.releaseState, p.id).not.toMatch(/build|grey|slice|qa|prototype/i)
    }
  })

  it('links only to places that exist, and promises no store it does not have', () => {
    for (const p of PROJECTS) {
      for (const l of p.links) {
        if (!l.href) continue
        expect(l.href, `${p.id}: ${l.label}`).toMatch(/^\/[a-z-]+\.html$/)
        expect(existsSync(l.href.slice(1)), `${p.id}: ${l.href}`).toBe(true)
      }
    }
  })

  it('keeps no internal record at all: no build, no log, no commits', () => {
    for (const p of PROJECTS) {
      const record = JSON.stringify(p)
      // The words a development record is made of.
      expect(record, `${p.id}: internal wording`).not.toMatch(
        /개발 빌드|그레이박스|greybox|vertical slice|버티컬|커밋|commit|빌드 \d|build \d|QA|테스트플라이트|TestFlight|프로토타입 \d|리팩터|구현 중|구현했|개발 중인/i)
      // A commit's short hash: seven or eight hex digits standing alone.
      expect(record, `${p.id}: a commit hash`).not.toMatch(/\b[0-9a-f]{7,8}\b(?![^"]*\.webp)/)
      for (const key of ['build', 'devLog', 'asOf', 'milestone', 'engine', 'status']) {
        expect(key in p, `${p.id} still carries ${key}`).toBe(false)
      }
    }
  })

  it('says what each is, what a player does, and what it promises', () => {
    for (const p of PROJECTS) {
      expect(p.about.length, p.id).toBeGreaterThanOrEqual(3)
      expect(p.about.length, p.id).toBeLessThanOrEqual(5)
      expect(p.core.length, p.id).toBeGreaterThanOrEqual(3)
      expect(p.core.length, p.id).toBeLessThanOrEqual(6)
      expect(p.features.length, p.id).toBeGreaterThanOrEqual(3)
      expect(p.features.length, p.id).toBeLessThanOrEqual(8)
      for (const field of [p.kind, p.genre]) expect(field.length, p.id).toBeGreaterThan(2)
    }
  })

  it('shows update notes only for a work that is out, and only if there are any', () => {
    for (const p of PROJECTS) {
      // None of the five is released, so none of them shows notes — and an
      // empty section is never rendered (e2e/works.spec.ts).
      expect(updatesOf(p), p.id).toEqual([])
    }
    // A released work with notes would show them.
    const out = { ...PROJECTS[0]!, releaseState: 'released' as const,
      updates: [{ version: '1.1', date: '2027.03.12', title: '봄 업데이트', changes: ['새 동료 두 종'] }] }
    expect(updatesOf(out)).toHaveLength(1)
    // A released work with none shows nothing rather than an empty box.
    expect(updatesOf({ ...PROJECTS[0]!, releaseState: 'released' as const })).toEqual([])
  })

  it('shows only pictures that are there, in both sizes', () => {
    for (const p of PROJECTS) {
      expect(p.gallery.length, p.id).toBeGreaterThanOrEqual(1)
      expect(p.gallery.length, p.id).toBeLessThanOrEqual(10)
      const shown = [...p.gallery.map((g) => g.name), ...(p.hero ? [p.hero.name] : [])]
      for (const name of shown) {
        for (const size of ['thumb', 'full'] as const) {
          expect(existsSync(`public${workPicture(p.id, name, size)}`), `${p.id}/${name}-${size}`).toBe(true)
        }
      }
    }
  })

  it("takes a work's traces from the public archive, none of them a gallery picture (PHASE G)", () => {
    for (const p of PROJECTS) {
      const shown = new Set(p.gallery.map((g) => workPicture(p.id, g.name, 'full')))
      for (const t of developmentOf(p.id)) {
        expect(existsSync(`public${t.full}`), t.id).toBe(true)
        expect(shown.has(t.full), `${t.id} is already in ${p.id}'s gallery`).toBe(false)
      }
    }
  })
})

describe('the works, PHASE C', () => {
  it('keeps the core to three things a player does, at most', () => {
    for (const p of PROJECTS) expect(p.core.length, p.id).toBeLessThanOrEqual(3)
  })

  it('makes no plan look like a button: no COMING SOON, and a note is never a link', () => {
    for (const p of PROJECTS) {
      for (const l of p.links) expect(l.label, p.id).not.toMatch(/COMING SOON/i)
    }
  })

  it('shows each character from the work\'s own pictures, in both sizes', () => {
    for (const p of PROJECTS) {
      for (const c of p.characters ?? []) {
        for (const size of ['thumb', 'full'] as const) {
          expect(existsSync(`public${workPicture(p.id, c.picture, size)}`), `${p.id}/${c.picture}-${size}`).toBe(true)
        }
        expect(c.w * c.h, c.picture).toBeGreaterThan(0)
      }
    }
  })
})

describe('WORM UP!, as the Steam game it is now', () => {
  const w = PROJECTS.find((p) => p.id === 'wormup')!

  it('is a narrative adventure on PC (Steam), still being made, with no store button', () => {
    expect(w.kind).toBe('Narrative Adventure')
    expect(w.genre).toBe('내러티브 어드벤처')
    expect(w.platforms).toEqual(['PC (Steam)'])
    expect(w.releaseState).toBe('inDevelopment')
    expect(w.links).toEqual([])
  })

  it('carries the game\'s own subtitles, and its strongest line once', () => {
    expect(w.taglineKo).toBe('봄은 모두에게 같은 날 오지 않았다')
    expect(w.tagline).toBe('Not Every Spring Arrives at Once')
    expect(w.line).toBe('지렁이는 계속 앞으로 간다.')
    const text = JSON.stringify({ ...w, line: undefined })
    expect(text).not.toContain('지렁이는 계속 앞으로 간다')
  })

  it('keeps nothing of the mobile runner in what it says or shows', () => {
    const text = JSON.stringify(w)
    expect(text).not.toMatch(/200|스테이지|러너|[Rr]unner|iOS|보스|등산|산꼭대기|Mobile/)
    for (const old of ['climb', 'couple', 'kidnap', 'crow-boss', 'icon']) {
      expect(existsSync(`public/assets/images/works/wormup/${old}-full.webp`), old).toBe(false)
    }
    expect(existsSync('public/assets/images/worm-up-keyart.webp')).toBe(false)
    // Kept apart, for the archive's Early Prototype.
    expect(existsSync('assets/archive/early-prototype/wormup/worm-up-keyart-runner.webp')).toBe(true)
  })
})

describe('LUMIORA, as its current canon has it', () => {
  const lumiora = getProject('lumiora')!

  it('is the 3D musical narrative adventure, not the old children\'s app', () => {
    expect(lumiora.kind).toBe('Stylized 3D Musical Action-Adventure')
    expect(lumiora.platforms).toEqual(['PC'])
    expect(lumiora.releaseState).toBe('inDevelopment')
    const all = JSON.stringify(lumiora)
    expect(all).not.toMatch(/동화|유아|아이와|부모|교육|storybook|children|kids/i)
  })

  it('goes through the composers in the order the canon fixes', () => {
    const worlds = lumiora.lists?.find((l) => l.title === 'SCORE WORLDS')
    expect(worlds?.rows.map((r) => r.name)).toEqual([
      'Vivaldi', 'Saint-Saëns', 'Beethoven', 'Tchaikovsky', 'Rimsky-Korsakov', 'Debussy', 'Your Score',
    ])
  })

  it('keeps its greybox out of the public gallery, and in the archive', () => {
    for (const g of lumiora.gallery) expect(g.caption, g.name).not.toContain('그레이박스')
    const traces = developmentOf('lumiora')
    expect(traces.some((t) => t.title.includes('그레이박스'))).toBe(true)
  })
})

describe('RUBATO, as its script has it', () => {
  it('names only the canon cast', () => {
    const cast = JSON.stringify(getProject('rubato')!.lists)
    for (const name of ['윤서아', '베토벤', '모차르트', '슈베르트', '브람스', '말러', '살리에리']) expect(cast).toContain(name)
    // In the older design files only; not in the v3 script.
    expect(cast).not.toContain('파가니니')
  })
})

describe('the pages', () => {
  it('title and describe each work the way its record does', () => {
    for (const p of PROJECTS) {
      const html = read(`works/${p.id}.html`)
      expect(html, p.id).toContain(`<title>${p.title} — EUNGARAGE</title>`)
      expect(html, p.id).toContain(`<meta name="description" content="${p.taglineKo}">`)
      expect(html, p.id).toContain(`<link rel="canonical" href="https://eungarage.com/works/${p.id}.html">`)
      expect(html, p.id).toContain(`data-works-detail="${p.id}"`)
      expect(html, p.id).toMatch(new RegExp(`<h1[^>]*>${p.title.replace(/[!]/g, '\\$&')}</h1>`))
      // The lines in the page's own markup are the record's lines: the page
      // carries them so they are there before any script runs, which is
      // exactly how they drift.
      expect(html, `${p.id}: the Korean line`).toContain(`>${p.taglineKo}</p>`)
      expect(html, `${p.id}: the English line`).toContain(`>${p.tagline}</p>`)
    }
  })

  it('sends the old GAMES address, and its #<work> links, to WORKS', () => {
    const games = read('games.html')
    expect(games).toContain('/works.html')
    for (const p of PROJECTS) expect(games, p.id).toContain(`'${p.id}'`)
  })

  it('calls it WORKS in every nav, and the old words are gone', () => {
    const pages = [
      ...readdirSync('.').filter((f) => f.endsWith('.html') && f !== 'games.html'),
      ...readdirSync('works').map((f) => `works/${f}`),
    ]
    for (const f of pages) {
      const html = read(f)
      expect(html, f).not.toMatch(/>Games</)
      expect(html, f).not.toMatch(/OUR<br>GAMES|Selected worlds/i)
    }
    const sources = readdirSync('src', { recursive: true }).map(String).filter((f) => f.endsWith('.ts'))
    for (const f of sources) {
      expect(read(`src/${f}`), f).not.toMatch(/음악 동화|Music storybook|듣고, 발견하고|OUR GAMES/)
    }
  })

  it('lists the works in the sitemap', () => {
    // Written at build time from src/data/sitemap.ts (SITE UPGRADE PHASE B).
    const map = sitemapXml(PROJECTS.map((p) => p.id))
    expect(map).toContain('https://eungarage.com/works.html')
    for (const p of PROJECTS) expect(map).toContain(`https://eungarage.com/works/${p.id}.html`)
  })
})
