/**
 * Who is in the room, and who is out.
 *
 * Five dokkaebi all on the boards at once is a shelf of dolls, however well
 * they move. A workshop has people in it and people out of it: somebody has
 * gone to get something, somebody has not come in yet. So the room keeps a
 * cast of two or three on the floor and the rest off the edge of the plate,
 * and every half minute or so one of them leaves and, a little later, one
 * comes back — not the same one.
 *
 * This decides who and when. Walking off and walking on is the dokkaebi's
 * own business (src/scenes/npc.ts); this only asks, and only asks somebody
 * who is standing about. Nobody is pulled off a job to make the numbers.
 */
import type { NpcHandle } from '@/scenes/npc'

/** Between one departure and the next. */
const LEAVE_EVERY = { min: 24_000, max: 50_000 }
/** How long the room is one short before somebody comes back. */
const RETURN_AFTER = { min: 8_000, max: 16_000 }
/** Nobody leaves in the first stretch: the visitor has only just arrived. */
const NOT_BEFORE = 12_000

export class Stage {
  #crew: readonly NpcHandle[]
  #present: number
  #random: () => number
  #clock = 0
  #leaveAt: number
  #returnAt = 0

  constructor(crew: readonly NpcHandle[], opts: { present: number; random?: () => number }) {
    this.#crew = crew
    this.#present = Math.max(1, Math.min(opts.present, crew.length))
    this.#random = opts.random ?? Math.random
    this.#leaveAt = NOT_BEFORE + this.#between(LEAVE_EVERY)
  }

  #between(r: { min: number; max: number }): number {
    return r.min + this.#random() * (r.max - r.min)
  }

  /** How many are on the floor right now. */
  get present(): number {
    return this.#crew.filter((c) => !c.away).length
  }

  step(dt: number): void {
    this.#clock += dt
    const here = this.#crew.filter((c) => !c.away)
    const away = this.#crew.filter((c) => c.away)

    // Somebody due back.
    if (here.length < this.#present && away.length > 0 && this.#clock >= this.#returnAt) {
      const who = away[Math.floor(this.#random() * away.length)]!
      if (who.comeBack()) this.#returnAt = this.#clock + this.#between(RETURN_AFTER)
      return
    }
    // Somebody due out. Only somebody standing about: the one at the bench
    // stays at the bench.
    if (here.length >= this.#present && this.#clock >= this.#leaveAt) {
      const idle = here.filter((c) => c.state === 'IDLE' || c.state === 'LOOK' || c.state === 'CHOOSE_TARGET')
      const who = idle[Math.floor(this.#random() * idle.length)]
      if (who?.leave()) {
        this.#leaveAt = this.#clock + this.#between(LEAVE_EVERY)
        this.#returnAt = this.#clock + this.#between(RETURN_AFTER)
      } else {
        // Nobody free just now; ask again shortly.
        this.#leaveAt = this.#clock + 2500
      }
    }
  }
}
