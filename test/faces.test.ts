import { describe, it, expect } from 'vitest'
import { Faces } from '@/systems/faces'
import type { FaceMember } from '@/systems/faces'

/**
 * The floor under the picture: never a moment with nobody's face in it.
 *
 * The room's furniture is all against the back wall, so a crew that is
 * honestly using it is a crew with its back to the camera, and `Faces` is the
 * one thing standing between that and a picture of three furry backs.
 *
 * What is modelled here is a member that turns when asked and then turns back
 * on its own clock when the turn runs out — which is what the real one does,
 * and which is the whole difficulty: the turning back is not an event the room
 * hears about.
 */
function member(id: string, opts: { mayTurn?: boolean; refuses?: boolean } = {}): FaceMember & {
  /** Time passing. The turn granted by a `turnToCamera` runs out on its own. */
  lapse: (dt: number) => void
  turns: number
} {
  let hold = 0
  let turns = 0
  return {
    id,
    get faceShown(): boolean {
      return hold > 0
    },
    get mayTurn(): boolean {
      return opts.mayTurn ?? true
    },
    turnToCamera(ms = 1100): void {
      turns += 1
      if (opts.refuses) return
      hold = Math.max(hold, ms)
    },
    lapse(dt: number): void {
      hold = Math.max(0, hold - dt)
    },
    get turns(): number {
      return turns
    },
  }
}

describe('Faces', () => {
  it('turns somebody when the picture would otherwise be all backs', () => {
    const crew = [member('a'), member('b')]
    const faces = new Faces(crew)
    expect(faces.shown).toBe(0)
    expect(faces.ensure()).toBe(1)
    expect(faces.shown).toBe(1)
  })

  it('asks for a second face when a second is asked for, and no more', () => {
    const crew = [member('a'), member('b'), member('c')]
    const faces = new Faces(crew)
    expect(faces.ensure(2)).toBe(2)
    expect(faces.shown).toBe(2)
    expect(crew[2]!.turns).toBe(0)
  })

  it('leaves alone anybody who is in the middle of something', () => {
    const crew = [member('a', { mayTurn: false }), member('b')]
    const faces = new Faces(crew)
    faces.ensure()
    expect(crew[0]!.turns).toBe(0)
    expect(crew[1]!.faceShown).toBe(true)
  })

  it('counts what it got, not what it asked for', () => {
    // A member may refuse for reasons of its own. Counting the ask would
    // leave the room a face short and the floor believing it was met.
    const crew = [member('a', { refuses: true }), member('b')]
    const faces = new Faces(crew)
    expect(faces.ensure()).toBe(1)
    expect(faces.shown).toBe(1)
    expect(crew[0]!.turns).toBe(1)
    expect(crew[1]!.faceShown).toBe(true)
  })

  /**
   * The regression this file exists for.
   *
   * A turn lasts a fixed time and then lapses, and the room only looks every
   * `every` milliseconds — so between the lapse and the next look there was a
   * stretch of up to `every` with the picture entirely backs. It recurred
   * once per hold, about once a second, and it is what a frame-by-frame look
   * at a phone-landscape room caught: three at back-facing benches, no face,
   * fifty milliseconds at a time.
   */
  it('never lets the last face lapse between two looks', () => {
    const crew = [member('a'), member('b'), member('c')]
    const faces = new Faces(crew, { hold: 1200 })
    faces.ensure()
    let worst = Infinity
    // Ten seconds of frames, which is eight times round the hold.
    for (let t = 0; t < 10_000; t += 16) {
      for (const one of crew) one.lapse(16)
      faces.step(16)
      worst = Math.min(worst, faces.shown)
    }
    expect(worst, 'the picture was briefly all backs').toBeGreaterThanOrEqual(1)
  })

  it('covers a face that goes away of its own accord, on the frame it goes', () => {
    // The other half of the same hole, and the one a hundred-and-fifty
    // millisecond check could not close: the face that leaves is not one the
    // room asked for and not one it is holding. Somebody greeted the visitor,
    // the greeting ended, and nothing was watching on that frame.
    const crew = [member('a'), member('b')]
    const faces = new Faces(crew, { hold: 1200 })
    let worst = Infinity
    // Turned round on its own, for its own reasons, and then not.
    crew[0]!.turnToCamera(900)
    for (let t = 0; t < 5000; t += 16) {
      for (const one of crew) one.lapse(16)
      faces.step(16)
      worst = Math.min(worst, faces.shown)
    }
    expect(worst, 'the picture was all backs the frame a greeting ended')
      .toBeGreaterThanOrEqual(1)
  })

  it('lets go the moment the room has faces to spare', () => {
    // The floor is a floor, not a hand on the back of the head: once
    // somebody else is looking at the room of their own accord, the one the
    // room was leaning on is free to go back to whatever it was doing.
    const crew = [member('a'), member('b')]
    const faces = new Faces(crew, { hold: 1200 })
    faces.ensure()
    expect(crew[0]!.faceShown).toBe(true)
    const asked = crew[0]!.turns
    // Somebody else turns round without being told.
    crew[1]!.turnToCamera(5000)
    // Past the hold it was granted, so if it were still being renewed it
    // would still be facing.
    for (let t = 0; t < 1600; t += 16) {
      for (const one of crew) one.lapse(16)
      faces.step(16)
    }
    expect(crew[0]!.turns, 'still being held front with a face to spare').toBe(asked)
    expect(crew[0]!.faceShown).toBe(false)
  })
})
