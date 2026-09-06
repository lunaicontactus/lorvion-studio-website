/**
 * What the things in the room open.
 *
 * Every panel is built from the same felt shell so the world does not break
 * when something opens: no glass, no generic card, no black modal. Content
 * comes from the central registries — PROJECTS, SITE_CONFIG — never from
 * strings typed into a component, which is why the PC and the posters can
 * never disagree about a game.
 */
import { PROJECTS } from '@/data/projects'
import { SITE_CONFIG, contactRows } from '@/data/site'
import { CHARACTERS } from '@/data/characters'
import { save } from '@/systems/storage'
import { audio } from '@/systems/audio'
import { sound as soundPref } from '@/systems/sound'
import type { ProjectConfig } from '@/types/project'

export interface PanelHost {
  /** Called when a panel opens or closes, so the room can stop moving. */
  readonly onOpenChange?: (open: boolean) => void
  /** Something worth remembering happened. */
  readonly onProgress?: () => void
}

const SNACKS = [
  { id: 'tteok', label: '떡', en: 'Rice cake', tint: '#f2e2d8' },
  { id: 'gyul', label: '귤', en: 'Tangerine', tint: '#f0a45c' },
  { id: 'gwaja', label: '과자', en: 'Biscuit', tint: '#dcb178' },
  { id: 'ppang', label: '빵', en: 'Bread', tint: '#d9a36a' },
  { id: 'eumryo', label: '음료', en: 'Drink', tint: '#8fb6c8' },
] as const

/** Same snack all day: the date is the seed, not chance. */
function snackForToday(): (typeof SNACKS)[number] {
  const d = new Date()
  const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  return SNACKS[key % SNACKS.length]!
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Opening the fridge four times earns the clue. Not a dice roll. */
export const FRIDGE_CLUE_AT = 4

export const SECRET_REQUIREMENTS = {
  touched: ['pc', 'tv', 'fridge'],
  projects: 2,
} as const

export function secretMet(): boolean {
  const d = save.data
  const touchedAll = SECRET_REQUIREMENTS.touched.every((id) => d.touched.includes(id))
  return touchedAll && d.visitedProjects.length >= SECRET_REQUIREMENTS.projects && d.collection.includes('fridge-clue')
}

export class Panels {
  #root: HTMLElement
  #shell: HTMLElement
  #body: HTMLElement
  #title: HTMLElement
  #open = false
  #lastFocus: HTMLElement | null = null
  #host: PanelHost

  constructor(root: HTMLElement, host: PanelHost = {}) {
    this.#root = root
    this.#host = host
    root.className = 'panel-layer'
    root.hidden = true
    root.innerHTML = `
      <div class="panel-layer__scrim" data-panel-scrim></div>
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="panelTitle" data-panel>
        <div class="panel__inner">
          <h2 class="panel__title" id="panelTitle" data-panel-title></h2>
          <div class="panel__body" data-panel-body></div>
          <button class="panel__close" type="button" data-panel-close aria-label="닫기">✕</button>
        </div>
      </div>`
    this.#shell = root.querySelector('[data-panel]')!
    this.#body = root.querySelector('[data-panel-body]')!
    this.#title = root.querySelector('[data-panel-title]')!

    root.querySelector('[data-panel-close]')!.addEventListener('click', () => this.close())
    root.querySelector('[data-panel-scrim]')!.addEventListener('click', () => this.close())
    document.addEventListener('keydown', (e) => {
      if (!this.#open) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        this.close()
        return
      }
      if (e.key === 'Tab') this.#trap(e)
    })
  }

  get isOpen(): boolean {
    return this.#open
  }

  #trap(e: KeyboardEvent): void {
    const f = [...this.#shell.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])')].filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
    )
    if (!f.length) return
    const first = f[0]!
    const last = f[f.length - 1]!
    if (!this.#shell.contains(document.activeElement)) {
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

  #show(kind: string, title: string, html: string): void {
    this.#lastFocus = document.activeElement as HTMLElement | null
    this.#shell.dataset['kind'] = kind
    this.#title.textContent = title
    this.#body.innerHTML = html
    this.#root.hidden = false
    void this.#root.offsetWidth
    this.#root.classList.add('is-open')
    this.#open = true
    this.#host.onOpenChange?.(true)
    const focusable = this.#shell.querySelector<HTMLElement>('button, a[href]')
    focusable?.focus()
  }

  close(): void {
    if (!this.#open) return
    this.#open = false
    this.#root.classList.remove('is-open')
    const done = (): void => {
      if (!this.#open) this.#root.hidden = true
    }
    setTimeout(done, 320)
    this.#host.onOpenChange?.(false)
    this.#lastFocus?.focus()
  }

  /** Remember a touch, once. */
  #touch(id: string): void {
    if (save.data.touched.includes(id)) return
    save.update((d) => {
      d.touched.push(id)
    })
    this.#host.onProgress?.()
  }

  #collect(id: string): void {
    if (save.data.collection.includes(id)) return
    save.update((d) => {
      d.collection.push(id)
    })
    audio.play('discovery', 0.4)
    this.#host.onProgress?.()
  }

  // ── The PC: every game we have ─────────────────────────────────────────
  openPc(): void {
    this.#touch('pc')
    const list = PROJECTS.map(
      (p) => `
      <button class="hub__row" type="button" data-game="${p.id}">
        <span class="hub__thumb"${p.keyArt ? ` style="background-image:url('${p.keyArt}')"` : ' data-empty'}></span>
        <span class="hub__meta">
          <span class="hub__name">${p.title}</span>
          <span class="hub__tag">${p.tagline}</span>
        </span>
        <span class="hub__status" data-status="${p.status}">${p.status === 'comingSoon' ? 'COMING SOON' : p.platforms.join(' · ')}</span>
      </button>`,
    ).join('')
    this.#show(
      'pc',
      'EUNGARAGE',
      `<div class="crt">
         <div class="crt__screen">
           <p class="crt__boot">EUNGARAGE // GAME HUB</p>
           <div class="hub">${list}</div>
         </div>
       </div>`,
    )
    audio.play('keyboard', 0.35)
    for (const btn of this.#body.querySelectorAll<HTMLElement>('[data-game]')) {
      btn.addEventListener('click', () => {
        const id = btn.dataset['game']
        const project = PROJECTS.find((p) => p.id === id)
        if (project) this.openProject(project)
      })
    }
  }

  // ── A poster, or a game chosen in the hub ──────────────────────────────
  openProject(project: ProjectConfig): void {
    if (!save.data.visitedProjects.includes(project.id)) {
      save.update((d) => {
        d.visitedProjects.push(project.id)
      })
      this.#host.onProgress?.()
    }
    const links = project.links
      .map((l) => `<a class="proj__link" href="${l.href}">${l.label} <span aria-hidden="true">↗</span></a>`)
      .join('')
    this.#show(
      `project project--${project.world}`,
      project.title,
      `<div class="proj" style="--accent:${project.accent}">
         <div class="proj__art"${project.keyArt ? ` style="background-image:url('${project.keyArt}')"` : ' data-empty'}>
           ${project.keyArt ? '' : '<span class="proj__soon">COMING SOON</span>'}
         </div>
         <p class="proj__tag">${project.tagline}</p>
         <p class="proj__tag proj__tag--ko">${project.taglineKo}</p>
         <p class="proj__meta">${project.platforms.join(' · ')}${project.status === 'comingSoon' ? ' · COMING SOON' : ''}</p>
         ${links ? `<div class="proj__links">${links}</div>` : ''}
       </div>`,
    )
  }

  // ── The workbench: who we are, briefly ─────────────────────────────────
  openAbout(): void {
    this.#touch('workbench')
    const crew = CHARACTERS.map((c) => `<li><b>${c.name}</b><span>${c.trait}</span></li>`).join('')
    this.#show(
      'about',
      SITE_CONFIG.companyName,
      `<dl class="about">
         <div><dt>WHAT WE MAKE</dt><dd>Games</dd></div>
         <div><dt>HOW WE WORK</dt><dd>A small studio, by hand</dd></div>
         <div><dt>FROM</dt><dd>${SITE_CONFIG.location}</dd></div>
       </dl>
       <p class="about__crew-label">DOKKA CREW</p>
       <ul class="about__crew">${crew}</ul>`,
    )
  }

  // ── The TV: how to reach us ────────────────────────────────────────────
  openContact(): void {
    this.#touch('tv')
    const rows = contactRows()
    const body = rows.length
      ? rows
          .map(
            (r) => `<div class="tvrow">
               <span class="tvrow__label">${r.label}</span>
               <a class="tvrow__value" href="${r.href}">${r.value}</a>
               <button class="tvrow__copy" type="button" data-copy="${r.value}" aria-label="${r.label} 복사">COPY</button>
             </div>`,
          )
          .join('')
      : '<p class="tvrow__none">NO SIGNAL</p>'
    this.#show('contact', 'CONTACT', `<div class="tvset"><div class="tvset__screen">${body}</div></div>`)
    for (const btn of this.#body.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
      btn.addEventListener('click', async () => {
        const value = btn.dataset['copy'] ?? ''
        try {
          await navigator.clipboard.writeText(value)
          btn.textContent = 'COPIED'
          btn.classList.add('is-copied')
          audio.play('click', 0.35)
          setTimeout(() => {
            btn.textContent = 'COPY'
            btn.classList.remove('is-copied')
          }, 1600)
        } catch {
          btn.textContent = 'SELECT'
        }
      })
    }
  }

  // ── The fridge ─────────────────────────────────────────────────────────
  openFridge(): { snack: string; reacted: boolean; clue: boolean } {
    this.#touch('fridge')
    const snack = snackForToday()
    const today = todayKey()
    let opens = save.data.fridgeOpens
    if (save.data.fridgeDay !== today) {
      save.update((d) => {
        d.fridgeDay = today
        d.fridgeSnack = snack.id
      })
    }
    opens += 1
    save.update((d) => {
      d.fridgeOpens = opens
    })
    const earned = opens >= FRIDGE_CLUE_AT
    if (earned) this.#collect('fridge-clue')
    this.#show(
      'fridge',
      "TODAY'S SNACK",
      `<div class="fridge">
         <div class="fridge__shelf">
           <button class="snack" type="button" data-snack style="--tint:${snack.tint}">
             <span class="snack__label">${snack.label}</span>
           </button>
         </div>
         <p class="fridge__en">${snack.en}</p>
         ${
           earned
             ? '<p class="fridge__clue">🗝 <span>something was behind the jars</span></p>'
             : `<p class="fridge__hint">${'●'.repeat(Math.min(opens, FRIDGE_CLUE_AT))}${'○'.repeat(Math.max(0, FRIDGE_CLUE_AT - opens))}</p>`
         }
       </div>`,
    )
    audio.play('wrapper', 0.4)
    return { snack: snack.id, reacted: false, clue: earned }
  }

  onSnackTouched(fn: () => void): void {
    this.#body.querySelector('[data-snack]')?.addEventListener('click', () => {
      audio.play('surprise', 0.35)
      fn()
    })
  }

  // ── The radio ──────────────────────────────────────────────────────────
  openRadio(): void {
    this.#touch('radio')
    const on = soundPref.enabled
    this.#show(
      'radio',
      'GARAGE SOUND',
      `<div class="radioset">
         <button class="radioset__dial ${on ? 'is-on' : ''}" type="button" data-radio-toggle aria-pressed="${on}">
           <span class="radioset__light"></span>
         </button>
         <p class="radioset__state" data-radio-state>${on ? 'ON' : 'OFF'}</p>
         <div class="radioset__wave" data-radio-wave aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
       </div>`,
    )
    const dial = this.#body.querySelector<HTMLButtonElement>('[data-radio-toggle]')!
    const state = this.#body.querySelector<HTMLElement>('[data-radio-state]')!
    dial.addEventListener('click', () => {
      const next = !soundPref.enabled
      void soundPref.setEnabled(next)
      audio.unlock()
      audio.syncPreference()
      audio.toggleAmbient(next)
      dial.classList.toggle('is-on', next)
      dial.setAttribute('aria-pressed', String(next))
      state.textContent = next ? 'ON' : 'OFF'
      this.#shell.classList.toggle('is-playing', next)
      if (next) audio.play('click', 0.3)
    })
    this.#shell.classList.toggle('is-playing', audio.ambientPlaying)
  }

  // ── The cabinet ────────────────────────────────────────────────────────
  openArchive(): void {
    this.#touch('cabinet')
    // Only drawers with something real behind them.
    const drawers = [
      { id: 'legal', label: 'DOCUMENTS', items: [
        { label: 'Privacy', href: './privacy.html' },
        { label: 'Terms', href: './terms.html' },
        { label: 'Community', href: './community-guidelines.html' },
        { label: 'Account deletion', href: './account-deletion.html' },
      ] },
      { id: 'support', label: 'SUPPORT', items: [{ label: 'Support', href: './support.html' }] },
    ]
    const html = drawers
      .map(
        (d) => `<section class="drawer">
           <h3 class="drawer__label">${d.label}</h3>
           <ul class="drawer__items">${d.items.map((i) => `<li><a href="${i.href}">${i.label} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
         </section>`,
      )
      .join('')
    this.#show('archive', 'ARCHIVE', `<div class="archive">${html}<p class="archive__empty">DEVLOG — 아직 비어 있음</p></div>`)
  }

  // ── The shelf ──────────────────────────────────────────────────────────
  openShelf(): void {
    this.#touch('shelf')
    const d = save.data
    const found = [
      { id: 'pc', label: 'PC', got: d.touched.includes('pc') },
      { id: 'tv', label: 'TV', got: d.touched.includes('tv') },
      { id: 'fridge', label: 'FRIDGE', got: d.touched.includes('fridge') },
      { id: 'radio', label: 'RADIO', got: d.touched.includes('radio') },
      { id: 'fridge-clue', label: 'KEY', got: d.collection.includes('fridge-clue') },
      ...PROJECTS.map((p) => ({ id: p.id, label: p.title, got: d.visitedProjects.includes(p.id) })),
    ]
    const items = found
      .map((f) => `<li class="collect ${f.got ? 'is-found' : ''}"><span class="collect__dot"></span><span>${f.got ? f.label : '???'}</span></li>`)
      .join('')
    this.#show('shelf', 'FOUND', `<ul class="collection">${items}</ul>`)
  }

  // ── The secret door ────────────────────────────────────────────────────
  openSecret(): boolean {
    const met = secretMet()
    if (!met) {
      const d = save.data
      const steps = [
        { label: 'PC', got: d.touched.includes('pc') },
        { label: 'TV', got: d.touched.includes('tv') },
        { label: 'FRIDGE', got: d.collection.includes('fridge-clue') },
        { label: `GAMES ${d.visitedProjects.length}/${SECRET_REQUIREMENTS.projects}`, got: d.visitedProjects.length >= SECRET_REQUIREMENTS.projects },
      ]
      this.#show(
        'secret secret--locked',
        'LOCKED',
        `<div class="secret">
           <p class="secret__lock">🔒</p>
           <ul class="secret__steps">${steps.map((s) => `<li class="${s.got ? 'is-done' : ''}">${s.label}</li>`).join('')}</ul>
         </div>`,
      )
      return false
    }
    this.#touch('secret-door')
    audio.play('bell', 0.5)
    this.#show(
      'secret secret--open',
      'OPEN',
      `<div class="secret secret--unlocked">
         <p class="secret__talisman">🔔</p>
         <p class="secret__note">문이 열렸습니다.<br><span>The room behind it is still being built.</span></p>
       </div>`,
    )
    return true
  }
}
