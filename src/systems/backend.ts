/**
 * The site's server, when there is one (EUNGARAGE 2.0, PART 24).
 *
 * A Supabase project of its own (user decision 2026-11-19), reached only
 * through the RPC functions in supabase/migrations — the browser cannot read
 * or write a table. The address and the public `anon` key come from the build
 * (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY); the anon key is meant to be
 * public, and nothing secret is ever in the bundle.
 *
 * With no server configured, `configured` is false and every feature that
 * needs it says so plainly (disabled, "준비 중") — no stand-in numbers, no
 * pretend saves.
 */
const URL_ = (import.meta.env['VITE_SUPABASE_URL'] as string | undefined)?.replace(/\/$/, '') ?? ''
const KEY = (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? ''

export const backend = {
  get configured(): boolean {
    return URL_.startsWith('https://') && KEY.length > 20
  },
}

export class BackendError extends Error {
  readonly code: string
  readonly status: number
  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

/** What the visitor should read when a call fails, by Postgres error code. */
export function friendly(e: unknown): string {
  if (!(e instanceof BackendError)) return '서버에 닿지 않았어요. 잠시 뒤에 다시 해 주세요.'
  switch (e.code) {
    case '53400': return '조금 쉬었다가 다시 해 주세요. (짧은 시간에 너무 많이 보냈어요)'
    case '23505': return '이미 남긴 글이에요.'
    case '22023': return e.message.includes('link') ? '링크는 남길 수 없어요.' : '입력한 내용을 다시 확인해 주세요.'
    case 'P0002': return '찾을 수 없어요.'
    case '42501': return '권한이 없어요.'
    default: return '문제가 생겼어요. 잠시 뒤에 다시 해 주세요.'
  }
}

/** Call an RPC. `token` is a signed-in admin's access token; otherwise anon. */
export async function rpc<T>(name: string, args: Record<string, unknown> = {}, token?: string): Promise<T> {
  if (!backend.configured) throw new BackendError('not configured', 'offline', 0)
  const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token ?? KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  const text = await res.text()
  const body: unknown = text ? JSON.parse(text) : null
  if (!res.ok) {
    const b = (body ?? {}) as { message?: string; code?: string }
    throw new BackendError(b.message ?? res.statusText, b.code ?? String(res.status), res.status)
  }
  return body as T
}

/** Supabase Auth, for the admin page only: an emailed one-time code. */
export const auth = {
  async sendCode(email: string): Promise<void> {
    const res = await fetch(`${URL_}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, create_user: false }),
    })
    if (!res.ok) throw new BackendError('could not send the code', String(res.status), res.status)
  },
  async verify(email: string, token: string): Promise<string> {
    const res = await fetch(`${URL_}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', email, token }),
    })
    const b = (await res.json().catch(() => ({}))) as { access_token?: string }
    if (!res.ok || !b.access_token) throw new BackendError('wrong or expired code', String(res.status), res.status)
    return b.access_token
  },
}

/**
 * This browser's random id, for "one visit a day" and the guestbook's
 * limits. Not a person: 24 random characters, kept in local storage; the
 * server only ever stores it hashed with a secret salt.
 */
export function clientId(): string {
  const KEY_ = 'eungarage:client'
  try {
    const have = localStorage.getItem(KEY_)
    if (have && /^[a-z0-9]{24}$/.test(have)) return have
    const id = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
    localStorage.setItem(KEY_, id)
    return id
  } catch {
    // No storage: a fresh id per page. Counted more than once, never wrong about a person.
    return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
  }
}

export interface GuestbookEntry {
  readonly id: number
  readonly nickname: string
  readonly message: string
  readonly sticker: Sticker
  readonly reply: string | null
  readonly reply_at: string | null
  readonly created_at: string
}

export type Sticker = 'heart' | 'star' | 'moon' | 'ribbon' | 'flower' | 'paw'
export const STICKERS: readonly { readonly id: Sticker; readonly label: string; readonly glyph: string }[] = [
  { id: 'heart', label: '하트', glyph: '♥' },
  { id: 'star', label: '별', glyph: '★' },
  { id: 'moon', label: '달', glyph: '☾' },
  { id: 'ribbon', label: '리본', glyph: '🎀' },
  { id: 'flower', label: '꽃', glyph: '✿' },
  { id: 'paw', label: '고양이 발바닥', glyph: '🐾' },
]

export interface SkyStar {
  readonly code: string
  readonly kind: 'supporter' | 'event'
  readonly name: string
  readonly message: string | null
  readonly color: 'gold' | 'pink' | 'mint' | 'sky' | 'lavender' | 'white'
  readonly grade: 1 | 2 | 3
  readonly x: number
  readonly y: number
  readonly created_at: string
}
