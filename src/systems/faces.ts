/**
 * Somebody is always looking at you.
 *
 * The room is honest about where its furniture is: everything worth using is
 * against the back wall, so the truthful thing for a dokkaebi at the bench to
 * do is turn its back on the camera. Three of them doing that at once is a
 * truthful room and a picture of nothing — three fur balls, no faces, and a
 * visitor who has no idea anybody lives here.
 *
 * This does not make them all face the camera. That is the other failure: a
 * row of theme-park mascots who stare at you whatever they are supposed to be
 * doing. It only holds a floor. At least one face on screen, always; two for
 * the first few seconds, because the first impression is the whole job.
 *
 * Who turns is decided by who can: never somebody mid-stride, mid-greeting or
 * mid-reaction, because a figure that snaps round in the middle of those looks
 * worse than the back of a head did.
 */
export interface FaceMember {
  readonly id: string
  /** Whether the visitor can see its face from where the camera is. */
  readonly faceShown: boolean
  /** Whether asking it to turn round now would interrupt something. */
  readonly mayTurn: boolean
  turnToCamera(ms?: number): void
}

export interface FacesOptions {
  /**
   * How many faces the room settles at. One, because the point is to forbid
   * the empty picture and not to stage a photograph: a second face should
   * happen because somebody wandered into one, not because it was ordered.
   */
  readonly want?: number
  /** How often to look, in milliseconds. Not every frame: this is a floor. */
  readonly every?: number
  /** How long a face turned by this holds it for. */
  readonly hold?: number
}

export class Faces {
  readonly #crew: readonly FaceMember[]
  readonly #want: number
  readonly #every: number
  readonly #hold: number
  #due = 0

  constructor(crew: readonly FaceMember[], opts: FacesOptions = {}) {
    this.#crew = crew
    this.#want = opts.want ?? 1
    this.#every = opts.every ?? 400
    this.#hold = opts.hold ?? 1200
  }

  /** How many faces are on screen right now. */
  get shown(): number {
    return this.#crew.filter((c) => c.faceShown).length
  }

  /**
   * Bring the count up to `want` now. Used where a moment matters rather than
   * where time passes: the visitor walking in, and a panel closing in front of
   * a room they are about to look at again.
   */
  ensure(want = this.#want): number {
    let short = want - this.shown
    if (short <= 0) return 0
    let turned = 0
    for (const one of this.#crew) {
      if (short <= 0) break
      if (one.faceShown || !one.mayTurn) continue
      one.turnToCamera(this.#hold)
      // Asking is not the same as getting: a member may refuse for reasons
      // of its own, and counting the ask would leave the room a face short.
      if (!one.faceShown) continue
      turned += 1
      short -= 1
    }
    return turned
  }

  step(dt: number): void {
    this.#due -= dt
    if (this.#due > 0) return
    this.#due = this.#every
    this.ensure()
  }
}
