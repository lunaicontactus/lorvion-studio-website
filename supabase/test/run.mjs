// Local tests for supabase/migrations on an embedded Postgres 17.
//
// Supabase's own pieces the schema relies on are shimmed the way Supabase
// defines them: the `anon` / `authenticated` roles PostgREST switches to, and
// auth.uid() reading the JWT `sub` claim from `request.jwt.claim.sub`.
// Every call below is made AS those roles, so a missing grant or an RLS hole
// fails here exactly as it would through the REST API.
//
//   cd supabase && npm test
import EmbeddedPostgres from 'embedded-postgres'
import pg from 'pg'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'eg-pg-'))
const port = 54329
const db = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port, persistent: false, onLog: () => {} })

let passed = 0
const failures = []
async function check(name, fn) {
  try {
    await fn()
    passed++
    console.log(`PASS  ${name}`)
  } catch (e) {
    failures.push(name)
    console.log(`FAIL  ${name}\n      ${e.message}`)
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

const ADMIN = '00000000-0000-4000-8000-00000000a001'
const USER = '00000000-0000-4000-8000-00000000b002'

await db.initialise()
await db.start()
const client = new pg.Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: 'postgres' })
await client.connect()

try {
  // ── Supabase shims ──
  await client.query(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
  `)
  for (const f of readdirSync(join(here, '../migrations')).sort()) {
    await client.query(readFileSync(join(here, '../migrations', f), 'utf8'))
    console.log(`applied ${f}`)
  }
  await client.query(`insert into public.admins (user_id, note) values ('${ADMIN}', 'test admin')`)

  // Run `sql` as a role, optionally signed in as `uid`, with request headers.
  async function as(role, sql, params = [], { uid = null, headers = null } = {}) {
    await client.query('begin')
    try {
      await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? ''])
      await client.query(`select set_config('request.headers', $1, true)`, [headers ? JSON.stringify(headers) : ''])
      await client.query(`set local role ${role}`)
      const r = await client.query(sql, params)
      await client.query('commit')
      return r
    } catch (e) {
      await client.query('rollback')
      throw e
    }
  }
  const fails = async (p, code) => {
    try { await p } catch (e) { if (!code || e.code === code) return e; throw new Error(`expected ${code}, got ${e.code}: ${e.message}`) }
    throw new Error(`expected an error${code ? ' ' + code : ''}`)
  }
  const anon = (sql, params, o) => as('anon', sql, params, o)
  const admin = (sql, params) => as('authenticated', sql, params, { uid: ADMIN })
  const user = (sql, params) => as('authenticated', sql, params, { uid: USER })

  await check('the browser cannot read or write any table directly', async () => {
    for (const t of ['guestbook_entries', 'guestbook_reports', 'visits', 'stars', 'admins', 'audit_log', 'site_settings', 'rate_limits']) {
      await fails(anon(`select * from public.${t}`), '42501')
      await fails(user(`select * from public.${t}`), '42501')
    }
    await fails(anon(`insert into public.stars (code, name, x, y) values ('X', 'x', 0.5, 0.5)`), '42501')
  })

  await check('internal helpers are not callable from the site', async () => {
    for (const f of ['setting(\'hash_salt\')', 'client_hash(\'x\')', 'rate_ok(\'x\', 1, interval \'1 minute\')', 'star_code()', 'star_place()', 'audit(\'a\', \'b\', null)']) {
      await fails(anon(`select public.${f}`), '42501')
    }
  })

  let firstId
  await check('a note is held for review and is not public until approved', async () => {
    const r = await anon(`select * from public.guestbook_submit($1, $2, $3, $4)`, ['별별', '은가라지 분위기 너무 좋아요', 'star', 'client-aaaaaaaa'])
    assert(r.rows[0].status === 'pending', `status ${r.rows[0].status}`)
    firstId = Number(r.rows[0].id)
    const list = await anon(`select * from public.guestbook_list()`)
    assert(list.rows.length === 0, 'pending note is listed')
    await admin(`select public.admin_guestbook_set($1, 'approved')`, [firstId])
    const after = await anon(`select * from public.guestbook_list()`)
    assert(after.rows.length === 1 && after.rows[0].nickname === '별별', 'approved note not listed')
    assert(!('author_hash' in after.rows[0]), 'author hash leaks')
  })

  await check('input is validated: lengths, stickers, links, control characters', async () => {
    await fails(anon(`select * from public.guestbook_submit('', 'hi', 'star', 'client-bbbbbbbb')`), '22023')
    await fails(anon(`select * from public.guestbook_submit('a', $1, 'star', 'client-bbbbbbbb')`, ['x'.repeat(201)]), '22023')
    await fails(anon(`select * from public.guestbook_submit('a', 'hi', 'bomb', 'client-bbbbbbbb')`), '22023')
    await fails(anon(`select * from public.guestbook_submit('a', 'see https://spam.example', 'star', 'client-bbbbbbbb')`), '22023')
    const r = await anon(`select * from public.guestbook_submit($1, $2, 'heart', 'client-bbbbbbbb')`, ['  루나\u0007링  ', '<script>alert(1)</script>'])
    const row = (await admin(`select * from public.admin_guestbook('pending')`)).rows.find((x) => Number(x.id) === Number(r.rows[0].id))
    assert(row.nickname === '루나링', `nickname not cleaned: ${JSON.stringify(row.nickname)}`)
    // Stored as text; the page escapes on output (test/guestbook.test.ts).
    assert(row.message === '<script>alert(1)</script>', 'message changed')
  })

  await check('a double click is not two notes', async () => {
    await anon(`select * from public.guestbook_submit('c', '두 번 누름', 'moon', 'client-cccccccc')`)
    await fails(anon(`select * from public.guestbook_submit('c', '두 번 누름', 'moon', 'client-cccccccc')`), '23505')
  })

  await check('three notes per browser per ten minutes, then a polite refusal', async () => {
    for (let i = 0; i < 3; i++) await anon(`select * from public.guestbook_submit('d', $1, 'paw', 'client-dddddddd')`, [`메시지 ${i}`])
    await fails(anon(`select * from public.guestbook_submit('d', '네 번째', 'paw', 'client-dddddddd')`), '53400')
    // The forwarded address wins over the browser id, so a new id is no way round it.
    for (let i = 0; i < 3; i++) await anon(`select * from public.guestbook_submit('e', $1, 'paw', $2)`, [`m${i}`, `client-e${i}eeeeeee`], { headers: { 'x-forwarded-for': '203.0.113.9' } })
    await fails(anon(`select * from public.guestbook_submit('e', 'm3', 'paw', 'client-e3eeeeeee')`, [], { headers: { 'x-forwarded-for': '203.0.113.9' } }), '53400')
  })

  await check('three different reports hide a note until an admin looks', async () => {
    await anon(`select public.guestbook_report($1, '스팸', 'client-r1rrrrrr')`, [firstId])
    await anon(`select public.guestbook_report($1, '스팸', 'client-r1rrrrrr')`, [firstId]) // same reporter twice = once
    await anon(`select public.guestbook_report($1, '스팸', 'client-r2rrrrrr')`, [firstId])
    assert((await anon(`select * from public.guestbook_list()`)).rows.length === 1, 'hidden after two reporters')
    await anon(`select public.guestbook_report($1, '스팸', 'client-r3rrrrrr')`, [firstId])
    assert((await anon(`select * from public.guestbook_list()`)).rows.length === 0, 'still listed after three reporters')
    await admin(`select public.admin_guestbook_set($1, 'approved')`, [firstId])
  })

  await check('only admins moderate; signed-in visitors and anon cannot', async () => {
    await fails(user(`select * from public.admin_guestbook('pending')`), '42501')
    await fails(user(`select public.admin_guestbook_set($1, 'hidden')`, [firstId]), '42501')
    await fails(anon(`select * from public.admin_guestbook('pending')`), '42501')
    await fails(anon(`select public.admin_star_issue('x', null)`), '42501')
    assert((await user(`select public.is_admin() as a`)).rows[0].a === false, 'user is admin')
    assert((await admin(`select public.is_admin() as a`)).rows[0].a === true, 'admin is not admin')
  })

  await check('an admin reply shows under the note and is kept apart from it', async () => {
    await admin(`select public.admin_guestbook_reply($1, '고마워요! 또 놀러 와요 ♡')`, [firstId])
    const row = (await anon(`select * from public.guestbook_list()`)).rows[0]
    assert(row.reply === '고마워요! 또 놀러 와요 ♡' && row.reply_at, 'reply missing')
    assert(row.message === '은가라지 분위기 너무 좋아요', 'reply overwrote the note')
  })

  await check('the list pages newest first and caps its page size', async () => {
    const ids = (await admin(`select id from public.admin_guestbook('pending', 200)`)).rows.map((r) => Number(r.id))
    for (const id of ids) await admin(`select public.admin_guestbook_set($1, 'approved')`, [id])
    const all = (await anon(`select * from public.guestbook_list(null, 1000)`)).rows
    assert(all.length <= 50, 'page size not capped')
    const p1 = (await anon(`select * from public.guestbook_list(null, 3)`)).rows
    const p2 = (await anon(`select * from public.guestbook_list($1, 3)`, [p1[2].id])).rows
    assert(Number(p1[0].id) > Number(p1[1].id) && Number(p2[0].id) < Number(p1[2].id), 'not newest first / not paged')
  })

  await check('with moderation off a note is public at once (admin switch, audited)', async () => {
    await fails(user(`select public.admin_setting('guestbook_moderation', 'off')`), '42501')
    await admin(`select public.admin_setting('guestbook_moderation', 'off')`)
    const r = await anon(`select * from public.guestbook_submit('f', '바로 보여요', 'flower', 'client-ffffffff')`)
    assert(r.rows[0].status === 'approved', 'not approved directly')
    await admin(`select public.admin_setting('guestbook_moderation', 'on')`)
    await fails(admin(`select public.admin_setting('hash_salt', 'x')`), '22023')
  })

  await check('visits: one per browser per day, nothing personal stored', async () => {
    const a = (await anon(`select * from public.visit_hit('visitor-1111aaaa')`)).rows[0]
    const b = (await anon(`select * from public.visit_hit('visitor-1111aaaa')`)).rows[0]
    const c = (await anon(`select * from public.visit_hit('visitor-2222bbbb')`)).rows[0]
    assert(Number(a.today) === 1 && Number(b.today) === 1 && Number(c.today) === 2, `today ${a.today}/${b.today}/${c.today}`)
    assert(Number(c.total) === 2, `total ${c.total}`)
    await fails(anon(`select * from public.visit_hit('short')`), '22023')
    const stored = (await client.query(`select visitor_hash from public.visits`)).rows
    assert(stored.every((r) => /^[0-9a-f]{64}$/.test(r.visitor_hash) && !r.visitor_hash.includes('visitor')), 'raw id stored')
  })

  const codes = []
  await check('stars: issued by an admin, unique codes, fixed places that do not overlap', async () => {
    for (let i = 0; i < 40; i++) {
      const r = (await admin(`select * from public.admin_star_issue($1, $2, 'pink', 2)`, [`테스트별 ${i}`, i % 2 ? '응원해요' : null])).rows[0]
      codes.push(r.code)
      assert(/^STAR-[A-HJ-NP-Z2-9]{6}$/.test(r.code), `code ${r.code}`)
    }
    assert(new Set(codes).size === 40, 'duplicate codes')
    const list = (await anon(`select * from public.stars_list()`)).rows
    assert(list.length === 40, `listed ${list.length}`)
    assert(list.every((s) => s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1), 'off the sky')
    let min = 1
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) min = Math.min(min, Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y))
    assert(min >= 0.028 - 1e-6, `stars overlap: ${min.toFixed(3)}`)
    assert(!('support_ref' in list[0]) && !('status' in list[0]), 'private columns leak')
    const again = (await anon(`select * from public.stars_list()`)).rows
    assert(again.every((s, k) => s.x === list[k].x && s.y === list[k].y), 'places changed between reads')
  })

  await check('stars: find by code or name; wildcards do nothing', async () => {
    const byCode = (await anon(`select * from public.star_find($1)`, [codes[3].toLowerCase()])).rows
    assert(byCode.length === 1 && byCode[0].code === codes[3], 'code search')
    const byName = (await anon(`select * from public.star_find('테스트별 1')`)).rows
    assert(byName.length >= 1 && byName.every((s) => s.name.startsWith('테스트별 1')), 'name search')
    assert((await anon(`select * from public.star_find('%')`)).rows.length === 0, '% matched everything')
    assert((await anon(`select * from public.star_find('_')`)).rows.length === 0, '_ matched everything')
    assert((await anon(`select * from public.star_find('')`)).rows.length === 0, 'empty matched')
  })

  await check('stars: hidden or private stars are not shown; edits and deletes are audited', async () => {
    await admin(`select public.admin_star_update($1, '숨긴 별', null, 'hidden', true)`, [codes[0]])
    await admin(`select public.admin_star_update($1, '비공개 별', null, 'approved', false)`, [codes[1]])
    await admin(`select public.admin_star_delete($1)`, [codes[2]])
    const list = (await anon(`select code from public.stars_list()`)).rows.map((r) => r.code)
    assert(!list.includes(codes[0]) && !list.includes(codes[1]) && !list.includes(codes[2]) && list.length === 37, 'not filtered')
    assert((await anon(`select * from public.star_find($1)`, [codes[1]])).rows.length === 0, 'private star findable')
    const audit = (await admin(`select * from public.admin_audit(500)`)).rows.map((r) => r.action)
    for (const a of ['star.issue', 'star.update', 'star.delete', 'guestbook.status', 'guestbook.reply', 'setting']) assert(audit.includes(a), `no audit for ${a}`)
    await fails(anon(`select * from public.admin_audit()`), '42501')
    await fails(user(`select * from public.admin_audit()`), '42501')
  })

  await check('stars: one support reference, one star (no double issue)', async () => {
    await admin(`select * from public.admin_star_issue('후원 별', null, 'gold', 1, 'supporter', true, 'test-ref-001')`)
    await fails(admin(`select * from public.admin_star_issue('후원 별 2', null, 'gold', 1, 'supporter', true, 'test-ref-001')`), '23505')
    await fails(admin(`select * from public.admin_star_issue('너무 큰 별', null, 'gold', 9)`), '23514')
  })

  await check('stars: reports are recorded once per browser, unknown codes refused', async () => {
    await anon(`select public.star_report($1, '부적절', 'client-sr11111')`, [codes[5]])
    await anon(`select public.star_report($1, '부적절', 'client-sr11111')`, [codes[5]])
    const n = (await admin(`select * from public.admin_stars()`)).rows.find((s) => s.code === codes[5]).reports
    assert(Number(n) === 1, `reports ${n}`)
    await fails(anon(`select public.star_report('STAR-NOPE00', 'x', 'client-sr11111')`), 'P0002')
  })
} finally {
  await client.end()
  await db.stop()
  rmSync(dir, { recursive: true, force: true })
}

if (process.env.FORCE_FAIL) failures.push("forced failure (exit-code self-check)")
console.log(`\n${passed}/${passed + failures.length} passed`)
// exitCode, not exit(): a hard exit here can deadlock node's shutdown.
process.exitCode = failures.length ? 1 : 0
