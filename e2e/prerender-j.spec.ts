import { test, expect, type Browser } from '@playwright/test'

/**
 * PHASE J: the build writes each page's content into its HTML
 * (src/render/pages.ts via vite.config.ts), and the page's script then only
 * wires it up. What a reader without scripts gets must be exactly what a
 * visitor with them gets — nothing missing, nothing twice.
 */
const PAGES = ['/works.html', '/works/lunai.html', '/works/liminal.html', '/works/wormup.html', '/works/lumiora.html', '/works/rubato.html', '/archive.html', '/studio.html', '/press.html']

/** The page's content, as a list: every heading, link, picture, button and paragraph, in order. */
async function content(browser: Browser, path: string, js: boolean): Promise<string[]> {
  const ctx = await browser.newContext({ javaScriptEnabled: js, viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(path, { waitUntil: 'networkidle' })
  // Its module has run (the works pages also settle their paper; info pages have no such step).
  if (js) await page.waitForFunction(() => document.querySelector('[data-prerendered]') !== null && document.readyState === 'complete')
  const items = await page.evaluate(() => {
    const main = document.querySelector('main')!
    return [...main.querySelectorAll('h1,h2,h3,p,li,dt,dd,a,img,button,figcaption,audio')]
      // The viewer is the script's own, added when it runs, and is not content.
      .filter((e) => !e.closest('.work-view'))
      .map((e) => `${e.tagName.toLowerCase()} ${e.getAttribute('href') ?? e.getAttribute('src') ?? ''} ${(e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)}`)
  })
  await ctx.close()
  return items
}

for (const path of PAGES) {
  test(`${path}: the same content with and without the script, and none of it twice`, async ({ browser }) => {
    const without = await content(browser, path, false)
    const withJs = await content(browser, path, true)
    expect(without.length, 'the page has its content without the script').toBeGreaterThan(10)
    expect(withJs).toEqual(without)
  })
}

test('the prerendered pieces are marked, so the script leaves them be', async ({ page }) => {
  for (const [path, sel] of [['/works.html', '[data-records]'], ['/studio.html', '[data-fallback-studio]'], ['/press.html', '[data-press]'], ['/archive.html', '[data-records-shelves]'], ['/works/lunai.html', '[data-works-detail]']] as const) {
    await page.goto(path, { waitUntil: 'load' })
    await expect(page.locator(sel)).toHaveAttribute('data-prerendered', '')
    // One hero picture, one set of tags, one body.
    if (path.startsWith('/works/')) {
      await expect(page.locator('.work-hero__frame')).toHaveCount(1)
      await expect(page.locator('.work-tags')).toHaveCount(1)
      await expect(page.locator('#about-h')).toHaveCount(1)
    }
  }
})
