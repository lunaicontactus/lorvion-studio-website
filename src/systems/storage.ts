/**
 * Versioned, corruption-proof persistence.
 *
 * localStorage is hostile in the real world: it can be disabled, full, or
 * holding JSON written by an older build. Every read here is expected to fail
 * and every failure lands on a valid default, because a visitor who cleared
 * their storage should still get a working site, not a blank screen.
 */
import type { SaveData } from '@/types/save'
import { SAVE_VERSION } from '@/types/save'

const KEY = 'eungarage:save'

export function createDefaultSave(): SaveData {
  return {
    v: SAVE_VERSION,
    visitCount: 0,
    lastVisit: null,
    visitedProjects: [],
    discoveredCharacters: [],
    easterEggs: [],
    secretProgress: 0,
    soundEnabled: false,
    touched: [],
    fridgeDay: null,
    fridgeSnack: null,
    fridgeOpens: 0,
    collection: [],
  }
}

/** Is this storage usable at all? Safari private mode throws on write. */
export function isStorageAvailable(store: Storage | null = safeStore()): boolean {
  if (!store) return false
  try {
    const probe = '__eg_probe__'
    store.setItem(probe, '1')
    store.removeItem(probe)
    return true
  } catch {
    return false
  }
}

function safeStore(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null // blocked by a cookie policy
  }
}

const str = (v: unknown): v is string => typeof v === 'string'

/** Coerce anything at all into a valid save. Unknown fields are dropped. */
export function migrate(raw: unknown): SaveData {
  const base = createDefaultSave()
  if (typeof raw !== 'object' || raw === null) return base
  const o = raw as Record<string, unknown>

  // A v1 save is upgraded in place; anything we have never written restarts
  // from defaults rather than guessing at its shape.
  const version = o['v']
  if (version !== SAVE_VERSION && version !== 1) return base

  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter(str) : [])
  const num = (v: unknown, min: number, max: number, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.min(max, Math.max(min, Math.trunc(v)))
      : fallback

  return {
    v: SAVE_VERSION,
    visitCount: num(o['visitCount'], 0, 1e6, 0),
    lastVisit: str(o['lastVisit']) ? o['lastVisit'] : null,
    visitedProjects: arr(o['visitedProjects']),
    discoveredCharacters: arr(o['discoveredCharacters']),
    easterEggs: arr(o['easterEggs']),
    secretProgress: num(o['secretProgress'], 0, 3, 0),
    soundEnabled: o['soundEnabled'] === true,
    // Absent on a v1 save; the defaults are correct for someone who has never
    // been inside the garage.
    touched: arr(o['touched']),
    fridgeDay: str(o['fridgeDay']) ? o['fridgeDay'] : null,
    fridgeSnack: str(o['fridgeSnack']) ? o['fridgeSnack'] : null,
    fridgeOpens: num(o['fridgeOpens'], 0, 1e6, 0),
    collection: arr(o['collection']),
  }
}

export class SaveStore {
  #data: SaveData
  #store: Storage | null
  #writable: boolean
  #listeners = new Set<(d: Readonly<SaveData>) => void>()

  constructor(store: Storage | null = safeStore()) {
    this.#store = store
    this.#writable = isStorageAvailable(store)
    this.#data = this.#load()
  }

  /** False when the visitor's browser refuses storage — the site still runs,
   *  it just forgets them between visits. */
  get persistent(): boolean {
    return this.#writable
  }

  get data(): Readonly<SaveData> {
    return this.#data
  }

  #load(): SaveData {
    if (!this.#store) return createDefaultSave()
    let rawText: string | null = null
    try {
      rawText = this.#store.getItem(KEY)
    } catch {
      return createDefaultSave()
    }
    if (rawText === null) return createDefaultSave()
    try {
      return migrate(JSON.parse(rawText))
    } catch {
      // Corrupt JSON: drop it so the visitor is not stuck with a broken save.
      try {
        this.#store.removeItem(KEY)
      } catch {
        /* nothing more we can do */
      }
      return createDefaultSave()
    }
  }

  /** Apply a change and persist. Returns the new state. */
  update(fn: (draft: SaveData) => void): Readonly<SaveData> {
    const next: SaveData = structuredClone(this.#data)
    fn(next)
    this.#data = migrate(next) // re-validate: a caller cannot write a bad save
    this.#persist()
    for (const l of this.#listeners) l(this.#data)
    return this.#data
  }

  subscribe(fn: (d: Readonly<SaveData>) => void): () => void {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  /** Wipe everything this site stored. */
  reset(): void {
    this.#data = createDefaultSave()
    this.#persist()
  }

  #persist(): void {
    if (!this.#store || !this.#writable) return
    try {
      this.#store.setItem(KEY, JSON.stringify(this.#data))
    } catch {
      // Quota exceeded or storage revoked mid-session: keep running in memory.
      this.#writable = false
    }
  }
}

export const save = new SaveStore()

/** Count this page load as a visit at most once per session. */
export function registerVisit(store: SaveStore = save): void {
  const SESSION_KEY = 'eungarage:visitCounted'
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* sessionStorage unavailable — count it, worst case the number runs high */
  }
  store.update((d) => {
    d.visitCount += 1
    d.lastVisit = new Date().toISOString()
  })
}
