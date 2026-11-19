/**
 * GUESTBOOK (EUNGARAGE 2.0, PART 13): leave a note, read the approved ones.
 *
 * Everything a visitor writes is shown back through `esc` — never as HTML.
 * Success is only said after the server has said it: a note held for review
 * says so ("승인 대기 중"), and a refused one says why. With no server
 * configured the form is shown but switched off, with the reason.
 */
import { esc } from '@/render/pages'
import { backend, clientId, friendly, rpc, STICKERS, type GuestbookEntry, type Sticker } from '@/systems/backend'

const PAGE = 10
const MAX = 200

const glyph = (s: Sticker): string => STICKERS.find((x) => x.id === s)?.glyph ?? '♥'
const when = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function entryHtml(e: GuestbookEntry): string {
  return `
      <li class="gb-note" data-entry="${e.id}" data-sticker="${esc(e.sticker)}">
        <span class="gb-note__sticker" aria-label="${esc(STICKERS.find((x) => x.id === e.sticker)?.label ?? '')} 스티커">${glyph(e.sticker)}</span>
        <p class="gb-note__head"><b>${esc(e.nickname)}</b> <time datetime="${esc(e.created_at)}">${when(e.created_at)}</time></p>
        <p class="gb-note__msg">${esc(e.message)}</p>
        ${e.reply ? `<div class="gb-reply"><img src="/assets/images/crew-mochi/momo/momo_portrait.webp" alt="" width="40" height="40" loading="lazy"><p><b>운영자 답글</b> ${esc(e.reply)}</p></div>` : ''}
        <button type="button" class="gb-note__report" data-report="${e.id}">신고</button>
      </li>`
}

export function mountGuestbook(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>('[data-guestbook]')
  if (!host) return undefined
  const on = backend.configured
  host.innerHTML = `
    <form class="gb-form" data-gb-form novalidate>
      ${on ? '' : '<p class="gb-offline" role="note"><b>방명록 준비 중</b> 방명록 서버를 연결하는 중이에요. 연결되면 여기서 바로 글을 남길 수 있어요.</p>'}
      <fieldset ${on ? '' : 'disabled'}>
        <legend class="visually-hidden">방명록 쓰기</legend>
        <label class="gb-field">닉네임 <input name="nickname" maxlength="20" required autocomplete="nickname" placeholder="예: 별별"></label>
        <label class="gb-field">메시지 <textarea name="message" maxlength="${MAX}" required rows="3" placeholder="차고에 남길 한마디 (200자까지)"></textarea></label>
        <p class="gb-count" aria-live="polite"><span data-gb-count>0</span> / ${MAX}</p>
        <div class="gb-stickers" role="radiogroup" aria-label="스티커 고르기">
          ${STICKERS.map((s, i) => `<label class="gb-sticker"><input type="radio" name="sticker" value="${s.id}"${i === 0 ? ' checked' : ''}><span aria-hidden="true">${s.glyph}</span><span class="visually-hidden">${s.label}</span></label>`).join('')}
        </div>
        <button type="submit" class="gb-submit">편지 넣기 <span aria-hidden="true">✉</span></button>
        <p class="gb-status" data-gb-status role="status"></p>
      </fieldset>
    </form>
    <h2 class="gb-h">남겨진 편지</h2>
    <ol class="gb-list" data-gb-list></ol>
    <p class="gb-more-wrap"><button type="button" class="gb-more" data-gb-more hidden>더 보기</button></p>
    <p class="gb-empty" data-gb-empty hidden>${on ? '아직 공개된 편지가 없어요. 첫 편지를 남겨 주세요!' : '서버가 연결되면 편지가 여기에 보여요.'}</p>`

  const form = host.querySelector<HTMLFormElement>('[data-gb-form]')!
  const list = host.querySelector<HTMLElement>('[data-gb-list]')!
  const more = host.querySelector<HTMLButtonElement>('[data-gb-more]')!
  const empty = host.querySelector<HTMLElement>('[data-gb-empty]')!
  const status = host.querySelector<HTMLElement>('[data-gb-status]')!
  const count = host.querySelector<HTMLElement>('[data-gb-count]')!
  let oldest: number | null = null
  let busy = false

  const load = async (): Promise<void> => {
    if (!on) {
      empty.hidden = false
      return
    }
    try {
      const rows = await rpc<GuestbookEntry[]>('guestbook_list', { p_before: oldest, p_limit: PAGE })
      list.insertAdjacentHTML('beforeend', rows.map(entryHtml).join(''))
      if (rows.length) oldest = rows[rows.length - 1]!.id
      more.hidden = rows.length < PAGE
      empty.hidden = list.children.length > 0
    } catch (e) {
      empty.hidden = false
      empty.textContent = friendly(e)
    }
  }

  const onInput = (): void => {
    count.textContent = String((form.elements.namedItem('message') as HTMLTextAreaElement).value.length)
  }
  const onSubmit = async (ev: SubmitEvent): Promise<void> => {
    ev.preventDefault()
    if (!on || busy) return
    const f = new FormData(form)
    const nickname = String(f.get('nickname') ?? '').trim()
    const message = String(f.get('message') ?? '').trim()
    const sticker = String(f.get('sticker') ?? 'heart')
    if (!nickname || !message) {
      status.textContent = '닉네임과 메시지를 적어 주세요.'
      return
    }
    busy = true
    form.classList.add('is-sending')
    status.textContent = '보내는 중…'
    try {
      const rows = await rpc<{ id: number; status: string }[]>('guestbook_submit', { p_nickname: nickname, p_message: message, p_sticker: sticker, p_client: clientId() })
      const st = rows[0]?.status
      form.classList.add('is-posted')
      setTimeout(() => form.classList.remove('is-posted'), 900)
      status.textContent = st === 'approved' ? '편지가 붙었어요! 고마워요 ♡' : '편지를 받았어요! 운영자가 확인한 뒤에 공개돼요. (승인 대기 중)'
      form.reset()
      onInput()
      if (st === 'approved') {
        list.innerHTML = ''
        oldest = null
        await load()
      }
    } catch (e) {
      status.textContent = friendly(e)
    } finally {
      busy = false
      form.classList.remove('is-sending')
    }
  }
  const onClick = async (ev: MouseEvent): Promise<void> => {
    const t = ev.target as HTMLElement
    if (t.closest('[data-gb-more]')) {
      await load()
      return
    }
    const rep = t.closest<HTMLButtonElement>('[data-report]')
    if (!rep || !on) return
    const reason = window.prompt('신고 사유를 적어 주세요 (선택)', '') ?? null
    if (reason === null) return
    try {
      await rpc('guestbook_report', { p_id: Number(rep.dataset['report']), p_reason: reason, p_client: clientId() })
      rep.textContent = '신고됨'
      rep.disabled = true
    } catch (e) {
      rep.textContent = friendly(e)
    }
  }
  form.addEventListener('input', onInput)
  form.addEventListener('submit', onSubmit)
  host.addEventListener('click', onClick)
  void load()
  return () => {
    form.removeEventListener('input', onInput)
    form.removeEventListener('submit', onSubmit)
    host.removeEventListener('click', onClick)
  }
}
