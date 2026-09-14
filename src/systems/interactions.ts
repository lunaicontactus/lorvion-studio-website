/**
 * The crew as people who share a room, rather than five random walkers.
 *
 * Everything here is a *scene*: somebody looks up from the bench because
 * somebody else came over, one of them wanders to the fridge and another
 * watches from behind, the parcel knocks and exactly one of them goes to see.
 * None of it belongs to any one character — it belongs between them — so it
 * is arranged in one place instead of five, and that is the whole reason this
 * file exists. A dokkaebi that scheduled its own scenes would have no way of
 * knowing that two others were already in one.
 *
 * Three rules hold the room together:
 *
 *   One scene at a time. Two scenes at once is not twice as lively, it is a
 *   room where the eye has nowhere to settle. With the ambient floor of two
 *   (src/systems/ambient.ts) that puts the ceiling at three moving things,
 *   and a scene raises the attention floor while it runs so the ambience
 *   stands aside rather than adding to it.
 *
 *   The visitor outranks all of it. A click on a dokkaebi cuts straight
 *   through whatever it was doing (see `mayInterrupt` in src/scenes/npc.ts,
 *   where REACT is the top priority), and opening a thing makes the crew
 *   yield it and go calm, which every scene here respects because every one
 *   of them asks `openTo` first.
 *
 *   Nothing is abandoned. A scene never changes what anybody was doing; it
 *   borrows them. `glanceAt` remembers the job and hands it back, and the one
 *   errand that does move somebody — the walk to the fridge — is an errand of
 *   the kind the character would have chosen for itself anyway.
 *
 * There is no clock in here. The room drives `step`, so a hidden tab is a
 * room where nothing accumulates, and a test drives it in a loop.
 */
import type { Waypoint } from '@/data/navigation'

/** What a scene needs of a member of the crew. */
export interface InteractionMember {
  readonly id: string
  readonly at: { readonly x: number; readonly y: number }
  /** The state machine's own word for what it is doing. */
  readonly state: string
  readonly away: boolean
  /** Free to be borrowed for a moment. */
  readonly openTo: boolean
  glanceAt(point: { readonly x: number; readonly y: number }, ms?: number): boolean
  linger(ms: number): boolean
  summon(to: Waypoint): boolean
}

/** The kinds of thing that can be going on. */
export type SceneId = 'watchBench' | 'doze' | 'parcel' | 'fridge' | 'screen'

/** A place in the room a scene can be about. */
export interface Place {
  readonly at: { readonly x: number; readonly y: number }
  /** Where somebody stands to use it, if anybody can. */
  readonly spot?: Waypoint
  /** The thing's id in the world, so the visitor can take it back. */
  readonly objectId?: string
}

export interface Running {
  readonly scene: SceneId
  /** Everybody the scene has borrowed. */
  readonly who: readonly string[]
  readonly objectId?: string
}

export interface CrewInteractionsOptions {
  readonly random?: () => number
  /**
   * Everything waits longer. A phone holds two of them in a third of the
   * room, so the same rate of scenes reads as two creatures pestering each
   * other rather than as a workshop.
   */
  readonly slow?: number
  /** The parcel, the fridge, the monitor, the television. */
  readonly places?: Partial<Record<'parcel' | 'fridge' | 'pc' | 'tv', Place>>
}

/** How far apart two of them can be and still be in the same scene. */
const NEAR = { bench: 700, sitter: 620, parcel: 1500, watcher: 640 }

/**
 * How long between attempts at each kind of scene, in milliseconds. An
 * attempt is not a scene: most of them find nobody free and cost nothing.
 */
const EVERY: Record<SceneId, readonly [number, number]> = {
  watchBench: [16_000, 38_000],
  doze: [30_000, 70_000],
  fridge: [46_000, 96_000],
  screen: [26_000, 58_000],
  // Not scheduled: it happens when the parcel does.
  parcel: [0, 0],
}

/** Nothing at all in the first stretch: the visitor is still arriving. */
const SETTLE = 9000

/**
 * How long an attempt that found nobody waits before trying again.
 *
 * Short, and that is the point. Two of the scenes need a coincidence — one of
 * them at the bench with another beside it, one of them actually sitting —
 * and a scene that only looks every half minute will go a whole visit without
 * ever looking at the right moment. An attempt that finds nobody costs a
 * comparison over five and changes nothing, so it may as well be cheap and
 * often. The full gap is what a scene waits after it has *happened*.
 */
const RETRY = 4500

/**
 * How much of the room's attention a scene takes. Above `crew` so ambience
 * stands aside, below `interaction` so the visitor always wins.
 */
export const SCENE_ATTENTION = 34

export class CrewInteractions {
  #members: InteractionMember[] = []
  #random: () => number
  #slow: number
  #places: CrewInteractionsOptions['places']
  #clock = 0
  #paused = false
  #running: (Running & { until: number }) | null = null
  #due = new Map<SceneId, number>()
  /** The last time each pair was in a scene together, so it is not always them. */
  #pairs = new Map<string, number>()
  /** The last time each one was borrowed, so it is not always the same one. */
  #used = new Map<string, number>()
  #log: SceneId[] = []
  /** When each kind last actually happened, so no kind is crowded out. */
  #ran = new Map<SceneId, number>()

  constructor(opts: CrewInteractionsOptions = {}) {
    this.#random = opts.random ?? Math.random
    this.#slow = opts.slow ?? 1
    this.#places = opts.places
    for (const id of Object.keys(EVERY) as SceneId[]) {
      if (EVERY[id][1] > 0) this.#due.set(id, SETTLE + this.#gap(id) / 2)
    }
  }

  join(m: InteractionMember): void {
    if (!this.#members.some((o) => o.id === m.id)) this.#members.push(m)
  }

  leave(id: string): void {
    this.#members = this.#members.filter((m) => m.id !== id)
    if (this.#running?.who.includes(id)) this.#running = null
  }

  /** What is going on, if anything. */
  get running(): Running | null {
    return this.#running
  }

  /** Every scene that has run, in order. For tests and for the debug overlay. */
  get history(): readonly SceneId[] {
    return this.#log
  }

  /** What the room should not let ambience compete with. */
  get attention(): number {
    return this.#running ? SCENE_ATTENTION : 0
  }

  /**
   * A panel is open, or a game. No new scenes, and the one that is running is
   * over — the crew have been told to go calm anyway, so anything still
   * holding a lock here would only be a lock nobody can release.
   */
  setPaused(paused: boolean): void {
    this.#paused = paused
    if (paused) this.#running = null
  }

  /** The visitor wants that thing. Whatever the room was doing with it, stop. */
  yieldTo(objectId: string): void {
    if (this.#running?.objectId === objectId) this.#running = null
  }

  /**
   * Something in the room moved by itself. Exactly one of them is allowed to
   * care, and only if nothing else is going on.
   */
  notice(eventId: string): void {
    if (eventId !== 'parcelWiggle') return
    const parcel = this.#places?.parcel
    if (!parcel || this.#busy()) return
    const who = this.#nearestOpen(parcel.at, NEAR.parcel)
    if (!who) return
    // A knock is worth a look. Worth crossing the room for only if it is
    // already close enough that going is not an errand of its own.
    const close = Math.hypot(who.at.x - parcel.at.x, who.at.y - parcel.at.y) < 760
    const went = close && parcel.spot ? who.summon(parcel.spot) : false
    if (!went && !who.glanceAt(parcel.at, 1000 + this.#random() * 600)) return
    this.#begin('parcel', [who.id], went ? 7000 : 1800, parcel.objectId)
  }

  step(dt: number): void {
    this.#clock += dt
    if (this.#running && this.#clock >= this.#running.until) this.#running = null
    if (this.#paused) return
    if (this.#clock < SETTLE) return
    // Whichever kind has gone longest without happening gets first refusal.
    // Without this the two scenes that need no coincidence — a glance at a
    // screen, a walk to the fridge — take every slot, and the room never
    // once shows somebody looking up from the bench.
    const order = (['watchBench', 'doze', 'screen', 'fridge'] as SceneId[])
      .filter((s) => this.#clock >= (this.#due.get(s) ?? Infinity))
      .sort((a, b) => (this.#ran.get(a) ?? -Infinity) - (this.#ran.get(b) ?? -Infinity))
    for (const scene of order) {
      if (this.#busy()) {
        // Somebody else got the slot. Come back shortly rather than losing
        // the turn: being second in the queue is not a reason to wait a
        // minute.
        this.#due.set(scene, this.#clock + RETRY)
        continue
      }
      const before = this.#log.length
      this.#try(scene)
      // A scene that happened waits its full gap. One that found nobody
      // looks again soon — the coincidence it needs may be a second away.
      this.#due.set(scene, this.#clock + (this.#log.length > before ? this.#gap(scene) : RETRY))
    }
  }

  // ── The scenes ───────────────────────────────────────────────────────────

  #try(scene: SceneId): void {
    if (scene === 'watchBench') this.#watchBench()
    else if (scene === 'doze') this.#doze()
    else if (scene === 'screen') this.#screen()
    else if (scene === 'fridge') this.#fridge()
  }

  /**
   * Somebody at the bench, and somebody who came near it.
   *
   * Both look up: the one who arrived at the one working, the one working at
   * the one who arrived, and then back to it. Which is what happens when you
   * walk past somebody concentrating — not a conversation, an acknowledgement.
   */
  #watchBench(): void {
    const working = this.#pick(this.#members.filter((m) => m.state === 'WORK' && m.openTo))
    if (!working) return
    // Anybody but another head down at the same bench — including somebody
    // walking past, which is exactly who looks up at somebody working.
    const near = this.#members.filter((m) =>
      m.id !== working.id && !m.away && m.state !== 'WORK'
      && (m.openTo || m.state === 'WALK')
      && this.#apart(m, working) < NEAR.bench)
    const visitor = this.#pick(near.filter((m) => this.#pairFree(m.id, working.id)))
    if (!visitor) return
    const ms = 600 + this.#random() * 900
    if (!visitor.glanceAt(working.at, ms)) return
    working.glanceAt(visitor.at, ms)
    this.#pairs.set(this.#pairKey(visitor.id, working.id), this.#clock)
    this.#begin('watchBench', [visitor.id, working.id], ms + 400)
  }

  /**
   * One of them has been sitting a while and is in no hurry to stop.
   *
   * No sleeping frame is drawn for anybody, and none is invented here: it is
   * the sit it was already in, held longer. Anyone passing may look over,
   * which is the only thing that says the stillness is a character and not a
   * stuck animation.
   */
  #doze(): void {
    const sitter = this.#pick(this.#members.filter((m) => m.state === 'SIT' && m.openTo))
    if (!sitter) return
    if (!sitter.linger(4000 + this.#random() * 5000)) return
    const who = [sitter.id]
    const passer = this.#pick(this.#members.filter((m) =>
      m.id !== sitter.id && m.openTo && this.#apart(m, sitter) < NEAR.sitter
      && this.#pairFree(m.id, sitter.id)))
    if (passer && this.#random() < 0.55 && passer.glanceAt(sitter.at, 700 + this.#random() * 500)) {
      who.push(passer.id)
      this.#pairs.set(this.#pairKey(passer.id, sitter.id), this.#clock)
    }
    this.#begin('doze', who, 2200)
  }

  /** A screen is on. Somebody looks at it for a second, the way you do. */
  #screen(): void {
    const screens = [this.#places?.pc, this.#places?.tv].filter((p): p is Place => !!p)
    if (!screens.length) return
    const where = screens[Math.floor(this.#random() * screens.length) % screens.length]!
    const who = this.#nearestOpen(where.at, NEAR.watcher)
    if (!who) return
    if (!who.glanceAt(where.at, 900 + this.#random() * 700)) return
    this.#begin('screen', [who.id], 1900, where.objectId)
  }

  /**
   * Somebody goes to the fridge, and somebody else watches them do it.
   *
   * The walk is a real errand — the same `summon` the room uses for its own —
   * so the crowd's booking keeps anybody else off the fridge door while it
   * lasts, and the visitor opening the fridge takes it back from them.
   */
  #fridge(): void {
    const fridge = this.#places?.fridge
    if (!fridge?.spot) return
    const goer = this.#pick(this.#members.filter((m) => m.openTo && m.state !== 'WALK'))
    if (!goer || !goer.summon(fridge.spot)) return
    const who = [goer.id]
    // One watcher, never two. Three of them round a fridge door is a queue.
    const watcher = this.#pick(this.#members.filter((m) =>
      m.id !== goer.id && m.openTo && this.#apart(m, goer) < NEAR.watcher))
    if (watcher && this.#random() < 0.5 && watcher.glanceAt(fridge.at, 900 + this.#random() * 600)) {
      who.push(watcher.id)
    }
    this.#begin('fridge', who, 9000, fridge.objectId)
  }

  // ── Housekeeping ─────────────────────────────────────────────────────────

  #begin(scene: SceneId, who: string[], ms: number, objectId?: string): void {
    this.#running = { scene, who, until: this.#clock + ms, ...(objectId ? { objectId } : {}) }
    for (const id of who) this.#used.set(id, this.#clock)
    this.#ran.set(scene, this.#clock)
    this.#log.push(scene)
  }

  #busy(): boolean {
    return this.#paused || this.#running !== null
  }

  #apart(a: InteractionMember, b: InteractionMember): number {
    return Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y)
  }

  #nearestOpen(to: { x: number; y: number }, within: number): InteractionMember | undefined {
    return this.#members
      .filter((m) => m.openTo && Math.hypot(m.at.x - to.x, m.at.y - to.y) < within)
      .sort((a, b) =>
        Math.hypot(a.at.x - to.x, a.at.y - to.y) - Math.hypot(b.at.x - to.x, b.at.y - to.y))[0]
  }

  /**
   * One of them, preferring whoever has been left out longest. Not random:
   * random picks the same one twice as often as it feels like it should, and
   * a room where one dokkaebi is in every scene is a room with one character
   * in it.
   */
  #pick(from: InteractionMember[]): InteractionMember | undefined {
    if (!from.length) return undefined
    const coldest = [...from].sort((a, b) =>
      (this.#used.get(a.id) ?? -Infinity) - (this.#used.get(b.id) ?? -Infinity))
    // Mostly the one left out longest, sometimes somebody else, so it is a
    // preference and not a rota.
    return this.#random() < 0.75 ? coldest[0] : coldest[Math.floor(this.#random() * coldest.length)]
  }

  #pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`
  }

  /** The same two do not keep doing this to each other. */
  #pairFree(a: string, b: string): boolean {
    return this.#clock - (this.#pairs.get(this.#pairKey(a, b)) ?? -Infinity) >= PAIR_COOLDOWN * this.#slow
  }

  #gap(scene: SceneId): number {
    const [min, max] = EVERY[scene]
    return (min + this.#random() * (max - min)) * this.#slow
  }
}

/** How long before the same two are in a scene together again. */
const PAIR_COOLDOWN = 75_000
