/**
 * Site navigation.
 *
 * The old menu button announced nothing, could not be closed with Escape, and
 * locked body scroll in a way that survived the menu closing. Fixed here once,
 * for every page, since all six pages share this markup.
 */
const FOCUSABLE = 'a[href], button:not([disabled])'

export function mountNav(root: ParentNode = document): () => void {
  const toggle = root.querySelector<HTMLButtonElement>('.menu-toggle')
  const links = root.querySelector<HTMLElement>('.nav-links')
  const nav = root.querySelector<HTMLElement>('.site-nav')
  const off: (() => void)[] = []

  if (nav) {
    const onScroll = (): void => {
      nav.classList.toggle('scrolled', window.scrollY > 30)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    off.push(() => window.removeEventListener('scroll', onScroll))
    onScroll()
  }

  if (toggle && links) {
    if (!links.id) links.id = 'primaryNav'
    toggle.setAttribute('aria-controls', links.id)
    toggle.setAttribute('aria-expanded', 'false')

    const setOpen = (open: boolean): void => {
      toggle.classList.toggle('open', open)
      links.classList.toggle('open', open)
      toggle.setAttribute('aria-expanded', String(open))
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기')
      document.body.classList.toggle('is-nav-open', open)
      if (open) links.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    }
    const isOpen = (): boolean => links.classList.contains('open')

    const onToggle = (): void => setOpen(!isOpen())
    toggle.addEventListener('click', onToggle)
    off.push(() => toggle.removeEventListener('click', onToggle))

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false)
        toggle.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    off.push(() => document.removeEventListener('keydown', onKey))

    const onLink = (): void => setOpen(false)
    for (const a of links.querySelectorAll('a')) {
      a.addEventListener('click', onLink)
      off.push(() => a.removeEventListener('click', onLink))
    }
  }

  return () => {
    for (const fn of off) fn()
    document.body.classList.remove('is-nav-open')
  }
}
