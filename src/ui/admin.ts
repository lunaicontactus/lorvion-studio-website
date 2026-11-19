/**
 * The operator's page (EUNGARAGE 2.0, PART 24): guestbook moderation and
 * replies, starlight-server stars, the moderation switch, the audit log.
 *
 * Sign-in is Supabase Auth's emailed one-time code; the access token lives in
 * sessionStorage (gone with the tab). Every action is an RPC that checks
 * is_admin() on the server — this page hides nothing it relies on hiding.
 * Everything shown is escaped.
 */
import { esc } from '@/render/pages'
import { auth, backend, friendly, rpc } from '@/systems/backend'

const TOKEN = 'eungarage:admin-token'

interface GbRow { id: number; nickname: string; message: string; sticker: string; status: string; reply: string | null; reports: number; created_at: string }
interface StarRow { code: string; kind: string; name: string; message: string | null; color: string; grade: number; status: string; is_public: boolean; reports: number; created_at: string }
interface AuditRow { actor: string | null; action: string; target: string | null; detail: unknown; at: string }

const t = (iso: string): string => iso.replace('T', ' ').slice(0, 16)

export function gbRowHtml(r: GbRow): string {
  return `<li class="adm-row" data-gb="${r.id}">
    <p><b>${esc(r.nickname)}</b> <small>#${r.id} · ${esc(r.status)} · 신고 ${r.reports} · ${esc(t(r.created_at))}</small></p>
    <p class="adm-msg">${esc(r.message)}</p>
    ${r.reply ? `<p class="adm-reply">답글: ${esc(r.reply)}</p>` : ''}
    <div class="adm-actions">
      <button type="button" data-gb-act="approved">승인</button>
      <button type="button" data-gb-act="hidden">숨김</button>
      <button type="button" data-gb-act="pending">대기로</button>
      <button type="button" data-gb-act="delete" class="adm-danger">삭제</button>
      <label class="adm-inline">답글 <input data-gb-reply maxlength="300" value="${esc(r.reply ?? '')}"></label>
      <button type="button" data-gb-act="reply">답글 저장</button>
    </div>
  </li>`
}

export function starRowHtml(s: StarRow): string {
  return `<li class="adm-row" data-star="${esc(s.code)}">
    <p><b>${esc(s.name)}</b> <small>${esc(s.code)} · ${esc(s.kind)} · ${esc(s.color)} · ${s.grade}등급 · ${esc(s.status)} · ${s.is_public ? '공개' : '비공개'} · 신고 ${s.reports}</small></p>
    ${s.message ? `<p class="adm-msg">${esc(s.message)}</p>` : ''}
    <div class="adm-actions">
      <button type="button" data-star-act="approved">공개 승인</button>
      <button type="button" data-star-act="hidden">숨김</button>
      <button type="button" data-star-act="private">${s.is_public ? '비공개로' : '공개로'}</button>
      <button type="button" data-star-act="delete" class="adm-danger">삭제</button>
    </div>
  </li>`
}

export function mountAdmin(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>('[data-admin]')
  if (!host) return undefined
  if (!backend.configured) {
    host.innerHTML = '<p class="adm-note">서버가 아직 연결되지 않았어요. 연결 방법은 저장소의 docs/EUNGARAGE_2_0.md 「Supabase 연결에 필요한 것」에 있어요.</p>'
    return undefined
  }
  let token: string | null = null
  try { token = sessionStorage.getItem(TOKEN) } catch { token = null }
  let gbStatus = 'pending'
  let stars: StarRow[] = []

  const say = (msg: string): void => {
    const s = host.querySelector('[data-adm-status]')
    if (s) s.textContent = msg
  }

  const login = (): void => {
    host.innerHTML = `
      <form class="adm-login" data-adm-login>
        <label>관리자 이메일 <input type="email" name="email" required autocomplete="email"></label>
        <button type="submit" data-step="send">코드 받기</button>
        <label hidden data-code>메일로 받은 6자리 코드 <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label>
        <button type="submit" hidden data-step="verify">로그인</button>
        <p data-adm-status role="status"></p>
      </form>`
    const form = host.querySelector<HTMLFormElement>('[data-adm-login]')!
    let sent = false
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const f = new FormData(form)
      const email = String(f.get('email') ?? '').trim()
      try {
        if (!sent) {
          await auth.sendCode(email)
          sent = true
          form.querySelector<HTMLElement>('[data-code]')!.hidden = false
          form.querySelector<HTMLElement>('[data-step="verify"]')!.hidden = false
          form.querySelector<HTMLElement>('[data-step="send"]')!.hidden = true
          say('메일로 코드를 보냈어요.')
          return
        }
        token = await auth.verify(email, String(f.get('code') ?? '').trim())
        try { sessionStorage.setItem(TOKEN, token) } catch { /* this tab only */ }
        await panel()
      } catch (err) {
        say(friendly(err))
      }
    })
  }

  const panel = async (): Promise<void> => {
    const ok = await rpc<boolean>('is_admin', {}, token ?? undefined).catch(() => false)
    if (!ok) {
      try { sessionStorage.removeItem(TOKEN) } catch { /* ignore */ }
      token = null
      login()
      say('이 계정에는 관리자 권한이 없어요.')
      return
    }
    host.innerHTML = `
      <p data-adm-status role="status"></p>
      <section class="adm-sec"><h2>방명록</h2>
        <div class="adm-tabs" role="group" aria-label="상태">${['pending', 'approved', 'hidden'].map((s) => `<button type="button" data-gb-filter="${s}" aria-pressed="${s === gbStatus}">${{ pending: '승인 대기', approved: '공개', hidden: '숨김' }[s]}</button>`).join('')}</div>
        <label class="adm-inline">새 글 바로 공개 <input type="checkbox" data-moderation></label>
        <ol class="adm-list" data-gb-list></ol>
      </section>
      <section class="adm-sec"><h2>별 발급 (테스트 · 운영자 이벤트)</h2>
        <form class="adm-star-form" data-star-form>
          <label>이름 <input name="name" maxlength="24" required></label>
          <label>메시지 <input name="message" maxlength="120"></label>
          <label>색 <select name="color">${['gold', 'pink', 'mint', 'sky', 'lavender', 'white'].map((c) => `<option>${c}</option>`).join('')}</select></label>
          <label>등급 <select name="grade"><option value="1">1 반짝별</option><option value="2">2 리본별</option><option value="3">3 슈퍼별</option></select></label>
          <label>종류 <select name="kind"><option value="event">운영자 이벤트</option><option value="supporter">후원자 (수동 발급)</option></select></label>
          <label class="adm-inline"><input type="checkbox" name="public" checked> 공개</label>
          <button type="submit">별 발급</button>
        </form>
        <ol class="adm-list" data-star-list></ol>
      </section>
      <section class="adm-sec"><h2>운영 기록</h2><ol class="adm-list adm-audit" data-audit></ol></section>
      <p><button type="button" data-logout>로그아웃</button></p>`
    await Promise.all([loadGb(), loadStars(), loadAudit()])
  }

  const call = <T>(name: string, args: Record<string, unknown> = {}): Promise<T> => rpc<T>(name, args, token ?? undefined)

  const loadGb = async (): Promise<void> => {
    const rows = await call<GbRow[]>('admin_guestbook', { p_status: gbStatus, p_limit: 200 })
    host.querySelector('[data-gb-list]')!.innerHTML = rows.map(gbRowHtml).join('') || '<li>없어요.</li>'
  }
  const loadStars = async (): Promise<void> => {
    stars = await call<StarRow[]>('admin_stars')
    host.querySelector('[data-star-list]')!.innerHTML = stars.map(starRowHtml).join('') || '<li>아직 별이 없어요.</li>'
  }
  const loadAudit = async (): Promise<void> => {
    const rows = await call<AuditRow[]>('admin_audit', { p_limit: 100 })
    host.querySelector('[data-audit]')!.innerHTML = rows.map((r) => `<li><small>${esc(t(r.at))}</small> ${esc(r.action)} ${esc(r.target ?? '')}</li>`).join('')
  }

  const onClick = async (e: MouseEvent): Promise<void> => {
    const el = e.target as HTMLElement
    try {
      const f = el.closest<HTMLElement>('[data-gb-filter]')
      if (f) {
        gbStatus = f.dataset['gbFilter'] ?? 'pending'
        for (const b of host.querySelectorAll('[data-gb-filter]')) b.setAttribute('aria-pressed', String(b === f))
        await loadGb()
        return
      }
      const g = el.closest<HTMLElement>('[data-gb-act]')
      if (g) {
        const row = g.closest<HTMLElement>('[data-gb]')!
        const id = Number(row.dataset['gb'])
        const act = g.dataset['gbAct']
        if (act === 'delete') {
          if (!window.confirm(`#${id} 글을 완전히 지울까요? 되돌릴 수 없어요.`)) return
          await call('admin_guestbook_delete', { p_id: id })
        } else if (act === 'reply') {
          await call('admin_guestbook_reply', { p_id: id, p_reply: row.querySelector<HTMLInputElement>('[data-gb-reply]')?.value ?? '' })
        } else {
          await call('admin_guestbook_set', { p_id: id, p_status: act })
        }
        say('저장했어요.')
        await Promise.all([loadGb(), loadAudit()])
        return
      }
      const s = el.closest<HTMLElement>('[data-star-act]')
      if (s) {
        const code = s.closest<HTMLElement>('[data-star]')!.dataset['star']!
        const cur = stars.find((x) => x.code === code)
        if (!cur) return
        const act = s.dataset['starAct']
        if (act === 'delete') {
          if (!window.confirm(`${code} 별을 지울까요? 되돌릴 수 없어요.`)) return
          await call('admin_star_delete', { p_code: code })
        } else {
          await call('admin_star_update', {
            p_code: code, p_name: cur.name, p_message: cur.message ?? '',
            p_status: act === 'private' ? cur.status : act, p_public: act === 'private' ? !cur.is_public : cur.is_public,
          })
        }
        say('저장했어요.')
        await Promise.all([loadStars(), loadAudit()])
        return
      }
      if (el.closest('[data-logout]')) {
        try { sessionStorage.removeItem(TOKEN) } catch { /* ignore */ }
        token = null
        login()
      }
    } catch (err) {
      say(friendly(err))
    }
  }
  const onSubmit = async (e: SubmitEvent): Promise<void> => {
    const form = (e.target as HTMLElement).closest<HTMLFormElement>('[data-star-form]')
    if (!form) return
    e.preventDefault()
    const f = new FormData(form)
    try {
      const r = await call<{ code: string }[]>('admin_star_issue', {
        p_name: String(f.get('name') ?? ''), p_message: String(f.get('message') ?? ''), p_color: String(f.get('color') ?? 'gold'),
        p_grade: Number(f.get('grade') ?? 1), p_kind: String(f.get('kind') ?? 'event'), p_public: f.get('public') === 'on', p_support_ref: null,
      })
      say(`발급했어요: ${r[0]?.code ?? ''}`)
      form.reset()
      await Promise.all([loadStars(), loadAudit()])
    } catch (err) {
      say(friendly(err))
    }
  }
  const onChange = async (e: Event): Promise<void> => {
    const c = (e.target as HTMLElement).closest<HTMLInputElement>('[data-moderation]')
    if (!c) return
    try {
      await call('admin_setting', { p_key: 'guestbook_moderation', p_value: c.checked ? 'off' : 'on' })
      say(c.checked ? '이제 새 글이 바로 공개돼요.' : '이제 새 글은 승인 뒤에 공개돼요.')
    } catch (err) {
      say(friendly(err))
    }
  }
  host.addEventListener('click', onClick)
  host.addEventListener('submit', onSubmit)
  host.addEventListener('change', onChange)
  if (token) void panel()
  else login()
  return () => {
    host.removeEventListener('click', onClick)
    host.removeEventListener('submit', onSubmit)
    host.removeEventListener('change', onChange)
  }
}
