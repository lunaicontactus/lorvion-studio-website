/**
 * The minihompy frame around the garage (EUNGARAGE 2.0, PART 2 / the
 * approved mockups): a profile card on the left, quick tabs on the right,
 * and the room itself in the middle as the picture in the frame.
 *
 * Nothing in the room changes. The garage measures its own box
 * (src/scenes/garage.ts, ResizeObserver on [data-garage]), so framing it is a
 * matter of giving that box an inset on a wide screen (src/styles/
 * minihompy.css); the camera, the hit areas, the crew's floor and the panels
 * all follow. On a phone, a tablet or a short window there is no frame and
 * the room is the whole screen, as before.
 *
 * Everything on the card is real: the crew's own lines, real pages, the
 * garage radio. The visitor count is shown only when the server answers with
 * one — never a made-up number — and the support button says it is not open.
 */
import './../styles/minihompy.css'
import { CHARACTERS } from '@/data/characters'
import { backend, clientId, rpc } from '@/systems/backend'

export interface MinihompyOptions {
  /** Open a thing in the room, the same as touching it. */
  readonly openThing: (id: string) => void
}

const VISIT_KEY = 'eungarage:visit-counted'

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** One crew member a day, the same for everybody that day (Asia/Seoul). */
function crewOfTheDay(now = new Date()): (typeof CHARACTERS)[number] {
  const seoul = new Date(now.getTime() + 9 * 3600_000)
  const day = Math.floor(seoul.getTime() / 86_400_000)
  return CHARACTERS[day % CHARACTERS.length]!
}

export function mountMinihompy(o: MinihompyOptions): () => void {
  const garage = document.querySelector<HTMLElement>('[data-garage]')
  if (!garage || document.querySelector('[data-minihompy]')) return () => undefined
  const who = crewOfTheDay()
  const shell = document.createElement('div')
  shell.className = 'minihompy'
  shell.dataset['minihompy'] = ''
  shell.innerHTML = `
    <aside class="mh-card" aria-label="EUNGARAGE 미니홈피">
      <p class="mh-card__title">EUNGARAGE <span aria-hidden="true">♡</span></p>
      <p class="mh-card__tag">Little Garage, Big Worlds.</p>
      <figure class="mh-card__photo">
        <img src="/assets/images/crew-mochi/minihompy_garage.webp" alt="밤의 은가라지 셔터" width="480" height="423" loading="lazy" decoding="async">
      </figure>
      <p class="mh-card__about">게임과 이야기가 만들어지는<br>작은 차고, 은가라지입니다 <span aria-hidden="true">♡</span></p>
      <p class="mh-card__visits" data-mh-visits hidden></p>
      <section class="mh-card__today" aria-labelledby="mh-today-h">
        <h2 id="mh-today-h" class="mh-card__label">오늘의 한마디 <span aria-hidden="true">♡</span></h2>
        <p class="mh-card__line">
          <img src="${esc(who.art.portrait ?? who.art.front)}" alt="" width="48" height="48" loading="lazy" decoding="async">
          <span><b>${esc(who.nameKo)}</b> “${esc(who.line ?? '')}”</span>
        </p>
      </section>
      <button type="button" class="mh-card__radio" data-mh-radio>
        <span class="mh-card__radio-icon" aria-hidden="true">♫</span>
        <span><b>EUNGARAGE Radio</b><small>차고 라디오 켜기</small></span>
      </button>
      <nav class="mh-card__links" aria-label="미니홈피 메뉴">
        <a href="/diary.html"><span aria-hidden="true">✎</span>개발일지</a>
        <a href="/crew.html"><span aria-hidden="true">✿</span>크루 소개</a>
        <a href="/guestbook.html"><span aria-hidden="true">✉</span>방명록</a>
        <a href="/contact.html"><span aria-hidden="true">☏</span>문의하기</a>
      </nav>
    </aside>
    <nav class="mh-tabs" aria-label="바로 가기">
      <a class="mh-tab" href="/arcade.html"><span class="mh-tab__icon" aria-hidden="true">🎮</span><b>게임하기</b><small>ARCADE</small></a>
      <a class="mh-tab" href="/stars.html"><span class="mh-tab__icon" aria-hidden="true">⭐</span><b>별 보러가기</b><small>STARS</small></a>
      <a class="mh-tab" href="/guestbook.html"><span class="mh-tab__icon" aria-hidden="true">💌</span><b>방명록</b><small>GUESTBOOK</small></a>
      <a class="mh-tab" href="/radio.html"><span class="mh-tab__icon" aria-hidden="true">📻</span><b>라디오 듣기</b><small>RADIO</small></a>
      <span class="mh-tab mh-tab--off" aria-disabled="true"><b>후원하기</b><small>준비 중</small></span>
    </nav>`
  garage.before(shell)
  document.documentElement.classList.add('has-minihompy')

  const onClick = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('[data-mh-radio]')) o.openThing('radio')
  }
  shell.addEventListener('click', onClick)

  // The count only from the server, once per visit; with no server, nothing.
  let gone = false
  const visits = shell.querySelector<HTMLElement>('[data-mh-visits]')!
  if (backend.configured) {
    let counted = false
    try { counted = sessionStorage.getItem(VISIT_KEY) === '1' } catch { /* private mode */ }
    const ask = counted
      ? rpc<{ today: number; total: number }[]>('visit_counts')
      : rpc<{ today: number; total: number }[]>('visit_hit', { p_client: clientId() })
    ask.then((rows) => {
      const r = rows[0]
      if (gone || !r) return
      try { sessionStorage.setItem(VISIT_KEY, '1') } catch { /* private mode */ }
      visits.innerHTML = `<span>TODAY <b>${Number(r.today).toLocaleString('ko-KR')}</b></span><span>TOTAL <b>${Number(r.total).toLocaleString('ko-KR')}</b></span>`
      visits.hidden = false
    }).catch(() => { /* no number rather than a wrong one */ })
  }

  return () => {
    gone = true
    shell.removeEventListener('click', onClick)
    shell.remove()
    document.documentElement.classList.remove('has-minihompy')
  }
}
