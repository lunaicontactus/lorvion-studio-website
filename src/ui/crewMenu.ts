/**
 * The little menu beside a character the visitor touched (EUNGARAGE 2.0,
 * PART 7.8): 말 걸기 · 쓰다듬기 · 들어 올리기 · 사원증 보기.
 *
 * The touch itself already does what it always did — the character stops,
 * looks up, reacts — so the menu is an offer, not a gate: ignoring it, a
 * click elsewhere, Escape or eight quiet seconds close it. Keyboard works the
 * same as the mouse: the first button takes focus, Tab stays inside, and
 * closing gives focus back to the character.
 */
import type { CharacterConfig } from '@/types/character'

export type CrewAct = 'talk' | 'pet' | 'lift'

export interface CrewMenuOptions {
  /** Do it; false when the character cannot right now (it is away, the room is paused). */
  readonly act: (kind: CrewAct) => boolean
  /** Where the badge lives. */
  readonly badgeHref: string
}

const IDLE_CLOSE_MS = 8000

let open: { close: () => void } | null = null

export function closeCrewMenu(): void {
  open?.close()
}

export function openCrewMenu(character: CharacterConfig, anchor: HTMLElement, o: CrewMenuOptions): void {
  open?.close()
  const menu = document.createElement('div')
  menu.className = 'crew-menu'
  menu.setAttribute('role', 'group')
  menu.setAttribute('aria-label', `${character.nameKo}와 놀기`)
  menu.dataset['crewMenu'] = character.id
  menu.style.setProperty('--accent', character.accent)
  menu.innerHTML = `
    <p class="crew-menu__name"><b>${character.nameKo}</b> <span>${character.roleKo ?? ''}</span></p>
    <div class="crew-menu__row">
      <button type="button" data-act="talk"><span aria-hidden="true">💬</span>말 걸기</button>
      <button type="button" data-act="pet"><span aria-hidden="true">♡</span>쓰다듬기</button>
      <button type="button" data-act="lift"><span aria-hidden="true">⇡</span>들어 올리기</button>
      <a href="${o.badgeHref}" data-act="badge"><span aria-hidden="true">🪪</span>사원증 보기</a>
    </div>`
  document.body.append(menu)

  const place = (): void => {
    const r = anchor.getBoundingClientRect()
    const m = menu.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    // Beside the character, not over its head: the head is where it talks.
    let left = r.right + 12
    if (left + m.width > vw - 8) left = r.left - m.width - 12
    let top = r.top + r.height * 0.35 - m.height / 2
    if (left < 8) {
      // No room either side (a phone): under the bar, above the head.
      left = Math.max(8, Math.min(vw - m.width - 8, r.left + r.width / 2 - m.width / 2))
      top = r.top - m.height - 56
    }
    top = Math.max(72, Math.min(vh - m.height - 8, top))
    menu.style.left = `${Math.round(left)}px`
    menu.style.top = `${Math.round(top)}px`
  }
  place()

  let timer = setTimeout(() => close(), IDLE_CLOSE_MS)
  const keep = (): void => {
    clearTimeout(timer)
    timer = setTimeout(() => close(), IDLE_CLOSE_MS)
  }

  const onClick = (e: MouseEvent): void => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')
    if (!b) return
    const kind = b.dataset['act']
    if (kind === 'badge') return // a real link
    e.preventDefault()
    keep()
    const done = o.act(kind as CrewAct)
    b.classList.toggle('is-refused', !done)
    if (done) {
      b.classList.add('is-done')
      setTimeout(() => b.classList.remove('is-done'), 600)
    }
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close(true)
      return
    }
    if (e.key !== 'Tab') return
    const items = [...menu.querySelectorAll<HTMLElement>('button, a')]
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length
    e.preventDefault()
    items[next]?.focus()
    keep()
  }
  const onOutside = (e: PointerEvent): void => {
    if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node)) close()
  }
  const onScroll = (): void => place()

  menu.addEventListener('click', onClick)
  menu.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('resize', onScroll)
  menu.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })

  function close(returnFocus = false): void {
    clearTimeout(timer)
    menu.removeEventListener('click', onClick)
    menu.removeEventListener('keydown', onKey)
    document.removeEventListener('pointerdown', onOutside, true)
    window.removeEventListener('resize', onScroll)
    const hadFocus = menu.contains(document.activeElement)
    menu.remove()
    if (returnFocus || hadFocus) anchor.focus({ preventScroll: true })
    if (open?.close === close) open = null
  }
  open = { close }
}
