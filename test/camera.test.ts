import { describe, expect, it } from 'vitest'
import { Camera } from '@/systems/camera'

const bounds = { worldWidth: 3600, worldHeight: 1200, viewWidth: 1920, viewHeight: 1200 }

describe('camera', () => {
  it('never looks past the walls', () => {
    const c = new Camera()
    c.resize(bounds)
    c.snapTo(-9999, -9999)
    expect(c.x).toBe(960) // half a view in from the left wall
    expect(c.viewX).toBe(0)
    c.snapTo(9999, 9999)
    expect(c.x).toBe(2640)
    expect(c.viewX + bounds.viewWidth).toBe(3600)
  })

  it('centres an axis the world cannot fill', () => {
    const c = new Camera()
    // The view is taller than the world here, so there is nothing to pan to.
    c.resize({ ...bounds, viewHeight: 2000 })
    c.snapTo(1800, 0)
    expect(c.y).toBe(600)
  })

  it('eases toward the target and arrives', () => {
    const c = new Camera(0.2)
    c.resize(bounds)
    c.snapTo(1000, 600)
    c.moveTo(2000, 600)
    const first = c.x
    c.update(16.667)
    expect(c.x).toBeGreaterThan(first)
    expect(c.x).toBeLessThan(2000)
    for (let i = 0; i < 400; i++) c.update(16.667)
    expect(c.x).toBeCloseTo(2000, 5)
    expect(c.update(16.667)).toBe(false) // settled: nothing left to redraw
  })

  it('steps the same distance whatever the frame rate', () => {
    const a = new Camera(0.2)
    const b = new Camera(0.2)
    a.resize(bounds)
    b.resize(bounds)
    a.snapTo(1000, 600)
    b.snapTo(1000, 600)
    a.moveTo(2000, 600)
    b.moveTo(2000, 600)
    a.update(33.334) // one frame at 30fps
    b.update(16.667) // two at 60
    b.update(16.667)
    expect(a.x).toBeCloseTo(b.x, 1)
  })

  it('converts between world and screen consistently', () => {
    const c = new Camera()
    c.resize(bounds)
    c.snapTo(1800, 600)
    const s = c.toScreen(2000, 700)
    expect(s).toEqual({ x: 2000 - c.viewX, y: 700 - c.viewY })
    const w = c.toWorld(s.x, s.y)
    expect(w.x).toBeCloseTo(2000, 6)
    expect(w.y).toBeCloseTo(700, 6)
  })

  it('clamps a move made before the first resize', () => {
    const c = new Camera()
    c.moveBy(500, 500) // no bounds yet; must not throw or run away
    c.resize(bounds)
    expect(c.x).toBeGreaterThanOrEqual(960)
    expect(c.x).toBeLessThanOrEqual(2640)
  })
})
