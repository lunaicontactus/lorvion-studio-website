/**
 * STARS (EUNGARAGE 2.0, PART 15): the garage telescope's sky, on its own page,
 * with the starlight server's stars on top.
 *
 * The sky is the existing one (src/scenes/sky.ts — the same field the secret
 * storage's telescope shows), loaded on demand. Supporter and event stars come
 * from the server (`stars_list`): fixed places issued there, the same for
 * every visitor. A star opens a card (name, message, date, share, find); the
 * search finds by name or code and flies the view to it; "사진 저장" saves
 * what is on screen with the EUNGARAGE mark — only public names and messages
 * are ever drawn, because only those are ever sent.
 *
 * With no server, the sky is still the sky, and the page says the starlight
 * server is not connected yet. Nothing is drawn that is not real.
 */
import { esc } from '@/render/pages'
import { motion } from '@/systems/motion'
import { backend, friendly, rpc, type SkyStar } from '@/systems/backend'

const COLOURS: Readonly<Record<SkyStar['color'], string>> = {
  gold: '#ffe08a', pink: '#ff91c8', mint: '#9ff0cf', sky: '#a8d4ff', lavender: '#d7b7ff', white: '#ffffff',
}

const day = (iso: string): string => iso.slice(0, 10).replace(/-/g, '.')

export function mountStars(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>('[data-stars]')
  if (!host) return undefined
  const on = backend.configured
  host.innerHTML = `
    <div class="sky-frame" data-sky-frame>
      <div class="sky-view" data-sky-view>
        <canvas class="sky-canvas" data-sky-canvas aria-hidden="true"></canvas>
        <div class="sky-stars" data-sky-stars role="list" aria-label="기념 별"></div>
      </div>
      <div class="sky-card" data-sky-card hidden role="dialog" aria-modal="false" aria-labelledby="sky-card-name"></div>
    </div>
    <div class="sky-tools">
      <form class="sky-search" data-sky-search role="search">
        <label class="visually-hidden" for="sky-q">별 이름 또는 별 코드</label>
        <input id="sky-q" name="q" maxlength="24" placeholder="별 이름 또는 STAR-코드" ${on ? '' : 'disabled'} autocomplete="off">
        <button type="submit" ${on ? '' : 'disabled'}>별 찾기</button>
      </form>
      <button type="button" class="sky-save" data-sky-save>지금 하늘 사진 저장</button>
    </div>
    <p class="sky-status" data-sky-status role="status">${on ? '' : '별빛 서버는 아직 연결 전이에요. 지금 보이는 하늘은 차고 망원경의 하늘이에요. 후원자 별은 서버가 열리면 여기에 떠요.'}</p>
    <ul class="sky-results" data-sky-results></ul>
    <section class="sky-about" aria-labelledby="sky-about-h">
      <h2 id="sky-about-h">별에 대해</h2>
      <ul>
        <li>여기 있는 별은 EUNGARAGE 사이트 안의 <b>가상 기념 별</b>이에요. 실제 하늘의 천체가 아니며, 천체의 이름이나 소유권과는 관계가 없어요.</li>
        <li>후원으로 별을 다는 기능은 운영 정책과 결제 방식이 확정된 뒤에 열려요. 지금은 판매하지 않아요.</li>
        <li>별의 이름과 메시지는 공개에 동의한 내용만 보여요.</li>
      </ul>
    </section>`

  const view = host.querySelector<HTMLElement>('[data-sky-view]')!
  const canvas = host.querySelector<HTMLCanvasElement>('[data-sky-canvas]')!
  const layer = host.querySelector<HTMLElement>('[data-sky-stars]')!
  const card = host.querySelector<HTMLElement>('[data-sky-card]')!
  const status = host.querySelector<HTMLElement>('[data-sky-status]')!
  const results = host.querySelector<HTMLElement>('[data-sky-results]')!
  const search = host.querySelector<HTMLFormElement>('[data-sky-search]')!
  let stars: SkyStar[] = []
  let sky: { stop(): void; resize(): void } | null = null
  let gone = false
  let selected: SkyStar | null = null

  void import('@/scenes/sky').then(({ mountSky }) => {
    if (gone) return
    const h = mountSky(canvas, { reduced: () => motion.reduced })
    h.resize()
    h.start()
    sky = h
  })

  const draw = (): void => {
    layer.innerHTML = stars.map((s) => `
      <button type="button" class="sky-star" role="listitem" data-code="${esc(s.code)}" data-grade="${s.grade}" data-kind="${s.kind}"
        style="left:${(s.x * 100).toFixed(2)}%;top:${(s.y * 100).toFixed(2)}%;--c:${COLOURS[s.color] ?? '#ffe08a'}"
        aria-label="${esc(s.name)} 별${s.kind === 'event' ? ' (운영자 이벤트 별)' : ''}"><span aria-hidden="true"></span></button>`).join('')
  }

  const focusOn = (s: SkyStar | null): void => {
    // "The camera moves to the star": the view zooms in about it, centred.
    if (!s || motion.reduced) {
      view.style.transform = ''
    } else {
      const z = 1.8
      const tx = (0.5 - s.x) * 100 * z
      const ty = (0.5 - s.y) * 100 * z
      view.style.transform = `translate(${tx}%, ${ty}%) scale(${z})`
    }
    for (const b of layer.querySelectorAll<HTMLElement>('.sky-star')) b.classList.toggle('is-selected', !!s && b.dataset['code'] === s.code)
  }

  const open = (s: SkyStar): void => {
    selected = s
    focusOn(s)
    const link = `${location.origin}/stars.html#${encodeURIComponent(s.code)}`
    card.innerHTML = `
      <p class="sky-card__kind">${s.kind === 'event' ? '운영자 이벤트 별' : '응원의 별'}</p>
      <h2 id="sky-card-name">${esc(s.name)}</h2>
      ${s.message ? `<p class="sky-card__msg">${esc(s.message)}</p>` : ''}
      <p class="sky-card__meta"><span>${esc(s.code)}</span> · <time datetime="${esc(s.created_at)}">${day(s.created_at)}</time></p>
      <div class="sky-card__actions">
        <button type="button" data-sky-share>공유 링크 복사</button>
        <button type="button" data-sky-close>닫기</button>
      </div>`
    card.hidden = false
    card.dataset['link'] = link
    card.querySelector<HTMLButtonElement>('[data-sky-close]')?.focus()
    if (location.hash !== `#${s.code}`) history.replaceState(null, '', `#${s.code}`)
  }
  const close = (): void => {
    card.hidden = true
    selected = null
    focusOn(null)
  }

  const load = async (): Promise<void> => {
    if (!on) return
    try {
      stars = await rpc<SkyStar[]>('stars_list')
      draw()
      status.textContent = stars.length ? `지금 하늘에 기념 별 ${stars.length}개가 떠 있어요.` : '아직 하늘에 기념 별이 없어요.'
      const want = decodeURIComponent(location.hash.slice(1)).toUpperCase()
      const s = stars.find((x) => x.code === want)
      if (s) open(s)
    } catch (e) {
      status.textContent = friendly(e)
    }
  }

  const onClick = async (e: MouseEvent): Promise<void> => {
    const t = e.target as HTMLElement
    const b = t.closest<HTMLElement>('.sky-star')
    if (b) {
      const s = stars.find((x) => x.code === b.dataset['code'])
      if (s) open(s)
      return
    }
    if (t.closest('[data-sky-close]')) return close()
    if (t.closest('[data-sky-share]')) {
      const btn = t.closest<HTMLButtonElement>('[data-sky-share]')!
      try {
        await navigator.clipboard.writeText(card.dataset['link'] ?? location.href)
        btn.textContent = '복사했어요!'
      } catch {
        btn.textContent = card.dataset['link'] ?? ''
      }
      return
    }
    const r = t.closest<HTMLElement>('[data-result]')
    if (r) {
      const s = stars.find((x) => x.code === r.dataset['result'])
      if (s) open(s)
      return
    }
    if (t.closest('[data-sky-save]')) void savePhoto()
  }

  const onSearch = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault()
    const q = String(new FormData(search).get('q') ?? '').trim()
    if (!q || !on) return
    try {
      const found = await rpc<SkyStar[]>('star_find', { p_query: q })
      results.innerHTML = found.length
        ? found.map((s) => `<li><button type="button" data-result="${esc(s.code)}">${esc(s.name)} <span>${esc(s.code)}</span></button></li>`).join('')
        : '<li>그런 별은 아직 없어요.</li>'
      if (found.length === 1) open(found[0]!)
    } catch (err) {
      results.innerHTML = `<li>${esc(friendly(err))}</li>`
    }
  }

  /** The view as a picture: the sky canvas, the public stars, the mark. */
  const savePhoto = async (): Promise<void> => {
    const w = canvas.width || 1200
    const h = canvas.height || 800
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0b0a1d'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(canvas, 0, 0, w, h)
    for (const s of stars) {
      const x = s.x * w
      const y = s.y * h
      const r = (2 + s.grade) * (w / 600)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
      g.addColorStop(0, COLOURS[s.color] ?? '#ffe08a')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r * 4, 0, Math.PI * 2)
      ctx.fill()
    }
    const unit = w / 100
    ctx.fillStyle = 'rgba(255,249,252,.92)'
    ctx.font = `700 ${Math.round(unit * 2.6)}px system-ui, sans-serif`
    ctx.textBaseline = 'bottom'
    ctx.fillText('EUNGARAGE · Little Garage, Big Worlds.', unit * 3, h - unit * 3)
    if (selected) {
      ctx.font = `800 ${Math.round(unit * 3.4)}px system-ui, sans-serif`
      ctx.fillText(`★ ${selected.name}`, unit * 3, h - unit * 7)
    }
    const url = out.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = selected ? `eungarage-star-${selected.code}.png` : 'eungarage-night-sky.png'
    document.body.append(a)
    a.click()
    a.remove()
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !card.hidden) close()
  }
  const onResize = (): void => sky?.resize()
  host.addEventListener('click', onClick)
  search.addEventListener('submit', onSearch)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
  void load()
  return () => {
    gone = true
    sky?.stop()
    host.removeEventListener('click', onClick)
    search.removeEventListener('submit', onSearch)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', onResize)
  }
}
