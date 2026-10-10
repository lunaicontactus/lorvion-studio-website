import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

/**
 * PHASE I, I-10: nothing on the site is set under 10 px. The audit found
 * labels at 5.6-9.9 px, nearly all of them sizes that scale with the cut-out
 * (`cqi`) or the parent (`em`) with no floor. A size that can fall below 10 px
 * has to say so with a floor: `max(10px, …)` or `clamp(10px, …)`.
 *
 * This reads the stylesheets, so it is a guard against a new declaration, not
 * a measurement; e2e/touch-i.spec.ts measures what is actually drawn.
 */
const DIR = 'src/styles'
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.css'))

/** Every font size declared, with where it is. */
function sizes(): { where: string; value: string }[] {
  const out: { where: string; value: string }[] = []
  for (const f of FILES) {
    readFileSync(`${DIR}/${f}`, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/(?:font-size:|font:\s*(?:\d{3}\s+)?)([^;/}]+)/g)) out.push({ where: `${f}:${i + 1}`, value: m[1]!.trim() })
    })
  }
  return out
}

describe('the 10 px floor', () => {
  it('finds the declarations it is meant to check', () => {
    expect(sizes().length).toBeGreaterThan(200)
  })

  it('no clamp() starts under 10 px', () => {
    const low = sizes().filter((s) => /clamp\((\d+(?:\.\d+)?)px/.test(s.value) && Number(/clamp\((\d+(?:\.\d+)?)px/.exec(s.value)![1]) < 10)
    expect(low).toEqual([])
  })

  it('no fixed size is under 10 px, and no scaling size goes there without a floor', () => {
    const low = sizes().filter(({ where, value }) => {
      if (/^(clamp|max)\(/.test(value)) return false
      const m = /^(\d*\.?\d+)(px|rem|cqi|em)\b/.exec(value)
      if (!m) return false
      const n = Number(m[1])
      // Scaling with the cut-out: under 4 cqi is under 10 px on a phone.
      if (m[2] === 'cqi') return n < 4
      if (m[2] === 'rem') return n < 0.625
      if (m[2] === 'px') return n < 10
      // em under .8 of the furniture's own small type (props.css) is under 10 px.
      return where.startsWith('props.css') && n < 0.8
    })
    expect(low).toEqual([])
  })
})
