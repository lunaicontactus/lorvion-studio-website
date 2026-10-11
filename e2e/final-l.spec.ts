import { test, expect, type Page } from '@playwright/test'

/**
 * PHASE L — final QA (docs/SITE_UPGRADE_PHASE_L.md). The whole site as a
 * first visitor meets it, in Chromium, Firefox and WebKit: every route, then
 * six journeys — by mouse, by keyboard, by touch. Through all of it: no
 * uncaught error, no console error, no first-party request that fails.
 */

const SITE = 'https://eungarage.com'

/** Everything that goes wrong on a page, collected as it happens. */
function watch(page: Page): { problems: string[] } {
  const problems: string[] = []
  const origin = (): string => new URL(page.url() || 'http://x/').origin
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 160)}`) })
  page.on('requestfailed', (r) => {
    // A navigation away cancels what the old page was still fetching; that is not a failure.
    const why = r.failure()?.errorText ?? ''
    if (new URL(r.url()).origin === origin() && !/ABORTED|cancelled|NS_BINDING_ABORTED|Load request cancelled/i.test(why)) problems.push(`failed: ${r.url()} ${why}`)
  })
  page.on('response', (r) => { if (r.status() >= 400 && new URL(r.url()).origin === origin() && !r.url().endsWith('/favicon.ico')) problems.push(`${r.status()}: ${r.url()}`) })
  return { problems }
}

async function seed(page: Page, stars = false): Promise<void> {
  await page.addInitScript((s) => {
    try {
      if (sessionStorage.getItem('final-l')) return
      sessionStorage.setItem('final-l', '1')
      localStorage.clear()
      localStorage.setItem('eungarage:garageHinted', 'true')
      if (s) for (const id of ['mugunghwa', 'snack', 'parcel']) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: 1, plays: 1 }))
    } catch { /* private mode */ }
  }, stars)
}

async function press(page: Page, sel: string, touch: boolean): Promise<void> {
  const el = page.locator(sel).first()
  await el.scrollIntoViewIfNeeded()
  if (touch) await el.tap()
  else await el.click()
}

async function enterGarage(page: Page, touch = false): Promise<void> {
  await page.goto('/?npcseed=7', { waitUntil: 'load' })
  await press(page, '[data-alley-enter]', touch)
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(1500)
}

/** Open a thing the way a keyboard user does: the room pans to it, then Enter. */
async function openThing(page: Page, id: string): Promise<void> {
  const t = page.locator(`[data-object="${id}"]`)
  await t.focus()
  await page.waitForTimeout(450)
  await t.press('Enter')
  await expect(page.locator('[data-panel-root]')).toBeVisible()
  await page.waitForTimeout(1200)
}
async function closePanel(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-panel-root]')).toBeHidden()
  await page.waitForTimeout(500)
}

/** Out through the door to the playground, wait for it to arrive, and back through the arch. */
async function outAndBack(page: Page): Promise<void> {
  await openThing(page, 'outside-door')
  await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 15_000 })
  // Arrived: the night has lifted (WORLD 2.1). Until then the playground
  // ignores a press on purpose (world.ts onPlace) — a fixed wait missed it.
  await expect(page.locator('[data-crossing]')).toBeHidden({ timeout: 15_000 })
  await expect(page.locator('[data-playground]')).not.toHaveClass(/is-hushed/, { timeout: 15_000 })
  await page.locator('[data-place="garage-door"]').focus()
  await page.waitForTimeout(500)
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 15_000 })
  // Back in the room once it is running again, not only shown.
  await expect(page.locator('[data-garage]')).not.toHaveClass(/is-paused/, { timeout: 15_000 })
  await page.waitForTimeout(800)
}

/** The secret door, its three stars seeded, into the storage. */
async function intoStorage(page: Page): Promise<void> {
  await openThing(page, 'secret-door').catch(() => undefined)
  if (!(await page.locator('[data-archive]').isVisible())) await page.locator('[data-object="secret-door"]').press('Enter')
  await expect(page.locator('[data-archive]')).toBeVisible({ timeout: 15_000 })
}

test.describe('L-1 every route', () => {
  test('answers, is named, names itself as canonical, has the site around it, and logs nothing wrong', async ({ page, request, baseURL }) => {
    test.setTimeout(180_000)
    const origin = new URL(baseURL!).origin
    const xml = await (await request.get('/sitemap.xml')).text()
    const routes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.replace(SITE, ''))
    expect(routes).toHaveLength(16)
    const w = watch(page)
    const bad: string[] = []
    for (const r of [...routes, '/404.html']) {
      const res = await page.goto(origin + (r || '/'), { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const f = await page.evaluate(() => ({
        title: document.title,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
        nav: !!document.querySelector('nav.site-nav'), footer: !!document.querySelector('footer'), main: document.querySelectorAll('main').length,
        h1: document.querySelectorAll('h1').length, over: document.documentElement.scrollWidth - innerWidth,
      }))
      const wantCanon = r === '/404.html' ? null : SITE + (r || '/')
      // The home page is the room, edge to edge: its way to every page is the nav and the hidden page list, not a footer.
      if (res?.status() !== 200 || !/EUNGARAGE/.test(f.title) || f.canonical !== wantCanon || !f.nav || (r !== '/' && !f.footer) || f.main !== 1 || f.h1 !== 1 || f.over > 0) bad.push(`${r} ${res?.status()} ${JSON.stringify(f)}`)
    }
    expect(bad).toEqual([])
    expect(w.problems).toEqual([])
  })
})

test.describe('L-2 journeys, by mouse', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('A — first visit: alley → garage → a thing → WORKS (the PC) → a work → Works → back to the garage', async ({ page }) => {
    test.setTimeout(120_000)
    const w = watch(page)
    await seed(page)
    await enterGarage(page)
    await openThing(page, 'tv')
    await closePanel(page)
    // In the room, the nav's WORKS is the PC on the desk (the works are on it), not a page change.
    await press(page, 'nav.site-nav a[href*="works"]', false)
    await expect(page.locator('[data-desk]')).toBeVisible({ timeout: 8000 })
    await press(page, '[data-game="liminal"]', false)
    await expect(page).toHaveURL(/\/works\/liminal\.html$/, { timeout: 15_000 })
    await press(page, '.works__back a[href="/works.html"]', false)
    await expect(page).toHaveURL(/\/works\.html$/)
    await press(page, '[data-record="lunai"]', false)
    await expect(page).toHaveURL(/\/works\/lunai\.html$/)
    await expect(page.locator('h1')).toHaveText('LUNAI')
    await press(page, '[data-works-home]', false)
    await expect(page.locator('[data-alley-enter], [data-garage]').first()).toBeVisible({ timeout: 15_000 })
    expect(w.problems).toEqual([])
  })

  /**
   * Linux WebKit (the CI runner's WebKit, software-rendered) loses its web
   * process during the animated crossing to the playground when the secret
   * door is unlocked — exit code 0, no signal, no page error. Proven on the
   * runner (diagnostic PR #31): with the three stars and motion it ends
   * 2–4 times in 4; without the stars, never (11 runs); with reduced motion,
   * never (3 runs); hiding every star picture does not change it; the PHASE I
   * code (f862f29) does the same, so it is older than J, K and L. macOS
   * WebKit (Apple's port) does the whole path 10 times in 10. So there, and
   * only there, journey B goes out and back without the stars, and B′ below
   * walks the secret door with reduced motion. docs/SITE_UPGRADE_PHASE_L.md §3.
   */
  const linuxWebkit = (browserName: string): boolean => browserName === 'webkit' && process.platform === 'linux'

  test('B — the room: TV → radio → fridge → cabinet → LIMINAL case → playground → secret door', async ({ page, browserName }) => {
    test.setTimeout(180_000)
    const stars = !linuxWebkit(browserName)
    const w = watch(page)
    await seed(page, stars)
    await enterGarage(page)
    for (const id of ['tv', 'radio', 'fridge']) {
      await openThing(page, id)
      if (id === 'radio') await press(page, '[data-station="1"]', false)
      await closePanel(page)
    }
    await openThing(page, 'cabinet')
    await press(page, '[data-case-file]', false)
    await expect(page.locator('[data-case-go]')).toBeVisible()
    await closePanel(page)
    await outAndBack(page)
    // The secret door (its three stars are seeded) into the storage.
    if (stars) await intoStorage(page)
    expect(w.problems).toEqual([])
  })

  test('B′ — with less motion: the stars earned, out to the playground and back, through the secret door', async ({ browser }) => {
    test.setTimeout(150_000)
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', baseURL: test.info().project.use.baseURL })
    const page = await ctx.newPage()
    const w = watch(page)
    await seed(page, true)
    await enterGarage(page)
    await outAndBack(page)
    await intoStorage(page)
    expect(w.problems).toEqual([])
    await ctx.close()
  })

  test('C — the works and the archive: five works, their pictures, the records, an early prototype', async ({ page }) => {
    test.setTimeout(180_000)
    const w = watch(page)
    for (const id of ['lunai', 'liminal', 'wormup', 'lumiora', 'rubato']) {
      await page.goto(`/works/${id}.html`, { waitUntil: 'networkidle' })
      await press(page, '[data-shot="0"]', false)
      await expect(page.locator('.work-view')).toBeVisible()
      await expect(page.locator('.work-view__img')).toHaveJSProperty('complete', true)
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Escape')
      await expect(page.locator('.work-view')).toBeHidden()
    }
    await page.goto('/archive.html', { waitUntil: 'networkidle' })
    await expect(page.locator('[data-badge]').first()).toBeVisible()
    await press(page, '[data-record-shot]', false)
    await expect(page.locator('.work-view')).toBeVisible()
    await page.keyboard.press('Escape')
    expect(w.problems).toEqual([])
  })

  test('D — the studio: Studio → Press → Contact → Support', async ({ page }) => {
    const w = watch(page)
    await page.goto('/studio.html', { waitUntil: 'networkidle' })
    await press(page, 'main a[href="/press.html"]', false)
    await expect(page).toHaveURL(/\/press\.html$/)
    await press(page, 'nav.site-nav a[href="/contact.html"]', false)
    await expect(page).toHaveURL(/\/contact\.html$/)
    await expect(page.locator('[data-contact] a[href^="mailto:"]')).toHaveCount(4)
    await press(page, 'main a[href="/support.html"]', false)
    await expect(page).toHaveURL(/\/support\.html$/)
    expect(w.problems).toEqual([])
  })

  test('E — the LUNAI documents: Support → Privacy → Terms → Community → Account deletion', async ({ page }) => {
    const w = watch(page)
    await page.goto('/support.html', { waitUntil: 'networkidle' })
    for (const doc of ['/privacy.html', '/terms.html', '/community-guidelines.html', '/account-deletion.html']) {
      await press(page, `main a[href$="${doc.slice(1)}"]`, false)
      await expect(page).toHaveURL(new RegExp(`${doc.replace('.', '\\.')}$`))
      await expect(page.locator('article.doc')).toBeVisible()
    }
    expect(w.problems).toEqual([])
  })

  test('F — a wrong address: the not-found page, and back to a real one', async ({ page, baseURL }) => {
    const w = watch(page)
    const live = !/localhost|127\.0\.0\.1/.test(baseURL!)
    // Pages serves 404.html for an unknown address; the local preview does not, so open it directly there.
    const res = await page.goto(live ? '/no-such-room' : '/404.html', { waitUntil: 'networkidle' })
    if (live) expect(res?.status()).toBe(404)
    await expect(page.locator('h1')).toContainText('만들어지지 않은 방')
    const links = page.locator('main a')
    expect(await links.count()).toBeGreaterThanOrEqual(3)
    await press(page, 'main a[href="/works.html"]', false)
    await expect(page).toHaveURL(/\/works\.html$/)
    // The unknown address itself answers 404, as it should, and Chromium and
    // WebKit log that to the console without its URL. That one is expected;
    // any other 404 — a picture, a script — is not.
    const others404 = w.problems.filter((p) => /^404: /.test(p) && !p.includes('no-such-room'))
    expect(w.problems.filter((p) => !p.includes('no-such-room') && !(others404.length === 0 && /^console: Failed to load resource: .*404/.test(p)))).toEqual([])
  })
})

test.describe('L-2 journeys, by keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('alley → garage → PC → back; Works → a work → its picture → back', async ({ page, browserName }) => {
    test.setTimeout(120_000)
    // Safari moves through links and buttons with Option+Tab unless its
    // "Press Tab to highlight each item" setting is on; that is what a
    // keyboard user there presses.
    const TAB = browserName === 'webkit' ? 'Alt+Tab' : 'Tab'
    const w = watch(page)
    await seed(page)
    await page.goto('/', { waitUntil: 'load' })
    let ok = false
    for (let i = 0; i < 30 && !ok; i++) { await page.keyboard.press(TAB); ok = await page.evaluate(() => !!document.activeElement?.matches('[data-alley-enter]')) }
    expect(ok).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500)
    ok = false
    for (let i = 0; i < 40 && !ok; i++) { await page.keyboard.press(TAB); ok = await page.evaluate(() => document.activeElement?.getAttribute('data-object') === 'pc') }
    expect(ok).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-panel-root]')).toBeVisible()
    await page.waitForTimeout(800)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-object="pc"]')).toBeFocused()
    await page.goto('/works.html', { waitUntil: 'networkidle' })
    ok = false
    for (let i = 0; i < 30 && !ok; i++) { await page.keyboard.press(TAB); ok = await page.evaluate(() => !!document.activeElement?.matches('[data-record="liminal"]')) }
    expect(ok).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/works\/liminal\.html$/)
    ok = false
    for (let i = 0; i < 50 && !ok; i++) { await page.keyboard.press(TAB); ok = await page.evaluate(() => !!document.activeElement?.matches('[data-shot]')) }
    expect(ok).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.locator('.work-view')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-shot]').first()).toBeFocused()
    expect(w.problems).toEqual([])
  })
})

test.describe('L-2 journeys, by touch', () => {
  test('phone upright: alley → garage → PC → a work → its picture; the menu to Studio and Contact', async ({ browser, browserName }) => {
    test.setTimeout(150_000)
    // Firefox has no mobile device mode in Playwright; a touch screen at a phone's size is what it can be.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }), baseURL: test.info().project.use.baseURL })
    const page = await ctx.newPage()
    const w = watch(page)
    await seed(page)
    await enterGarage(page, true)
    await openThing(page, 'pc')
    await press(page, '[data-game="wormup"]', true)
    await expect(page).toHaveURL(/\/works\/wormup\.html$/, { timeout: 15_000 })
    await press(page, '[data-shot="0"]', true)
    await expect(page.locator('.work-view')).toBeVisible()
    await press(page, '.work-view__close', true)
    await expect(page.locator('.work-view')).toBeHidden()
    await press(page, '.menu-toggle', true)
    await press(page, '#primaryNav a[href="/studio.html"]', true)
    await expect(page).toHaveURL(/\/studio\.html$/)
    await press(page, '.menu-toggle', true)
    await press(page, '#primaryNav a[href="/contact.html"]', true)
    await expect(page).toHaveURL(/\/contact\.html$/)
    expect(w.problems).toEqual([])
    await ctx.close()
  })
})
