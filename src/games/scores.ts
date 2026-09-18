/**
 * What the mini-games remember, and what they refuse to believe.
 *
 * One key per game under `eungarage.minigame.`, one per game under
 * `eungarage.progress.`, and nothing else. Small and separate on purpose: the
 * site's own save (src/systems/storage.ts) is one object that is read and
 * rewritten whole, and a game writing a best score every round would rewrite
 * the visitor's whole history each time.
 *
 * Everything read out of storage is treated as something a stranger wrote,
 * because it is: it is a string in a browser the visitor controls, it may be
 * from a version of this site that no longer exists, and a page that throws
 * on a bad number is a page that a single stray character bricks for ever.
 * So every read is validated and a bad value is simply absent.
 *
 * A best score is a best score. It never goes down.
 */
import { log } from '@/systems/log'

const BEST = 'eungarage.minigame'
const PROGRESS = 'eungarage.progress'

/** Nobody scores this much. A number past it is a broken number. */
const SANE_MAX = 1_000_000

export interface Progress {
  /** Best score seen for this game. */
  readonly best: number
  /** Most stars earned in one round: 0 to 3. */
  readonly stars: number
  /** How many rounds have been finished. */
  readonly plays: number
}

const EMPTY: Progress = { best: 0, stars: 0, plays: 0 }

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Private mode, or storage switched off. Not an error: a visitor who
    // keeps no records still gets to play.
    return null
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** A whole number in range, or nothing. */
function whole(value: unknown, max = SANE_MAX): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || n > max) return null
  return Math.floor(n)
}

/** Whether records survive a reload here at all. */
export function persistent(): boolean {
  const probe = `${BEST}.__probe`
  if (!write(probe, '1')) return false
  const ok = read(probe) === '1'
  try {
    localStorage.removeItem(probe)
  } catch {
    /* nothing to undo */
  }
  return ok
}

export function bestFor(gameId: string): number {
  return whole(read(`${BEST}.${gameId}.best`)) ?? 0
}

export function progressFor(gameId: string): Progress {
  const raw = read(`${PROGRESS}.${gameId}`)
  if (raw === null) return { ...EMPTY, best: bestFor(gameId) }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object')
    const o = parsed as Record<string, unknown>
    return {
      best: whole(o['best']) ?? bestFor(gameId),
      stars: whole(o['stars'], 3) ?? 0,
      plays: whole(o['plays'], SANE_MAX) ?? 0,
    }
  } catch (err) {
    // Somebody's storage has something else in this key. Start again rather
    // than taking the whole page down over it.
    log.debug('scores: ignoring unreadable progress for', gameId, err)
    return { ...EMPTY }
  }
}

/**
 * Write down a finished round, and say what the records are now.
 *
 * Nothing goes backwards: a worse score does not replace a better one and
 * fewer stars do not replace more. `plays` counts finished rounds, including
 * the bad ones, because how often somebody came back is worth knowing and is
 * not a record to beat.
 */
export function record(gameId: string, score: number, stars: number): Progress {
  const was = progressFor(gameId)
  const clean = whole(score) ?? 0
  const cleanStars = whole(stars, 3) ?? 0
  const now: Progress = {
    best: Math.max(was.best, clean),
    stars: Math.max(was.stars, cleanStars),
    plays: was.plays + 1,
  }
  write(`${BEST}.${gameId}.best`, String(now.best))
  write(`${PROGRESS}.${gameId}`, JSON.stringify(now))
  return now
}

/** Everything the three games have earned, for the door that watches them. */
export function allProgress(gameIds: readonly string[]): Record<string, Progress> {
  const out: Record<string, Progress> = {}
  for (const id of gameIds) out[id] = progressFor(id)
  return out
}

/** Used by the tests, and by nothing else. */
export function forget(gameId: string): void {
  try {
    localStorage.removeItem(`${BEST}.${gameId}.best`)
    localStorage.removeItem(`${PROGRESS}.${gameId}`)
  } catch {
    /* nothing to forget */
  }
}
