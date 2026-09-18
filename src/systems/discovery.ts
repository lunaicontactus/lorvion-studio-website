/**
 * GarageDiscoveryPool — what comes out when something is opened again.
 *
 * The shelf, the fridge, the parcels, the cabinet, the TV, the radio and the
 * workbench each hold more than they show at once, and opening one twice
 * should not give the same thing twice. That is the whole job: pick an entry
 * for a category, weighted, never one of the last few shown, respecting each
 * entry's own cooldown and "once a visit" flag.
 *
 * What it is not: a gacha. Rarity only makes a few entries turn up less often;
 * nothing is announced as rare, nothing is collected, nothing is counted.
 *
 * Owns no timer and reads no clock of its own — `now` and `random` are handed
 * in, so a test (or a date-seeded fridge) gets the same draws every time.
 */
import { log } from '@/systems/log'

export type DiscoveryCategory = 'shelf' | 'fridge' | 'parcel' | 'cabinet' | 'tv' | 'radio' | 'workbench'
export type Rarity = 'common' | 'uncommon' | 'rare'

export const CATEGORIES: readonly DiscoveryCategory[] = ['shelf', 'fridge', 'parcel', 'cabinet', 'tv', 'radio', 'workbench']

export interface DiscoveryEntry {
  readonly id: string
  readonly category: DiscoveryCategory
  readonly title: string
  readonly description: string
  /** A real asset path, or null where there is no picture of the thing. */
  readonly asset: string | null
  /** Relative chance before rarity. Must be > 0. */
  readonly weight: number
  readonly rarity: Rarity
  /** Milliseconds before this entry may be drawn again. 0 = no cooldown. */
  readonly cooldown: number
  /** Drawn at most once per visit. */
  readonly oncePerSession: boolean
  /** Whose it is, where that matters. */
  readonly owner?: 'momo' | 'nunu' | 'ruki' | 'yomi' | 'poko'
}

/** How much rarer each tier is. Quiet: rare is uncommon, not a jackpot. */
export const RARITY_FACTOR: Readonly<Record<Rarity, number>> = { common: 1, uncommon: 0.45, rare: 0.14 }

/** How many recent draws per category are never repeated. */
export const RECENT = 4

export interface PoolOptions {
  readonly random?: () => number
  readonly now?: () => number
  readonly recent?: number
  /** Entry ids already used this visit (from sessionStorage, say). */
  readonly spent?: Iterable<string>
}

/** Why an entry was refused at load, for the log and the tests. */
export function invalidReason(e: Partial<DiscoveryEntry>, seen: Set<string>): string | null {
  if (!e || typeof e !== 'object') return 'not an object'
  if (!e.id || typeof e.id !== 'string') return 'no id'
  if (seen.has(e.id)) return `duplicate id ${e.id}`
  if (!e.category || !CATEGORIES.includes(e.category)) return `${e.id}: unknown category ${String(e.category)}`
  if (!e.title) return `${e.id}: no title`
  if (typeof e.weight !== 'number' || !(e.weight > 0) || !Number.isFinite(e.weight)) return `${e.id}: weight must be > 0`
  if (!e.rarity || !(e.rarity in RARITY_FACTOR)) return `${e.id}: unknown rarity`
  if (typeof e.cooldown !== 'number' || e.cooldown < 0) return `${e.id}: bad cooldown`
  return null
}

export class GarageDiscoveryPool {
  readonly #entries: Map<DiscoveryCategory, DiscoveryEntry[]> = new Map()
  readonly #random: () => number
  readonly #now: () => number
  readonly #recentSize: number
  readonly #recent = new Map<DiscoveryCategory, string[]>()
  readonly #lastAt = new Map<string, number>()
  readonly #spent: Set<string>
  readonly rejected: string[] = []

  constructor(entries: readonly Partial<DiscoveryEntry>[], opts: PoolOptions = {}) {
    this.#random = opts.random ?? Math.random
    this.#now = opts.now ?? (() => Date.now())
    this.#recentSize = Math.max(0, opts.recent ?? RECENT)
    this.#spent = new Set(opts.spent ?? [])
    const seen = new Set<string>()
    for (const e of entries) {
      const why = invalidReason(e, seen)
      if (why) {
        this.rejected.push(why)
        log.debug('discovery: skipped entry —', why)
        continue
      }
      const ok = e as DiscoveryEntry
      seen.add(ok.id)
      const list = this.#entries.get(ok.category) ?? []
      list.push(ok)
      this.#entries.set(ok.category, list)
    }
  }

  entries(category: DiscoveryCategory): readonly DiscoveryEntry[] {
    return this.#entries.get(category) ?? []
  }

  /** Ids used this visit, for whoever persists them. */
  get spent(): readonly string[] {
    return [...this.#spent]
  }

  recent(category: DiscoveryCategory): readonly string[] {
    return this.#recent.get(category) ?? []
  }

  /**
   * One entry for this category, or null if it has none at all.
   *
   * Filters in order of how much they matter, and relaxes from the bottom if
   * that leaves nothing: cooldown first, then the recent window shrinks — but
   * the very last thing shown is never shown again straight away, unless it is
   * the only entry there is.
   */
  draw(category: DiscoveryCategory): DiscoveryEntry | null {
    const all = this.entries(category)
    if (!all.length) return null
    const now = this.#now()
    const recent = this.#recent.get(category) ?? []
    const last = recent[recent.length - 1]
    const fresh = all.filter((e) => !(e.oncePerSession && this.#spent.has(e.id)))
    const cooled = (e: DiscoveryEntry): boolean => {
      const at = this.#lastAt.get(e.id)
      return at === undefined || e.cooldown <= 0 || now - at >= e.cooldown
    }

    const window = Math.min(this.#recentSize, Math.max(0, fresh.length - 1))
    let candidates: DiscoveryEntry[] = []
    for (let w = window; w >= 1 && !candidates.length; w--) {
      const blocked = new Set(recent.slice(-w))
      candidates = fresh.filter((e) => !blocked.has(e.id) && cooled(e))
    }
    if (!candidates.length) candidates = fresh.filter((e) => e.id !== last)
    if (!candidates.length) candidates = fresh.length ? fresh : all.filter((e) => e.id !== last)
    if (!candidates.length) candidates = [...all]

    const weights = candidates.map((e) => e.weight * RARITY_FACTOR[e.rarity])
    const total = weights.reduce((a, b) => a + b, 0)
    let r = this.#random() * total
    let pick = candidates[candidates.length - 1]!
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i]!
      if (r < 0) {
        pick = candidates[i]!
        break
      }
    }

    const next = [...recent, pick.id]
    this.#recent.set(category, next.slice(-Math.max(1, this.#recentSize)))
    this.#lastAt.set(pick.id, now)
    if (pick.oncePerSession) this.#spent.add(pick.id)
    return pick
  }

  /** Several distinct entries at once (a shelf shows a few things). */
  drawMany(category: DiscoveryCategory, count: number): DiscoveryEntry[] {
    const out: DiscoveryEntry[] = []
    const avail = this.entries(category).length
    for (let i = 0; i < Math.min(count, avail) * 4 && out.length < Math.min(count, avail); i++) {
      const e = this.draw(category)
      if (e && !out.some((o) => o.id === e.id)) out.push(e)
    }
    return out
  }
}

/** A stable number for a string (a date key, an id). FNV-1a. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
