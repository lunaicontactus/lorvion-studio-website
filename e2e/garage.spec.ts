import { test, expect, type Page } from '@playwright/test'

const SHOTS = 'e2e/shots'

/** Skip the alley and land in the room, with a clean session each time. */
async function enterGarage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* nothing */
    }
  })
  await page.goto('/')
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 15_000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  // The room fades in behind a transition; give it a beat to settle.
  await page.waitForTimeout(600)
}

const transform = (page: Page): Promise<string> =>
  page.locator('[data-garage-room]').evaluate((el) => getComputedStyle(el).transform)

/** Horizontal translate out of the room's matrix. */
function tx(matrix: string): number {
  const n = matrix.match(/matrix\(([^)]+)\)/)
  return n ? Number(n[1]!.split(',')[4]) : NaN
}
function ty(matrix: string): number {
  const n = matrix.match(/matrix\(([^)]+)\)/)
  return n ? Number(n[1]!.split(',')[5]) : NaN
}

async function drag(page: Page, from: [number, number], dx: number, dy = 0): Promise<void> {
  await page.mouse.move(from[0], from[1])
  await page.mouse.down()
  // Several steps: one jump would not look like a drag to the scene.
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(from[0] + (dx * i) / 12, from[1] + (dy * i) / 12)
  }
  await page.mouse.up()
  // The camera eases, so wait for it to arrive rather than sampling mid-flight.
  await page.waitForTimeout(900)
}

test.describe('garage camera, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a drag moves the room, both ways, and stops at the walls', async ({ page }) => {
    await enterGarage(page)
    const start = await transform(page)
    await page.screenshot({ path: `${SHOTS}/desktop-01-before-drag.png` })

    // Left drag: the room slides so we look further right.
    await drag(page, [720, 450], -320)
    const afterLeft = await transform(page)
    await page.screenshot({ path: `${SHOTS}/desktop-02-after-drag-left.png` })
    expect(afterLeft).not.toBe(start)
    expect(tx(afterLeft)).toBeLessThan(tx(start))

    // And back the other way.
    await drag(page, [720, 450], 320)
    const afterRight = await transform(page)
    await page.screenshot({ path: `${SHOTS}/desktop-03-after-drag-right.png` })
    expect(tx(afterRight)).toBeGreaterThan(tx(afterLeft))

    // Hard against the left wall: the room's left edge cannot come inside 0.
    for (let i = 0; i < 6; i++) await drag(page, [720, 450], 600)
    const atLeftWall = tx(await transform(page))
    await page.screenshot({ path: `${SHOTS}/desktop-04-left-wall.png` })
    expect(atLeftWall).toBeCloseTo(0, 0)

    // And the right wall: the room's right edge cannot come inside the viewport.
    for (let i = 0; i < 8; i++) await drag(page, [720, 450], -600)
    const atRightWall = tx(await transform(page))
    await page.screenshot({ path: `${SHOTS}/desktop-05-right-wall.png` })
    const roomWidth = await page
      .locator('[data-garage-room]')
      .evaluate((el) => el.getBoundingClientRect().width)
    expect(roomWidth + atRightWall).toBeCloseTo(1440, 0)
  })

  test('the wheel moves the room', async ({ page }) => {
    await enterGarage(page)
    const before = await transform(page)
    await page.mouse.move(720, 450)
    await page.mouse.wheel(0, 500)
    await page.waitForTimeout(900)
    const after = await transform(page)
    await page.screenshot({ path: `${SHOTS}/desktop-06-wheel.png` })
    expect(tx(after)).not.toBeCloseTo(tx(before), 1)
  })

  test('the keyboard moves the room', async ({ page }) => {
    await enterGarage(page)
    const before = await transform(page)
    await page.keyboard.down('d')
    await page.waitForTimeout(500)
    await page.keyboard.up('d')
    await page.waitForTimeout(700)
    const afterD = await transform(page)
    expect(tx(afterD)).toBeLessThan(tx(before))

    await page.keyboard.down('ArrowLeft')
    await page.waitForTimeout(500)
    await page.keyboard.up('ArrowLeft')
    await page.waitForTimeout(700)
    const afterLeft = await transform(page)
    await page.screenshot({ path: `${SHOTS}/desktop-07-keys.png` })
    expect(tx(afterLeft)).toBeGreaterThan(tx(afterD))
  })

  test('nothing marks the room until the pointer is on something', async ({ page }) => {
    await enterGarage(page)
    const lit = async (): Promise<string[]> =>
      page.evaluate(() =>
        [...document.querySelectorAll('.thing')]
          .filter((t) => {
            const o = t.querySelector('.thing__outline')
            return o ? Number(getComputedStyle(o).opacity) > 0.5 : false
          })
          .map((t) => (t as HTMLElement).dataset['object'] ?? ''),
      )
    expect(await lit()).toEqual([])

    const pc = page.locator('.thing--pc')
    await pc.hover()
    await page.waitForTimeout(200)
    expect(await lit()).toEqual(['pc'])
    await page.screenshot({ path: `${SHOTS}/desktop-08-hover-pc.png` })

    await page.locator('.thing--fridge').hover()
    await page.waitForTimeout(200)
    expect(await lit()).toEqual(['fridge'])
    await page.screenshot({ path: `${SHOTS}/desktop-09-hover-fridge.png` })

    // Away from everything: it must not linger.
    await page.mouse.move(720, 860)
    await page.waitForTimeout(300)
    expect(await lit()).toEqual([])
  })

  test('a keyboard focus shows the same silhouette', async ({ page }) => {
    await enterGarage(page)
    // Reaching it with real Tab presses, not .focus(): Chromium only counts a
    // focus as "visible" when the keyboard put it there, which is exactly the
    // case this needs to prove.
    let reached = false
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.dataset?.['object'] === 'pc',
      )
    }
    expect(reached).toBe(true)
    await page.waitForTimeout(200)
    const shown = await page
      .locator('.thing--pc .thing__outline')
      .evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(shown)).toBeGreaterThan(0.5)
    // And no browser rectangle of its own.
    const ring = await page
      .locator('.thing--pc')
      .evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(ring).toBe('none')
    await page.screenshot({ path: `${SHOTS}/desktop-10-focus-pc.png` })
  })
})

test.describe('garage camera, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('a touch drag moves the tall room up and down, and stops at the ends', async ({ page }) => {
    await enterGarage(page)
    await page.screenshot({ path: `${SHOTS}/mobile-01-before-drag.png` })
    const start = await transform(page)

    const swipe = async (dy: number): Promise<void> => {
      // No tap to "wake" it: a tap opens whatever is under the finger, which
      // pauses the room and makes every later swipe do nothing.
      await page.locator('[data-garage]').dispatchEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 195,
        clientY: 420,
        button: 0,
        isPrimary: true,
      })
      for (let i = 1; i <= 12; i++) {
        await page.evaluate(
          ({ y, id }) => {
            window.dispatchEvent(
              new PointerEvent('pointermove', {
                pointerId: id,
                pointerType: 'touch',
                clientX: 195,
                clientY: y,
                bubbles: true,
              }),
            )
          },
          { y: 420 + (dy * i) / 12, id: 1 },
        )
      }
      await page.evaluate(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }))
      })
      await page.waitForTimeout(900)
    }

    await swipe(-300)
    // Nothing may have opened; a paused room would fake a passing clamp test.
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    const afterUp = await transform(page)
    await page.screenshot({ path: `${SHOTS}/mobile-02-after-swipe-up.png` })
    expect(ty(afterUp)).toBeLessThan(ty(start))

    await swipe(300)
    const afterDown = await transform(page)
    expect(ty(afterDown)).toBeGreaterThan(ty(afterUp))

    // To the top and stop.
    for (let i = 0; i < 8; i++) await swipe(600)
    const atTop = ty(await transform(page))
    await page.screenshot({ path: `${SHOTS}/mobile-03-top-clamp.png` })
    expect(atTop).toBeCloseTo(0, 0)
  })

  test('a drag does not open the thing it finished on', async ({ page }) => {
    await enterGarage(page)
    const box = await page.locator('.thing--pc').boundingBox()
    if (!box) throw new Error('no pc')
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    // Drag that happens to end on the PC.
    await page.mouse.move(cx - 200, cy)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(cx - 200 + (200 * i) / 10, cy)
    await page.mouse.up()
    await page.waitForTimeout(500)
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    await page.screenshot({ path: `${SHOTS}/mobile-04-drag-no-open.png` })
  })

  test('the first visit says once how to look around', async ({ page }) => {
    await enterGarage(page)
    const hint = page.locator('.garage__hint')
    await expect(hint).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/mobile-05-hint.png` })
    await expect(hint).toHaveCount(0, { timeout: 8_000 })

    // Same session, second time in: silence.
    await page.goto('/')
    await page.locator('[data-alley-enter]').click()
    await page.waitForTimeout(1500)
    await expect(page.locator('.garage__hint')).toHaveCount(0)
  })
})
