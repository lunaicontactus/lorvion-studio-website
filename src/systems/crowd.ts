/**
 * The five of them, considered together.
 *
 * One dokkaebi needs no coordinator. Five do, and not for the reasons that
 * sound most technical. The problems that actually spoil a room are:
 *
 *   - two of them standing in the same square foot, reading as one animal
 *     with too many legs;
 *   - two of them at the fridge door at once, which no room does;
 *   - all five walking at the same time, which is not a workshop, it is a
 *     parade — and the single loudest way to make the room look fake;
 *   - nobody ever noticing anybody else, which is five separate screensavers
 *     sharing a background.
 *
 * So this owns four small things: who is standing where (spacing), who has
 * booked what (occupancy), how many may walk at once (budget), and how often
 * two of them are allowed to acknowledge each other (social). Everything else
 * — what to do next, how to feel about it — stays in the individual, where
 * personality lives.
 *
 * Nothing here searches or plans. Five members is small enough that the
 * honest implementation is a loop over all of them, and pretending otherwise
 * would be a spatial index nobody can debug guarding a list of five.
 */

/** What the crowd needs from one of its members. */
export interface CrowdMember {
  readonly id: string
  /** World position of the feet. */
  readonly at: { x: number; y: number }
  /** True when it is mid-errand and should not be pulled into a conversation. */
  readonly busy: boolean
  /**
   * How much room it takes up, as a fraction of the usual personal space.
   *
   * A dokkaebi sitting on the rug takes less than one standing: standing
   * beside somebody who is sitting is what people do, and holding a full body
   * width away from them turns a companionable picture into two strangers
   * avoiding each other. It is emphatically not zero, which is what this was
   * first — and then YOMI walked straight through POKO on the rug, because
   * something that takes up no room is something you can occupy.
   */
  readonly radius: number
  /** How readily it engages, 0 to 1. */
  readonly social: number
  /** Turn to `other`, say hello, then carry on. */
  greet(other: CrowdMember): void
}

/**
 * How close two of them may stand before one gives way, in world units. A
 * dokkaebi is about 130 units across the shoulders at the room's scale, so
 * this is a little over one body width: close enough to look like company,
 * far enough that the silhouettes stay separate.
 */
const PERSONAL = 96
/** Below this they are properly overlapping and the push is at full strength. */
const PRESSING = 48
/**
 * How many may be walking at once.
 *
 * Two. Not a performance limit — five sprites cost nothing — but a looking
 * limit. With three or more in transit the room reads as a corridor, and the
 * eye has nowhere to rest. The rest of the crew are still doing things; they
 * are just doing them where they stand.
 */
const WALKERS = 2
/** Near enough to say hello. */
const GREET_RADIUS = 240
/** How often the crowd looks for a meeting worth having. */
const SOCIAL_EVERY = 1500
/** Nothing between the same two for a good while after they have spoken. */
const PAIR_COOLDOWN = 90_000
/** And nothing at all for a while after any greeting: this is seasoning. */
const SOCIAL_GAP = 30_000
/** Long enough after arrival that the room is not a welcome party. */
const SOCIAL_NOT_BEFORE = 20_000

/** How many bubbles may be on screen. One on a phone: two is a comic strip. */
const BUBBLES = { desktop: 2, mobile: 1 }
const BUBBLE_GAP = 5000
const BUBBLE_COOLDOWN = 24_000

interface Booking {
  readonly by: string
  until: number
}

export class Crowd {
  private readonly members = new Map<string, CrowdMember>()
  private readonly bookings = new Map<string, Booking>()
  private readonly walking = new Set<string>()
  private readonly pairSpoke = new Map<string, number>()
  private readonly saidAt = new Map<string, number>()
  private speaking = new Set<string>()
  // Never, rather than zero. Zero means "one just happened at start-up", so
  // the first greeting of a session would have waited out SOCIAL_GAP on top
  // of SOCIAL_NOT_BEFORE — a minute of the crew pointedly ignoring each other.
  private lastSocial = -Infinity
  private lastBubble = 0
  private sinceSocial = 0
  private clock = 0
  private readonly random: () => number
  private readonly bubbleBudget: number

  constructor(opts: { random?: () => number; narrow?: boolean } = {}) {
    this.random = opts.random ?? Math.random
    this.bubbleBudget = opts.narrow ? BUBBLES.mobile : BUBBLES.desktop
  }

  join(m: CrowdMember): void {
    this.members.set(m.id, m)
  }

  leave(id: string): void {
    this.members.delete(id)
    this.walking.delete(id)
    this.speaking.delete(id)
    for (const [slot, b] of this.bookings) if (b.by === id) this.bookings.delete(slot)
  }

  get size(): number {
    return this.members.size
  }

  // ── Occupancy ────────────────────────────────────────────────────────────
  /**
   * Book a standing place. Two dokkaebi in the fridge door is the single
   * clearest way to break the illusion, and it is also the easiest to prevent.
   *
   * Bookings expire. A dokkaebi that is interrupted on the way — the visitor
   * opens the thing it was walking to, the tab is hidden for ten minutes —
   * would otherwise hold a slot nobody can use for the rest of the session.
   */
  claim(slot: string, by: string, ms = 45_000): boolean {
    const held = this.bookings.get(slot)
    if (held && held.by !== by && held.until > this.clock) return false
    this.bookings.set(slot, { by, until: this.clock + ms })
    return true
  }

  release(slot: string, by: string): void {
    if (this.bookings.get(slot)?.by === by) this.bookings.delete(slot)
  }

  /** Who has this place booked, if anyone. */
  holder(slot: string): string | null {
    const held = this.bookings.get(slot)
    return held && held.until > this.clock ? held.by : null
  }

  free(slot: string, forWhom: string): boolean {
    const by = this.holder(slot)
    return by === null || by === forWhom
  }

  // ── Activity budget ──────────────────────────────────────────────────────
  /** May this one set off? Already walking counts as yes. */
  mayWalk(id: string): boolean {
    return this.walking.has(id) || this.walking.size < WALKERS
  }

  startWalk(id: string): void {
    this.walking.add(id)
  }

  endWalk(id: string): void {
    this.walking.delete(id)
  }

  get walkers(): number {
    return this.walking.size
  }

  /**
   * How much is going on, as an attention floor for the room's own ambience.
   *
   * With one dokkaebi this was simply "is it walking". With five, somebody is
   * nearly always walking, and treating that as a reason to hold the room
   * still would mean the lamp never flickers and no star ever twinkles again.
   *
   * So the bar is what is worth watching rather than what is moving: a
   * conversation or a bubble beats ambience outright, two of them in transit
   * is enough to hold off the background but not the object glows, and one
   * dokkaebi crossing the floor is just Tuesday.
   */
  attention(levels: { crew: number; object: number }): number {
    if (this.speaking.size > 0) return levels.crew
    if (this.walking.size >= 2) return levels.object
    return 0
  }

  // ── Spacing ──────────────────────────────────────────────────────────────
  /**
   * Which way to lean to stop standing in somebody. A push, not a wall: a
   * dokkaebi that cannot pass another one deadlocks in a doorway, and a room
   * where two of them shuffle apart and carry on is both easier to write and
   * closer to what people do.
   *
   * Returns a unit-ish vector and a speed multiplier. Zero when there is
   * nobody near, which is most of the time.
   */
  separation(id: string, x: number, y: number): { x: number; y: number; slow: number } {
    let px = 0
    let py = 0
    let closest = Infinity
    for (const [other, m] of this.members) {
      if (other === id) continue
      const dx = x - m.at.x
      // The floor is a strip: two dokkaebi a hundred units apart in depth are
      // visually one behind the other, not side by side, so depth counts for
      // more than distance along the boards.
      const dy = (y - m.at.y) * 2.2
      const d = Math.hypot(dx, dy)
      const space = PERSONAL * m.radius
      if (d >= space) continue
      closest = Math.min(closest, d / Math.max(m.radius, 0.01))
      // Straight apart, hardest when they are closest. A perpendicular
      // component would be smoother, and would also make them orbit.
      const push = (space - d) / space
      const n = Math.max(d, 1)
      px += (dx / n) * push
      py += (dy / n) * push * 0.4
    }
    if (px === 0 && py === 0) return { x: 0, y: 0, slow: 1 }
    const len = Math.hypot(px, py) || 1
    // Slow to a shuffle when properly on top of each other, so the separation
    // has time to work before either of them has walked through the other.
    const slow = closest < PRESSING ? 0.45 : 0.8
    return { x: px / len, y: py / len, slow }
  }

  // ── Talking ──────────────────────────────────────────────────────────────
  /**
   * Whether this one may put a bubble up. Budgeted globally, because the
   * failure mode is not one character talking too much — it is the room
   * turning into a chat window.
   */
  maySpeak(id: string): boolean {
    if (this.speaking.size >= this.bubbleBudget) return false
    if (this.clock - this.lastBubble < BUBBLE_GAP) return false
    return this.clock - (this.saidAt.get(id) ?? -Infinity) >= BUBBLE_COOLDOWN
  }

  startSpeaking(id: string): void {
    this.speaking.add(id)
    this.saidAt.set(id, this.clock)
    this.lastBubble = this.clock
  }

  stopSpeaking(id: string): void {
    this.speaking.delete(id)
  }

  // ── Social ───────────────────────────────────────────────────────────────
  step(dt: number): void {
    this.clock += dt
    this.sinceSocial += dt
    if (this.clock < SOCIAL_NOT_BEFORE) return
    if (this.sinceSocial < SOCIAL_EVERY) return
    this.sinceSocial = 0
    if (this.clock - this.lastSocial < SOCIAL_GAP) return

    const free = [...this.members.values()].filter((m) => !m.busy)
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i]!
        const b = free[j]!
        if (Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y) > GREET_RADIUS) continue
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
        if (this.clock - (this.pairSpoke.get(key) ?? -Infinity) < PAIR_COOLDOWN) continue
        // Both have to be willing. Two quiet ones passing each other in a
        // corridor mostly say nothing, and that is correct.
        if (this.random() > a.social * b.social) continue
        this.pairSpoke.set(key, this.clock)
        this.lastSocial = this.clock
        a.greet(b)
        b.greet(a)
        return
      }
    }
  }
}
