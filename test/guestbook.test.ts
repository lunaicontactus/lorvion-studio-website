import { describe, expect, it } from 'vitest'
import { entryHtml } from '@/ui/guestbook'
import { backend, friendly, BackendError } from '@/systems/backend'

/** EUNGARAGE 2.0 PART 13.7: what a visitor writes is never HTML on the page. */
describe('guestbook output', () => {
  const base = { id: 7, sticker: 'star' as const, reply: null, reply_at: null, created_at: '2026-11-19T01:02:03Z' }
  it('escapes the nickname, the message and the reply', () => {
    const html = entryHtml({ ...base, nickname: '<img src=x onerror=alert(1)>', message: '<script>alert(1)</script>"\'&', reply: '<b>hi</b>' })
    expect(html).not.toMatch(/<script|<img src=x|<b>hi/)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;')
  })
  it('marks an admin reply as the operator\'s, apart from the note', () => {
    const html = entryHtml({ ...base, nickname: 'a', message: 'b', reply: '고마워요' })
    expect(html).toMatch(/운영자 답글/)
  })
})

describe('the server client', () => {
  it('is off in a build without a configured project, and says so in words', () => {
    expect(backend.configured).toBe(false)
    expect(friendly(new BackendError('x', '53400', 400))).toMatch(/다시/)
    expect(friendly(new Error('network'))).toMatch(/서버/)
  })
})
