/**
 * Feature flags.
 *
 * The site is built in 38 steps against a live domain, so half-finished work
 * has to be able to sit on main without being visible. A flag defaults to the
 * safe answer and can be flipped per-visit with ?flag=on for QA.
 */

export interface Flags {
  /** The pre-DOKKA space hero. On until STEP 2's alley replaces it, then this
   *  flag and src/legacy/ both get deleted. */
  legacyHero: boolean
  /** Korean alley entrance (STEP 2). */
  alley: boolean
  /** DOKKA CREW workshop interior (STEP 3). */
  garage: boolean
  /** Character engine (STEP 5). */
  characters: boolean
  /** Dokka fire (STEP 10). */
  dokkaFire: boolean
  /** Mini games (STEP 20+). */
  miniGames: boolean
  /** Verbose system logging. */
  debug: boolean
}

const DEFAULTS: Flags = {
  legacyHero: true,
  alley: false,
  garage: false,
  characters: false,
  dokkaFire: false,
  miniGames: false,
  debug: false,
}

const TRUTHY = new Set(['1', 'true', 'on', 'yes'])
const FALSY = new Set(['0', 'false', 'off', 'no'])

/** Read overrides from a query string, e.g. ?alley=on&legacyHero=off */
export function resolveFlags(search = '', defaults: Flags = DEFAULTS): Flags {
  const out: Flags = { ...defaults }
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return out
  }
  for (const key of Object.keys(out) as (keyof Flags)[]) {
    const raw = params.get(key)
    if (raw === null) continue
    const v = raw.toLowerCase()
    if (TRUTHY.has(v) || v === '') out[key] = true
    else if (FALSY.has(v)) out[key] = false
  }
  return out
}

export const flags: Flags = resolveFlags(
  typeof location === 'undefined' ? '' : location.search,
)
