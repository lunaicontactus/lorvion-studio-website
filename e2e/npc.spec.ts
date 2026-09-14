import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The crew.
 *
 * Most of these are about restraint rather than motion: that there is exactly
 * one of each however you come and go, that they never take a click away from
 * the visitor, that they stop choosing errands while something is open, and
 * that they stand still for long stretches. The route of the first one is
 * pinned with ?npcseed so a walk can be asserted at all.
 *
 * Assertions about one dokkaebi name it. Whoever has rendered frames is in
 * the room, so a bare `[data-npc]` count grows every time a character's
 * frames land, and a test that counted them would fail on delivery rather
 * than on breakage.
 */

const NPC = '[data-npc]'
const MOMO = '[data-npc="momo"]'

declare global {
  interface Window {
    __npcStates?: { who: string; state: string; x: number; y: number }[]
  }
}

/**
 * Write down every state one dokkaebi enters, and where it stood at the time.
 *
 * Installed before the page runs, so nothing is missed between the room
 * building a character and a test getting round to asking. Both halves of a
 * transition are recorded together — a state read now and a position read a
 * round trip later are not necessarily the same moment.
 */
async function watchStates(page: Page, who = 'momo'): Promise<void> {
  await page.addInitScript((id) => {
    window.__npcStates = []
    const note = (el: Element): void => {
      const node = el as HTMLElement
      const npc = node.dataset['npc']
      // `*` watches the whole crew; a name watches the one.
      if (!npc || (id !== '*' && npc !== id) || !node.dataset['state']) return
      const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(node.style.transform)
      window.__npcStates!.push({
        who: npc,
        state: node.dataset['state']!,
        x: Number(m?.[1] ?? 0),
        y: Number(m?.[2] ?? 0),
      })
    }
    const watch = (): void => {
      new MutationObserver((records) => {
        for (const r of records) {
          // A state that changes on an element already in the page.
          if (r.type === 'attributes') note(r.target as Element)
          // And a character that arrives already in one: an attribute set
          // before the element is appended raises no record of its own.
          for (const added of r.addedNodes) {
            if (!(added instanceof Element)) continue
            note(added)
            for (const el of added.querySelectorAll('[data-npc]')) note(el)
          }
        }
      }).observe(document.documentElement, {
        subtree: true, childList: true,
        attributes: true, attributeFilter: ['data-state'],
      })
    }
    if (document.documentElement) watch()
    else document.addEventListener('DOMContentLoaded', watch)
  }, who)
}

async function enter(page: Page, query = ''): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto(`/${query}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(900)
}

/** Where one dokkaebi's feet are, in world units. */
async function feet(page: Page, who = MOMO): Promise<{ x: number; y: number }> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement
    const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform)
    return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) }
  }, who)
}

/** `action:direction` from the frame on screen, e.g. "walk:left". */
async function pose(page: Page, who = MOMO): Promise<string> {
  return page.evaluate((sel) => {
    const img = document.querySelector(`${sel} img`) as HTMLImageElement
    const m = /\/dokkaebi(?:-v2)?\/\w+\/(\w+)\/(\w+)\//.exec(img.src)
    return m ? `${m[1]}:${m[2]}` : 'still'
  }, who)
}

/** Everybody on the floor, by id. The ones off the edge of the plate
 *  (src/systems/stage.ts) are mounted but not in the room. */
async function whoIsHere(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-npc]:not(.is-away)')].map((e) => (e as HTMLElement).dataset['npc'] ?? ''))
}

/** Everybody mounted, on the floor or off the edge of it. */
async function whoIsMounted(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-npc]')].map((e) => (e as HTMLElement).dataset['npc'] ?? ''))
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('everybody is on the floor, and no two of them in the same place', async ({ page }) => {
    await enter(page)
    const here = await whoIsHere(page)
    expect(here.length).toBeGreaterThan(0)
    // No duplicates: one element per character, however the room was built.
    expect(new Set(here).size).toBe(here.length)
    const places = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
    for (const p of places) {
      expect(p.y).toBeGreaterThan(980)
      expect(p.y).toBeLessThan(1080)
    }
    // Found where they live, not all stacked on one spawn point.
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        expect(Math.hypot(places[i]!.x - places[j]!.x, places[i]!.y - places[j]!.y),
          `${here[i]} and ${here[j]} started on top of each other`).toBeGreaterThan(80)
      }
    }
  })

  test('they never all walk at once', async ({ page }) => {
    await enter(page)
    const here = await whoIsHere(page)
    test.skip(here.length < 2, 'needs more than one to budget')
    let worst = 0
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(700)
      const a = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
      await page.waitForTimeout(260)
      const b = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
      const moving = a.filter((p, k) => Math.hypot(p.x - b[k]!.x, p.y - b[k]!.y) > 6).length
      worst = Math.max(worst, moving)
    }
    // Two, by budget. A third can be caught mid-shuffle as it steps out of
    // somebody's way, which is not an errand and is not what the budget counts.
    expect(worst).toBeLessThanOrEqual(3)
  })

  test('two of them never end up standing in the same place', async ({ page }) => {
    await enter(page)
    const here = await whoIsHere(page)
    test.skip(here.length < 2, 'needs more than one to collide')
    let closest = Infinity
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(900)
      // Whoever is on the floor at this moment: the cast rotates, and one
      // walking off the edge meets nobody there.
      const now = await Promise.all((await whoIsHere(page)).map((id) => feet(page, `[data-npc="${id}"]`)))
      for (let a = 0; a < now.length; a++) {
        for (let b = a + 1; b < now.length; b++) {
          closest = Math.min(closest,
            Math.hypot(now[a]!.x - now[b]!.x, (now[a]!.y - now[b]!.y) * 2.2))
        }
      }
    }
    // They may pass each other; they may not merge. Half a body width is the
    // point at which two silhouettes stop reading as two.
    expect(closest).toBeGreaterThan(40)
  })

  test('it walks somewhere, stands at it, and stands about between', async ({ page }) => {
    test.setTimeout(180_000)
    // Nothing here samples. The old version added up how far the feet moved
    // between looks a second apart and asked for 240 units in seventy
    // seconds, which is a wall-clock measure of something that does not run
    // on the wall clock: five of them share the room and only two may walk
    // at once, so on a loaded machine one character spends more of the
    // window waiting its turn and the sum comes in under — 238.5 and 237.8
    // on CI against a floor of 240, while passing here every time.
    //
    // A trip is a thing with a start and an end, so it is counted as one:
    // the watcher writes down every state the crew enters and where their
    // feet were at that instant, and a trip is a WALK followed by anything
    // else. How long the machine took to draw it does not enter into it.
    await watchStates(page, '*')
    await enter(page, '?npcseed=7')
    // Three things, all of them events rather than moments, and all of them
    // asked of the crew rather than of MOMO: it finished a trip, it used
    // something when it got there, and the places it was seen are far enough
    // apart to call it going somewhere.
    //
    // Of the crew, because the room lets only two of five walk at once. A
    // named character can spend a whole window waiting its turn, and how
    // many turns it gets inside seventy seconds is a fact about the machine:
    // MOMO covers 808 units here and 238 on CI, which is what sank the old
    // floor of 240. What does not move with the frame rate is whether the
    // room is a place where somebody walks somewhere and uses it.
    const room = (): Promise<{ leg: boolean; used: boolean; spread: number }> =>
      page.evaluate(() => {
        const all = window.__npcStates ?? []
        const crew = [...new Set(all.map((s) => s.who))]
        let leg = false
        let spread = 0
        for (const who of crew) {
          const s = all.filter((r) => r.who === who)
          leg ||= s.some((cur, i) => i > 0 && s[i - 1]!.state === 'WALK' && cur.state !== 'WALK')
          const xs = s.map((r) => r.x)
          const ys = s.map((r) => r.y)
          spread = Math.max(spread,
            Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)))
        }
        const used = all.some((cur) =>
          cur.state === 'WORK' || cur.state === 'SIT' || cur.state === 'INTERACT')
        return { leg, used, spread }
      })
    await expect.poll(async () => {
      const r = await room()
      return r.leg && r.used && r.spread > 100
    }, { timeout: 150_000, intervals: [1000] }).toBe(true)

    const { leg, used, spread } = await room()
    expect(leg, 'nobody ever finished a trip').toBe(true)
    expect(used, 'walked about without anybody using anything').toBe(true)
    expect(spread, 'nobody went anywhere').toBeGreaterThan(100)
  })

  test('the frames it plays are real files, and the walk actually cycles', async ({ page }) => {
    await enter(page)
    const frames = await page.evaluate(async () => {
      const img = document.querySelector('[data-npc="momo"] img') as HTMLImageElement
      const seen = new Set<string>()
      const t0 = Date.now()
      while (Date.now() - t0 < 6000) {
        seen.add(img.getAttribute('src') ?? '')
        await new Promise((r) => setTimeout(r, 60))
      }
      return [...seen]
    })
    // A breath is four frames; standing on one of them is a still image.
    expect(frames.length).toBeGreaterThan(1)
    for (const f of frames) {
      const res = await page.request.get(f)
      expect(res.status(), f).toBe(200)
    }
  })

  test('touching it stops it and turns it to face the visitor', async ({ page }) => {
    await enter(page)
    // Past the hello: whoever is nearest hops and waves as the visitor comes
    // in, and a box measured mid-hop is a box measured against moving art.
    await page.waitForTimeout(1800)
    const hit = page.locator(`${MOMO} .npc__hit`)
    await expect(hit).toHaveCount(1)
    // Big enough to hit on a phone, and the same floor the room's things use.
    const box = await hit.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    // Over the dokkaebi, which sounds too obvious to test until it is not.
    // The hit area was anchored to the bottom of a box that hung below the
    // feet, so for a while it sat entirely on the floor underneath the
    // character and a visitor clicking one hit nothing at all. Every test
    // here passed, because they all clicked with { force: true }.
    const art = (await page.locator(`${MOMO} img`).boundingBox())!
    expect(box!.y).toBeGreaterThan(art.y)
    expect(box!.y + box!.height).toBeLessThanOrEqual(art.y + art.height + 2)
    // So: a real click, at the middle of the sprite, with nothing forced.
    await page.mouse.click(art.x + art.width / 2, art.y + art.height * 0.55)
    await page.waitForTimeout(400)
    // It stops what it was doing and turns to whoever touched it. Whether it
    // waves, looks up, or was already facing you is a coin weighted by the
    // character; all of those are correct and none of them is walking.
    expect(await pose(page)).toMatch(/^(idle|wave|look):(front|left|right)$/)
  })

  test('somebody works, somebody sits, somebody looks about', async ({ page }) => {
    // Longer than the default: this one is about what the weights reach over
    // time, and there is no way to hurry a machine whose whole point is that
    // it does not rush.
    //
    // Asked of the room rather than of one dokkaebi. With five of them the
    // seats and the benches are shared, and one character reaching all five
    // states inside three minutes stopped being a fair contract the moment
    // somebody else could be sitting in the chair — NUNU sits 40% of the
    // time, and it only takes one long stint to keep MOMO standing.
    test.setTimeout(240_000)
    await enter(page)
    const seen = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll('[data-npc] img')] as HTMLImageElement[]
      const out = new Set<string>()
      const t0 = Date.now()
      while (Date.now() - t0 < 170000) {
        for (const img of imgs) {
          const m = /\/dokkaebi(?:-v2)?\/\w+\/(\w+)\//.exec(img.src)
          if (m) out.add(m[1]!)
        }
        await new Promise((r) => setTimeout(r, 150))
      }
      return [...out]
    })
    for (const action of ['idle', 'walk', 'work', 'sit', 'look']) {
      expect(seen, `nobody in the room ever ${action}`).toContain(action)
    }
  })

  test('it stands at the things it uses, not on them', async ({ page }) => {
    // Recorded rather than sampled.
    //
    // The spell at a thing is deliberately short — the first one on arriving
    // is a quarter of a normal one (src/scenes/npc.ts, `opening`), so for
    // MOMO it can be over inside two seconds. Any test that looks every so
    // often is racing that, and a longer window only makes the race rarer;
    // this one failed a quarter of the time at thirty seconds.
    //
    // So nothing here waits for a moment to look. A watcher installed before
    // the page runs writes down every state MOMO ever enters, with where its
    // feet were at that instant, and the assertion reads the record. A spell
    // one frame long is caught the same as a spell ten seconds long, and the
    // position belongs to the state rather than to whenever the next query
    // happened to land.
    await watchStates(page)
    await enter(page, '?npcseed=7')
    await page.waitForFunction(
      () => window.__npcStates?.some((s) => s.state === 'WORK' || s.state === 'INTERACT'),
      undefined, { timeout: 60_000 })
    const at = await page.evaluate(() =>
      window.__npcStates.find((s) => s.state === 'WORK' || s.state === 'INTERACT')!)
    // On the floor in front of it, never up on the furniture.
    expect(at.y).toBeGreaterThan(980)
    // Every place in the room that stands in front of something.
    const fronts = [1578, 2116, 2252, 2470, 2830, 2942, 3062, 3306]
    expect(Math.min(...fronts.map((f) => Math.abs(at.x - f)))).toBeLessThan(20)
  })

  test('somebody says something, and never two of them at once', async ({ page }) => {
    // Chatter is deliberately rare — the room is a workshop, not a chat
    // window — so this watches for a while and asserts the shape of it
    // rather than a count.
    test.setTimeout(180_000)
    await enter(page)
    const result = await page.evaluate(async () => {
      const bubbles = [...document.querySelectorAll('.npc__bubble')]
      const lines = new Set<string>()
      let mostAtOnce = 0
      const t0 = Date.now()
      while (Date.now() - t0 < 120000) {
        const up = bubbles.filter((b) => !(b as HTMLElement).hidden)
        mostAtOnce = Math.max(mostAtOnce, up.length)
        for (const b of up) lines.add(b.textContent ?? '')
        await new Promise((r) => setTimeout(r, 100))
      }
      return { said: [...lines], mostAtOnce }
    })
    expect(result.said.length, 'nobody said anything in two minutes').toBeGreaterThan(0)
    // The budget is two on a desktop. Three would be a comic strip.
    expect(result.mostAtOnce).toBeLessThanOrEqual(2)
    for (const line of result.said) expect(line.length).toBeLessThan(20)
  })

  test('it never takes a click from the visitor', async ({ page }) => {
    await enter(page)
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector('[data-npc]')!).pointerEvents),
    ).toBe('none')
    // Whatever is under it stays reachable: the point it stands on is floor,
    // and the things on the wall still open.
    await page.evaluate(() =>
      document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    )
    await expect(page.locator('[data-game]')).toHaveCount(5, { timeout: 6000 })
  })

  test('it stops choosing errands while something is open, and starts again after', async ({
    page,
  }) => {
    await enter(page, '?npcseed=7')
    await page.evaluate(() =>
      document.querySelector('.thing--tv')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    )
    await expect(page.locator('.tvset')).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(1500)
    const a = await feet(page)
    await page.waitForTimeout(6000)
    const b = await feet(page)
    // It may finish a step it had started, but it does not set off again.
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(60)

    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    // It picks up where it left off — which, found at the bench, is a job
    // of up to twelve seconds before it so much as looks for the next thing.
    let moved = 0
    let previous = await feet(page)
    for (let i = 0; i < 32 && moved <= 50; i++) {
      await page.waitForTimeout(1000)
      const now = await feet(page)
      moved += Math.hypot(now.x - previous.x, now.y - previous.y)
      previous = now
    }
    expect(moved).toBeGreaterThan(50)
  })

  test('it moves with the room when the camera does', async ({ page }) => {
    await enter(page)
    const world = await feet(page)
    const before = await page.evaluate(
      () => document.querySelector('[data-npc="momo"]')!.getBoundingClientRect().x,
    )
    await page.mouse.move(700, 500)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(700 - i * 40, 500)
    await page.mouse.up()
    await page.waitForTimeout(700)
    const after = await page.evaluate(
      () => document.querySelector('[data-npc="momo"]')!.getBoundingClientRect().x,
    )
    // Its place in the room did not change; its place on the screen did.
    const nowWorld = await feet(page)
    expect(Math.abs(nowWorld.x - world.x)).toBeLessThan(200)
    expect(Math.abs(after - before)).toBeGreaterThan(50)
  })

  test('leaving and coming back does not leave two of them', async ({ page }) => {
    await enter(page)
    const before = await whoIsHere(page)
    await page.goto('/games.html', { waitUntil: 'load' })
    await page.goBack()
    await page.waitForTimeout(500)
    await page.locator('[data-alley-enter]').click()
    await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
    await page.waitForTimeout(900)
    expect(await whoIsHere(page)).toEqual(before)
  })

  test('turning the phone does not clone them', async ({ page }) => {
    await enter(page)
    // Mounted, not on the floor: the ones off the edge are still the crew.
    const before = await whoIsMounted(page)
    expect(before.length).toBeGreaterThan(3)

    // Portrait is a smaller room — the upper half of the workshop, with a
    // wall below it — and fewer of them live in it. Fewer, never duplicated.
    await page.setViewportSize({ width: 900, height: 1200 })
    await page.waitForTimeout(900)
    const upstairs = await whoIsMounted(page)
    expect(upstairs.length).toBeLessThan(before.length)
    expect(new Set(upstairs).size).toBe(upstairs.length)
    expect(before).toEqual(expect.arrayContaining(upstairs))

    // And back again: the same crew, once each.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(900)
    expect(await whoIsMounted(page)).toEqual(before)
  })

  test('the debug overlay is off unless it is asked for', async ({ page }) => {
    await enter(page)
    await expect(page.locator('.npc__waypoint')).toHaveCount(0)
    await expect(page.locator('.npc__debug')).toHaveCount(0)
    await enter(page, '?npc=debug')
    await expect(page.locator('.npc__waypoint').first()).toBeAttached()
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('they are on the floor of the room they are in, and the room moves', async ({ page }) => {
    await enter(page, '?npcseed=7')
    const here = await whoIsHere(page)
    expect(here.length).toBeGreaterThan(0)
    for (const id of here) {
      const where = await feet(page, `[data-npc="${id}"]`)
      expect(where.y, id).toBeGreaterThan(1570)
      expect(where.y, id).toBeLessThan(1670)
    }
    // Asked of the room, not of one of them. The portrait floor is 620 world
    // units end to end — a full traverse takes six seconds — and only two may
    // walk at once, so any one dokkaebi can honestly spend twenty seconds
    // standing still, and the room as a whole covers a few hundred units in
    // half a minute. This is a floor under "somebody moved", not a target.
    //
    // Polled, not summed over a fixed number of ticks: the first errand is
    // guaranteed inside twenty seconds (src/scenes/npc.ts, `opening` and
    // `owesErrand`), and a fixed window one flake wide of that guarantee is
    // how this failed under load.
    let travelled = 0
    let previous = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
    await expect.poll(async () => {
      const now = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
      for (let k = 0; k < now.length; k++) {
        travelled += Math.hypot(now[k]!.x - previous[k]!.x, now[k]!.y - previous[k]!.y)
      }
      previous = now
      return travelled
    }, { timeout: 45_000, intervals: [400] }).toBeGreaterThan(180)
  })
})

test('a visitor who does not want motion gets somebody standing still', async ({ browser }) => {
  // An empty room is not the same courtesy as a quiet one: the dokkaebi is
  // there, and simply does not pace or breathe.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await enter(page)
  await expect(page.locator(NPC).first()).toBeAttached()
  const settled = await page.evaluate(async () => {
    const el = document.querySelector('[data-npc="momo"]') as HTMLElement
    const img = el.querySelector('img') as HTMLImageElement
    const frames = new Set<string>()
    const places = new Set<string>()
    const t0 = Date.now()
    while (Date.now() - t0 < 4000) {
      frames.add(img.getAttribute('src') ?? '')
      places.add(el.style.transform)
      await new Promise((r) => setTimeout(r, 100))
    }
    return { frames: frames.size, places: places.size }
  })
  expect(settled.frames).toBe(1)
  expect(settled.places).toBe(1)
  // And the room is otherwise complete.
  await expect(page.locator('.thing')).toHaveCount(12)
  await context.close()
})
