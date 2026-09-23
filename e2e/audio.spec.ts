import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The radio, and the rule that music is one thing at a time.
 *
 * Every `play()` on every media element is recorded before the page runs,
 * so what is counted is what the browser was actually asked to sound, not
 * what the code meant. Music is the world's track or the radio's station;
 * the room tone and the loops under the music are not music.
 */
declare global {
  interface Window { __plays?: { t: number; src: string }[]; __els?: Set<HTMLMediaElement> }
}
const MUSIC = /garage\.m4a|playground\.m4a|archive\.m4a|poko\.m4a|snack\.m4a|parcel\.m4a|radio_static/

async function spy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ }
    window.__plays = []
    window.__els = new Set()
    const orig = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__els!.add(this)
      window.__plays!.push({ t: Math.round(performance.now()), src: (this.currentSrc || this.src || '').split('/').pop() ?? '' })
      return orig.call(this)
    }
  })
}
const plays = (page: Page, name: string): Promise<number> =>
  page.evaluate((n) => (window.__plays ?? []).filter((p) => p.src === n).length, name)
/** The music sounding now: elements not paused whose file is a track. */
const music = (page: Page): Promise<string[]> =>
  page.evaluate((re) => [...(window.__els ?? [])].filter((e) => !e.paused && new RegExp(re).test(e.currentSrc || e.src))
    .map((e) => (e.currentSrc || e.src).split('/').pop() ?? ''), MUSIC.source)

async function enter(page: Page, soundOn: boolean): Promise<void> {
  await spy(page)
  await page.goto('/?npcseed=7', { waitUntil: 'load' })
  if (soundOn) await page.locator('[data-sound-toggle]').click()
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(2500)
}
async function openRadio(page: Page): Promise<void> {
  const radio = page.locator('[data-object="radio"]')
  await radio.focus()
  await page.waitForTimeout(600)
  await radio.press('Enter')
  await expect(page.locator('[data-radio]')).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(600)
}

// Headless Chromium is asked to let media play without a gesture, so what
// is measured is the site's own arbitration and not the browser's gate.
test.use({ viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })

test.describe('the radio', () => {

  test('its power sound plays once, on off → on, and never again', async ({ page }) => {
    await enter(page, false)
    await openRadio(page)
    expect(await plays(page, 'radio_tune.m4a'), 'a click just for opening it').toBe(0)
    await page.locator('[data-radio-power]').click()
    await expect(page.locator('[data-radio-power]')).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(1500)
    expect(await plays(page, 'radio_tune.m4a')).toBe(1)
    // Ten seconds on: nothing about being on repeats it.
    await page.waitForTimeout(10000)
    expect(await plays(page, 'radio_tune.m4a')).toBe(1)
    // Changing the station is not switching it on.
    for (let i = 0; i < 4; i++) {
      await page.locator('[data-radio-next]').click()
      await page.waitForTimeout(700)
    }
    expect(await plays(page, 'radio_tune.m4a')).toBe(1)
    // Off and on again is the one way to hear it again.
    await page.locator('[data-radio-power]').click()
    await page.waitForTimeout(600)
    await page.locator('[data-radio-power]').click()
    await page.waitForTimeout(600)
    expect(await plays(page, 'radio_tune.m4a')).toBe(2)
  })

  test('the static stations are a bed, not a two-second burst restarting', async ({ page }) => {
    await enter(page, true)
    await openRadio(page)
    await page.locator('[data-station="3"]').click()
    await page.waitForTimeout(800)
    const src = await page.evaluate(() => [...(window.__els ?? [])].filter((e) => !e.paused).map((e) => e.currentSrc).find((s) => s.includes('radio_static')) ?? '')
    expect(src).toContain('radio_static_bed.m4a')
    const duration = await page.evaluate(() => [...(window.__els ?? [])].find((e) => e.currentSrc.includes('radio_static'))?.duration ?? 0)
    expect(duration).toBeGreaterThan(15)
  })

  test('music is one thing at a time: station, world, and back', async ({ page }) => {
    await enter(page, true)
    await page.waitForTimeout(1500)
    expect(await music(page)).toEqual(['garage.m4a'])
    await openRadio(page)
    // A: one station. B: the other, and A is gone.
    await page.locator('[data-station="3"]').click()
    await page.waitForTimeout(900)
    expect(await music(page)).toEqual(['radio_static_bed.m4a'])
    await page.locator('[data-station="0"]').click()
    await page.waitForTimeout(900)
    expect(await music(page)).toEqual(['garage.m4a'])
    // Off: no music. On: the station is back.
    await page.locator('[data-radio-power]').click()
    await page.waitForTimeout(600)
    expect(await music(page)).toEqual([])
    await page.locator('[data-radio-power]').click()
    await page.waitForTimeout(900)
    expect(await music(page)).toEqual(['garage.m4a'])
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    // Out through the door: the station goes before the playground's music
    // comes; never both. Sampled through the whole crossing.
    const door = page.locator('[data-object="outside-door"]')
    await door.focus()
    await page.waitForTimeout(500)
    await door.press('Enter')
    const seen: string[][] = []
    for (let i = 0; i < 28; i++) {
      seen.push(await music(page))
      await page.waitForTimeout(250)
    }
    for (const m of seen) expect(m.length, `two at once: ${m.join(' + ')}`).toBeLessThanOrEqual(1)
    await page.waitForFunction(() => !document.querySelector<HTMLElement>('[data-playground]')!.hidden)
    await page.waitForTimeout(1500)
    expect(await music(page)).toEqual(['playground.m4a'])
    // And back: the same, the other way.
    await page.goBack()
    const back: string[][] = []
    for (let i = 0; i < 28; i++) {
      back.push(await music(page))
      await page.waitForTimeout(250)
    }
    for (const m of back) expect(m.length, `two at once: ${m.join(' + ')}`).toBeLessThanOrEqual(1)
    await page.waitForTimeout(1500)
    expect(await music(page)).toEqual(['garage.m4a'])
    expect(await plays(page, 'radio_tune.m4a'), 'coming back in is not switching it on').toBe(1)
  })

  test('a hidden tab is silent, and a visible one has exactly what it had', async ({ page }) => {
    await enter(page, true)
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(600)
    expect(await music(page)).toEqual([])
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(1200)
    expect(await music(page)).toEqual(['garage.m4a'])
    expect(await plays(page, 'radio_tune.m4a'), 'the tab coming back is not the switch').toBe(0)
  })
})
