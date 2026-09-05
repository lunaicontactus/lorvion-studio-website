import { describe, expect, it } from 'vitest'
import { CHARACTERS, MAX_ACTIVE_CHARACTERS, getCharacter } from '@/data/characters'
import { PROJECTS, VISIBLE_PROJECTS, getProject } from '@/data/projects'
import { GARAGE_OBJECTS, MAIN_MENU_OBJECTS } from '@/data/garageObjects'
import { EASTER_EGGS } from '@/data/easterEggs'
import { ALLEY_LAYERS, ALLEY_CRITICAL } from '@/data/alley'

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

describe('alley layers', () => {
  it('has unique ids', () => {
    expect(new Set(ALLEY_LAYERS.map((l) => l.id)).size).toBe(ALLEY_LAYERS.length)
  })

  it('gives each orientation its own base', () => {
    const bases = ALLEY_LAYERS.filter((l) => l.id.startsWith('base-'))
    expect(bases.map((b) => b.only).sort()).toEqual(['landscape', 'portrait'])
  })

  it('shares every layer above the base between orientations', () => {
    // Two bases is the price of a real portrait composition; a second set of
    // props would not be.
    for (const l of ALLEY_LAYERS.filter((x) => !x.id.startsWith('base-'))) {
      expect(l.only).toBeUndefined()
    }
  })

  it('keeps decorative layers out of the accessibility tree', () => {
    for (const l of ALLEY_LAYERS) expect(l.alt).toBe('')
  })

  it('points every layer at a webp under the alley folder', () => {
    for (const l of ALLEY_LAYERS) {
      expect(l.src).toMatch(/^\/assets\/images\/alley\/[a-z_]+\.webp$/)
    }
  })

  it('names the files the entrance cannot open without', () => {
    for (const id of ALLEY_CRITICAL) {
      expect(ALLEY_LAYERS.some((l) => l.id === id)).toBe(true)
    }
  })
})
