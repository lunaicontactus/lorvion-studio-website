/**
 * Turning a routine (src/data/routines.ts) into what one dokkaebi does next.
 *
 * Pure: the room, who is where and the dice are all passed in, so the
 * scheduler can be run in a test with a seed and asserted on — which job it
 * picks, that it never picks one it cannot do in this room, that a step whose
 * place is taken is skipped rather than waited on forever, and that the chain
 * ends where it began.
 *
 * Also here, because the same tests want them: how the time of night leans
 * the crew (E-11), and the floor's obstacles — the radio and the parcel stand
 * on the walkway, and a dokkaebi has to go behind them, not through them.
 */
import type { FloorObstacle, NavGraph, SitPoint, Waypoint } from '@/data/navigation'
import type { LookTarget, Routine, RoutineStep } from '@/data/routines'
import type { DayPhase } from '@/systems/clock'

/** Where a routine started, so `back` can go there again. */
export type Origin = { readonly kind: 'point'; readonly id: string } | { readonly kind: 'sit'; readonly id: string }

export interface PlanContext {
  /** Whether a place is free for this dokkaebi (the crowd's booking). */
  readonly free: (placeId: string) => boolean
  /** The thing the visitor has open: nobody goes to stand at it. */
  readonly avoid: string | null
  /** Where the routine began. */
  readonly origin: Origin | null
  /** The nearest of the crew at work, for `face: 'crew'`. */
  readonly crewAt: () => { x: number; y: number } | null
}

/** One concrete thing to do now. */
export type Action =
  | { readonly kind: 'go'; readonly point: Waypoint }
  | { readonly kind: 'sit'; readonly seat: SitPoint }
  | { readonly kind: 'pause'; readonly ms: number }
  | { readonly kind: 'search' }
  | { readonly kind: 'face'; readonly at: { readonly x: number; readonly y: number } }

/** How far up from the feet to look at a thing on the back wall. */
const WALL = 220

function pointFor(graph: NavGraph, ids: readonly string[], ctx: PlanContext): Waypoint | null {
  for (const id of ids) {
    const p = graph.points.find((q) => q.id === id)
    if (p && p.objectId !== ctx.avoid && ctx.free(p.id)) return p
  }
  return null
}

function seatFor(graph: NavGraph, ids: readonly string[], ctx: PlanContext): SitPoint | null {
  for (const id of ids) {
    const s = graph.sits.find((q) => q.id === id)
    if (s && ctx.free(s.id)) return s
  }
  return null
}

function lookAt(graph: NavGraph, target: LookTarget, ctx: PlanContext): { x: number; y: number } | null {
  if (target === 'crew') return ctx.crewAt()
  const p = graph.points.find((q) => q.objectId === target)
  return p ? { x: p.x, y: p.y - WALL } : null
}

/**
 * What a step means here and now, or null when it cannot be done in this room
 * at this moment (the place does not exist, or somebody has it). The caller
 * moves on to the next step: a job that skips a step still looks like a job,
 * one that stands waiting for a booked fridge does not.
 */
export function resolveStep(graph: NavGraph, step: RoutineStep, ctx: PlanContext, rng: () => number): Action | null {
  if ('go' in step) {
    const point = pointFor(graph, step.go, ctx)
    return point ? { kind: 'go', point } : null
  }
  if ('sit' in step) {
    const seat = seatFor(graph, step.sit, ctx)
    return seat ? { kind: 'sit', seat } : null
  }
  if ('pause' in step) return { kind: 'pause', ms: step.pause[0] + rng() * (step.pause[1] - step.pause[0]) }
  if ('search' in step) return { kind: 'search' }
  if ('face' in step) {
    const at = lookAt(graph, step.face, ctx)
    return at ? { kind: 'face', at } : null
  }
  // back
  const o = ctx.origin
  if (!o) return null
  if (o.kind === 'sit') {
    const seat = seatFor(graph, [o.id], ctx)
    return seat ? { kind: 'sit', seat } : null
  }
  const point = pointFor(graph, [o.id], ctx)
  return point ? { kind: 'go', point } : null
}

/**
 * Whether a routine can be done in this room at all: its first step names a
 * place that exists here, and at least one other step does something. A
 * phone room without a fridge does not get the fridge run with the fridge
 * cut out of it.
 */
export function feasible(graph: NavGraph, r: Routine): boolean {
  const exists = (ids: readonly string[], seats: boolean): boolean =>
    ids.some((id) => (seats ? graph.sits : graph.points).some((q) => q.id === id))
  const places = r.steps.filter((s) => 'go' in s || 'sit' in s)
  if (places.length < 2) return false
  return places.every((s) => ('go' in s ? exists(s.go, false) : exists((s as { sit: readonly string[] }).sit, true)))
}

/** Pick the next routine: weighted, possible here, and not the one just done. */
export function chooseRoutine(graph: NavGraph, routines: readonly Routine[], last: string | null, rng: () => number): Routine | null {
  const ok = routines.filter((r) => feasible(graph, r))
  const fresh = ok.length > 1 ? ok.filter((r) => r.id !== last) : ok
  const total = fresh.reduce((a, r) => a + r.weight, 0)
  if (total <= 0) return null
  let n = rng() * total
  for (const r of fresh) {
    n -= r.weight
    if (n <= 0) return r
  }
  return fresh[fresh.length - 1] ?? null
}

// ── The time of night (E-11) ─────────────────────────────────────────────
/**
 * Small leans, never a different crew. Evening is when things get made; late
 * at night they sit more and stand about longer; first thing in the morning
 * the room is slow. Multipliers on the profile's own pulls and spells.
 */
export interface Tendency {
  readonly work: number
  readonly sit: number
  readonly wander: number
  /** On how long a spell of standing about lasts. */
  readonly idle: number
}

const TENDENCY: Readonly<Record<DayPhase, Tendency>> = {
  morning: { work: 0.9, sit: 1.1, wander: 0.85, idle: 1.2 },
  day: { work: 1, sit: 1, wander: 1, idle: 1 },
  evening: { work: 1.2, sit: 0.95, wander: 1, idle: 0.95 },
  night: { work: 1.1, sit: 1.05, wander: 0.95, idle: 1.05 },
  lateNight: { work: 0.9, sit: 1.25, wander: 0.85, idle: 1.15 },
}

export function tendencyFor(phase: DayPhase): Tendency {
  return TENDENCY[phase]
}

// ── Things standing on the walkway ───────────────────────────────────────
/** Whether feet at (x, y) are inside one of the boxes. */
export function insideObstacle(obstacles: readonly FloorObstacle[], x: number, y: number): FloorObstacle | null {
  return obstacles.find((o) => x > o.x0 && x < o.x1 && y > o.behind) ?? null
}

/**
 * Where to head for now, on the way from `from` to `to`, so as to pass behind
 * any box in between rather than through it: first to the back of the box's
 * near side, then along behind it, then on. Returns `to` when nothing is in
 * the way.
 */
export function detour(
  obstacles: readonly FloorObstacle[],
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } {
  const dir = Math.sign(to.x - from.x)
  if (dir === 0) return to
  // The nearest box ahead that the walk crosses.
  const ahead = obstacles
    .filter((o) => (dir > 0 ? o.x1 > from.x && o.x0 < to.x : o.x0 < from.x && o.x1 > to.x))
    .sort((a, b) => (dir > 0 ? a.x0 - b.x0 : b.x1 - a.x1))[0]
  if (!ahead) return to
  const lane = ahead.behind - 2
  const inside = from.x > ahead.x0 && from.x < ahead.x1
  if (inside) {
    // Alongside it: keep behind it until past the far side.
    if (from.y > lane + 3) return { x: from.x, y: lane }
    return { x: dir > 0 ? ahead.x1 + 1 : ahead.x0 - 1, y: lane }
  }
  // Short of it. Fine as long as the walk would already pass behind it.
  if (from.y <= lane + 1 && to.y <= lane + 1) return to
  const edge = dir > 0 ? ahead.x0 - 2 : ahead.x1 + 2
  // Already at the near side and behind: go along.
  if (Math.abs(from.x - edge) < 6 && from.y <= lane + 3) return { x: dir > 0 ? ahead.x1 + 1 : ahead.x0 - 1, y: lane }
  // A target on this side of it is reached directly.
  if (dir > 0 ? to.x <= ahead.x0 : to.x >= ahead.x1) return to
  return { x: edge, y: lane }
}
