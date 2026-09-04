/**
 * One modal controller for the whole site.
 *
 * Extracted from the old WORLD BLUEPRINT panels, which had already been through
 * several rounds of accessibility fixes: a hover preview must not claim to be a
 * dialog, a pinned panel must trap focus and hand it back, and Escape has to
 * work whichever way the panel was opened. Secret room, project panels and the
 * mini-game shell all reuse this rather than re-deriving it.
 */
import { motionDuration } from '@/systems/motion'

export type DialogMode = 'idle' | 'preview' | 'pinned'

export interface DialogParts {
  /** The element that owns the panel (a poster, a cabinet, a card). */
  readonly frame: HTMLElement
  readonly panel: HTMLElement
  readonly opener: HTMLElement
}

interface Current extends DialogParts {
  mode: DialogMode
}

const FOCUSABLE =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export class DialogController {
  #cur: Current | null = null
  #closeTimer: ReturnType<typeof setTimeout> | null = null
  #openTimer: ReturnType<typeof setTimeout> | null = null
  #off: (() => void)[] = []
  #closeMs: number

  constructor(closeMs = 420) {
    this.#closeMs = closeMs
    const onKey = (e: KeyboardEvent): void => {
      if (this.#cur?.mode !== 'pinned') return
      if (e.key === 'Escape') {
        e.stopPropagation()
        this.close(true)
        return
      }
      if (e.key === 'Tab') this.#trapFocus(e)
    }
    const onClick = (e: MouseEvent): void => {
      const cur = this.#cur
      if (cur?.mode !== 'pinned') return
      const t = e.target as Node
      if (cur.panel.contains(t) || cur.opener.contains(t)) return
      this.close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    this.#off.push(
      () => document.removeEventListener('keydown', onKey),
      () => document.removeEventListener('click', onClick),
    )
  }

  get mode(): DialogMode {
    return this.#cur?.mode ?? 'idle'
  }

  get current(): Readonly<DialogParts> | null {
    return this.#cur
  }

  /** Non-modal hover aid. Never announced as a dialog. */
  preview(parts: DialogParts, delayMs = 80): void {
    if (this.#cur?.mode === 'pinned') return // a pinned panel wins
    this.#clearCloseTimer()
    if (this.#cur?.frame === parts.frame && this.#cur.mode === 'preview') return
    this.#clearOpenTimer()
    this.#openTimer = setTimeout(
      () => this.#show(parts, 'preview'),
      motionDuration(delayMs),
    )
  }

  /** Leave the frame: close a preview after a grace period, never a pin. */
  endPreview(frame: HTMLElement, graceMs = 170): void {
    this.#clearOpenTimer()
    if (this.#cur?.frame === frame && this.#cur.mode === 'preview') {
      this.#closeTimer = setTimeout(() => this.close(false), graceMs)
    }
  }

  /** A real dialog: focus moves in and is trapped until it closes. */
  pin(parts: DialogParts): void {
    if (this.#cur?.frame === parts.frame && this.#cur.mode === 'pinned') {
      this.close(true)
      return
    }
    this.#show(parts, 'pinned')
  }

  close(returnFocus: boolean): void {
    const cur = this.#cur
    if (!cur) return
    this.#clearCloseTimer()
    this.#clearOpenTimer()
    const { panel, frame, opener, mode } = cur
    this.#cur = null

    panel.classList.remove('is-open', 'is-pinned')
    frame.classList.remove('is-dialog-active', 'is-dialog-pinned')
    opener.setAttribute('aria-expanded', 'false')
    this.#restoreAria(panel)

    const hide = (): void => {
      if (!panel.classList.contains('is-open')) panel.setAttribute('hidden', '')
      panel.removeEventListener('transitionend', hide)
    }
    panel.addEventListener('transitionend', hide)
    setTimeout(hide, this.#closeMs) // transitionend is not guaranteed

    if (returnFocus && mode === 'pinned') opener.focus()
  }

  destroy(): void {
    this.close(false)
    for (const fn of this.#off) fn()
    this.#off = []
  }

  #show(parts: DialogParts, mode: DialogMode): void {
    const { frame, panel, opener } = parts
    if (this.#cur && this.#cur.frame !== frame) this.close(false) // one at a time
    this.#clearCloseTimer()

    const wasVisible = this.#cur?.frame === frame && this.#cur.mode !== 'idle'
    this.#cur = { frame, panel, opener, mode }

    if (!wasVisible) {
      panel.removeAttribute('hidden')
      void panel.offsetWidth // reflow so the transition actually runs
      panel.classList.add('is-open')
      frame.classList.add('is-dialog-active')
    }

    if (mode === 'pinned') {
      panel.classList.add('is-pinned')
      frame.classList.add('is-dialog-pinned')
      panel.removeAttribute('aria-hidden')
      panel.setAttribute('role', 'dialog')
      panel.setAttribute('aria-modal', 'true')
      opener.setAttribute('aria-expanded', 'true')
      const first = panel.querySelector<HTMLElement>('[data-dialog-close]') ?? panel
      first.focus()
    } else {
      // A preview is decoration: hide it from assistive tech entirely.
      panel.setAttribute('aria-hidden', 'true')
      panel.removeAttribute('role')
      panel.removeAttribute('aria-modal')
      opener.setAttribute('aria-expanded', 'false')
    }
  }

  /** Back to the markup defaults; the panel is `hidden` immediately after. */
  #restoreAria(panel: HTMLElement): void {
    panel.removeAttribute('aria-hidden')
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
  }

  #trapFocus(e: KeyboardEvent): void {
    const panel = this.#cur?.panel
    if (!panel) return
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
    )
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (!panel.contains(document.activeElement)) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  #clearOpenTimer(): void {
    if (this.#openTimer !== null) {
      clearTimeout(this.#openTimer)
      this.#openTimer = null
    }
  }

  #clearCloseTimer(): void {
    if (this.#closeTimer !== null) {
      clearTimeout(this.#closeTimer)
      this.#closeTimer = null
    }
  }
}
