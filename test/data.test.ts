import { describe, expect, it } from 'vitest'
import { CHARACTERS, MAX_ACTIVE_CHARACTERS, getCharacter } from '@/data/characters'
import { PROJECTS, VISIBLE_PROJECTS, getProject } from '@/data/projects'
import { GARAGE_OBJECTS, MAIN_MENU_OBJECTS } from '@/data/garageObjects'
import { EASTER_EGGS } from '@/data/easterEggs'
import { ALLEY_LANDSCAPE, ALLEY_PORTRAIT, ALLEY_ART, PROP_NAMES } from '@/data/alley'

describe('DOKKA CREW data', () => {
  it('has the five approved characters, uniquely identified', () => {
    expect(CHARACTERS).toHaveLength(5)
    const ids = CHARACTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(5)
    expect(ids).toEqual(expect.arrayContaining(['momo', 'ruki', 'yomi', 'poko', 'nunu']))
  })

  it('gives every character a distinct behaviour profile', () => {
    // If two characters shared speed and idle bias they would read as the same
    // random walker, which is exactly what the brief forbids.
    const profiles = CHARACTERS.map((c) => `${c.speed}:${c.idleBias}`)
    expect(new Set(profiles).size).toBe(5)
  })

  it('keeps every field within a sane range', () => {
    for (const c of CHARACTERS) {
      expect(c.idleBias).toBeGreaterThanOrEqual(0)
      expect(c.idleBias).toBeLessThanOrEqual(1)
      expect(c.speed).toBeGreaterThan(0)
      expect(c.preferredZones.length).toBeGreaterThan(0)
      expect(c.clickReactions.length).toBeGreaterThan(0)
      expect(Object.keys(c.activityWeights).length).toBeGreaterThan(0)
      expect(c.accent).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('keeps the room readable', () => {
    expect(MAX_ACTIVE_CHARACTERS).toBeLessThan(CHARACTERS.length)
  })

  it('looks up by id', () => {
    expect(getCharacter('nunu')?.nameKo).toBe('누누')
    expect(getCharacter('nobody')).toBeUndefined()
  })
})

describe('project data', () => {
  it('has unique ids', () => {
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length)
  })

  it('keeps RUBATO listed but without stand-in art', () => {
    const rubato = getProject('rubato')
    expect(rubato).toBeDefined()
    expect(rubato?.keyArt).toBeNull()
    expect(rubato?.status).toBe('comingSoon')
    expect(VISIBLE_PROJECTS.map((p) => p.id)).not.toContain('rubato')
  })

  it('gives every showable project real art', () => {
    for (const p of VISIBLE_PROJECTS) {
      expect(p.keyArt).toMatch(/^\/assets\/images\/.+\.(webp|png|jpg)$/)
    }
  })
})

describe('interactive objects', () => {
  it('has unique ids', () => {
    expect(new Set(GARAGE_OBJECTS.map((o) => o.id)).size).toBe(GARAGE_OBJECTS.length)
  })

  it('always offers a plain menu route to the core sections', () => {
    // Spatial navigation is a bonus, never the only way in.
    expect(MAIN_MENU_OBJECTS.length).toBeGreaterThanOrEqual(4)
    for (const o of MAIN_MENU_OBJECTS) expect(o.label).not.toBe('')
  })

  it('locks the secret door behind all three mini-games', () => {
    const door = GARAGE_OBJECTS.find((o) => o.id === 'locked-door')
    expect(door?.action).toEqual({ kind: 'locked', requires: 3 })
  })
})

describe('easter eggs', () => {
  it('has unique ids and non-negative cooldowns', () => {
    expect(new Set(EASTER_EGGS.map((e) => e.id)).size).toBe(EASTER_EGGS.length)
    for (const e of EASTER_EGGS) expect(e.cooldownMs).toBeGreaterThanOrEqual(0)
  })

  it('gives every repeatable egg a real cooldown', () => {
    for (const e of EASTER_EGGS) {
      if (!e.onceOnly) expect(e.cooldownMs).toBeGreaterThan(0)
    }
  })
})

describe('alley plates', () => {
  const plates = [ALLEY_LANDSCAPE, ALLEY_PORTRAIT]

  const layersOf = (p: typeof ALLEY_LANDSCAPE) => [p.shutter, p.sign, ...PROP_NAMES.map((n) => p.props[n])]

  it('keeps every layer inside its plate', () => {
    for (const p of plates) {
      for (const l of layersOf(p)) {
        expect(l.left).toBeGreaterThanOrEqual(0)
        expect(l.left + l.width).toBeLessThanOrEqual(100)
      }
    }
  })

  it('anchors each layer exactly once', () => {
    for (const p of plates) {
      for (const l of layersOf(p)) {
        expect((l.top === undefined) !== (l.bottom === undefined)).toBe(true)
      }
    }
  })

  it('covers the painted doorway with the shutter', () => {
    // The doorway read off the artwork. At rest the shutter must overlap it on
    // every side, top and bottom included, or the opening shows through.
    const art = ALLEY_ART.shutter
    const doorway = [
      { plate: ALLEY_LANDSCAPE, left: 40.1, right: 59.8, top: 20.7, bottom: 69.6 },
      { plate: ALLEY_PORTRAIT, left: 33, right: 67, top: 36, bottom: 68.5 },
    ]
    for (const d of doorway) {
      const s = d.plate.shutter
      expect(s.left).toBeLessThanOrEqual(d.left)
      expect(s.left + s.width).toBeGreaterThanOrEqual(d.right)
      // Height follows the art's own ratio, expressed against the plate.
      const plateRatio = d.plate.base.w / d.plate.base.h
      const heightPct = ((s.width / 100) * (art.h / art.w) * plateRatio) * 100
      expect(s.top ?? 0).toBeLessThanOrEqual(d.top)
      expect((s.top ?? 0) + heightPct).toBeGreaterThanOrEqual(d.bottom)
    }
  })

  it('keeps the roll housing a plausible slice of the shutter', () => {
    expect(ALLEY_ART.shutter.drum).toBeGreaterThan(0.1)
    expect(ALLEY_ART.shutter.drum).toBeLessThan(0.3)
  })

  it('never lines the props up in a row', () => {
    // Four things at the same height with even gaps read as a toolbar, which
    // invites clicks they cannot yet take.
    for (const p of plates) {
      const bottoms = new Set(PROP_NAMES.map((n) => p.props[n].bottom))
      expect(bottoms.size).toBeGreaterThan(2)
    }
  })

  it('keeps the props off the doorway', () => {
    const doorway = [
      { plate: ALLEY_LANDSCAPE, left: 40.1, right: 59.8 },
      { plate: ALLEY_PORTRAIT, left: 33, right: 67 },
    ]
    for (const d of doorway) {
      for (const n of PROP_NAMES) {
        const l = d.plate.props[n]
        expect(l.left + l.width <= d.left || l.left >= d.right).toBe(true)
      }
    }
  })

  it('points every file at a webp under the alley folder', () => {
    const srcs = [...plates.map((p) => p.base.src), ...Object.values(ALLEY_ART).map((a) => a.src)]
    for (const src of srcs) expect(src).toMatch(/^\/assets\/images\/alley\/[a-z_]+\.webp$/)
  })

  it('gives each orientation its own base', () => {
    expect(ALLEY_LANDSCAPE.base.src).not.toBe(ALLEY_PORTRAIT.base.src)
    expect(ALLEY_LANDSCAPE.base.w).toBeGreaterThan(ALLEY_LANDSCAPE.base.h)
    expect(ALLEY_PORTRAIT.base.h).toBeGreaterThan(ALLEY_PORTRAIT.base.w)
  })
})
