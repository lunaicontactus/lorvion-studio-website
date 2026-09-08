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
import { OBJECT_ART } from '@/data/world'
import { save } from '@/systems/storage'
import { audio } from '@/systems/audio'
import { motion } from '@/systems/motion'
import type { ProjectConfig, ProjectStatus } from '@/types/project'

export interface PanelHost {
  /** Called when a panel opens or closes, so the room can stop moving. */
  readonly onOpenChange?: (open: boolean) => void
  /** The visitor closed this themselves: the ✕, the backdrop, Escape. */
  readonly onClose?: () => void
  /** Something worth remembering happened. */
  readonly onProgress?: () => void
}

/** The only place a status is turned into words. */
const STATUS_LABEL: Record<ProjectStatus, string> = {
  released: 'RELEASED',
  inDevelopment: 'IN DEVELOPMENT',
  prototype: 'PROTOTYPE',
  comingSoon: 'COMING SOON',
}

/**
 * What is in the fridge. Not a menu and not a puzzle: a line of studio life,
 * the same one all day, because a fridge does not restock itself every time
 * you look at it.
 */
const FRIDGE_LINES = [
  '또 제로콜라뿐이다.',
  '누가 마지막 생수를 마셨다.',
  '야근용 간식이 줄었다.',
  '이 피자는 언제부터 여기 있었지?',
  '얼음틀이 비어 있다.',
] as const

/** The date is the seed, not chance. */
function lineForToday(): string {
  const d = new Date()
  const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  return FRIDGE_LINES[key % FRIDGE_LINES.length]!
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Opening the fridge four times earns the clue. Not a dice roll. */
export const FRIDGE_CLUE_AT = 4

/**
 * What the door is waiting for. Kept as data so the room behind it can be
 * built later without unpicking the lock: look at the PC, read all four
 * games, and find what is behind the bottles.
 */
export const SECRET_REQUIREMENTS = {
  touched: ['pc'],
  projects: 4,
  collected: ['fridge-clue'],
} as const

export function secretMet(): boolean {
  const d = save.data
  return (
    SECRET_REQUIREMENTS.touched.every((id) => d.touched.includes(id)) &&
    d.visitedProjects.length >= SECRET_REQUIREMENTS.projects &&
    SECRET_REQUIREMENTS.collected.every((id) => d.collection.includes(id))
  )
}

export class Panels {
  #root: HTMLElement
  #shell: HTMLElement
  #body: HTMLElement
  #title: HTMLElement
  #open = false
  #lastFocus: HTMLElement | null = null
  #host: PanelHost
  /** Anything scheduled by the panel on screen, dropped when it leaves. */
  #timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(root: HTMLElement, host: PanelHost = {}) {
    this.#root = root
    this.#host = host
    root.className = 'panel-layer'
    root.hidden = true
    root.innerHTML = `
      <div class="panel-layer__scrim" data-panel-scrim></div>
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="panelTitle"
           tabindex="-1" data-panel>
        <div class="panel__inner">
          <h2 class="panel__title" id="panelTitle" data-panel-title></h2>
          <div class="panel__body" data-panel-body></div>
          <button class="panel__close" type="button" data-panel-close aria-label="닫기">✕</button>
        </div>
      </div>`
    this.#shell = root.querySelector('[data-panel]')!
    this.#body = root.querySelector('[data-panel-body]')!
    this.#title = root.querySelector('[data-panel-title]')!

    root.querySelector('[data-panel-close]')!.addEventListener('click', () => {
      this.#host.onClose?.()
      this.close()
    })
    root.querySelector('[data-panel-scrim]')!.addEventListener('click', () => {
      this.#host.onClose?.()
      this.close()
    })
    document.addEventListener('keydown', (e) => {
      if (!this.#open) return
      if (e.key === 'Escape') return // the world closes and unwinds history
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

  /** The object you just touched, shown at the top of what it opened. */
  #portrait(id: string): string {
    const src = OBJECT_ART[id]
    return src ? `<img class="panel__portrait" src="${src}" alt="" decoding="async">` : ''
  }

  #later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.#timers.delete(t)
      fn()
    }, ms)
    this.#timers.add(t)
  }

  #clearTimers(): void {
    for (const t of this.#timers) clearTimeout(t)
    this.#timers.clear()
  }

  #show(kind: string, title: string, html: string): void {
    this.#clearTimers()
    this.#lastFocus = document.activeElement as HTMLElement | null
    this.#shell.dataset['kind'] = kind
    this.#title.textContent = title
    this.#body.innerHTML = html
    this.#root.hidden = false
    void this.#root.offsetWidth
    this.#root.classList.add('is-open')
    this.#open = true
    this.#host.onOpenChange?.(true)
    // Focus the dialog itself, not its first link: focusing a control near the
    // bottom scrolls the panel past its own title before anyone has read it.
    this.#shell.focus()
  }

  close(): void {
    if (!this.#open) return
    this.#clearTimers()
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

  // ── The PC: a monitor that boots, not a dialog with a list in it ───────
  openPc(): void {
    this.#touch('pc')
    this.#show(
      'pc',
      'EUNGARAGE SOFTWARE',
      `${this.#portrait('pc')}<div class="crt" data-crt>
         <div class="crt__screen">
           <p class="crt__boot" data-crt-boot>EUNGARAGE SOFTWARE<span aria-hidden="true">_</span></p>
           <div data-crt-view></div>
         </div>
       </div>`,
    )
    audio.play('keyboard', 0.35)
    // A short boot, because this is a monitor waking up, not an operating
    // system starting. Anything longer is a wait, not an effect.
    const view = this.#body.querySelector<HTMLElement>('[data-crt-view]')
    if (!view) return
    const showList = (): void => {
      this.#body.querySelector('[data-crt-boot]')?.classList.add('is-done')
      this.#pcList(view)
    }
    if (motion.reduced) showList()
    else this.#later(showList, 520)
  }

  /** The catalogue, straight from PROJECTS. */
  #pcList(view: HTMLElement): void {
    view.innerHTML = `<div class="hub">${PROJECTS.map(
      (p) => `
      <button class="hub__row" type="button" data-game="${p.id}">
        <span class="hub__thumb"${p.keyArt ? ` style="background-image:url('${p.keyArt}')"` : ' data-empty'}></span>
        <span class="hub__meta">
          <span class="hub__name">${p.title}</span>
          <span class="hub__tag">${p.tagline}</span>
          <span class="hub__facts">${p.genre} · ${p.platforms.join(' · ')}</span>
        </span>
        <span class="hub__right">
          <span class="hub__status" data-status="${p.status}">${STATUS_LABEL[p.status]}</span>
          <span class="hub__more">OPEN <span aria-hidden="true">›</span></span>
        </span>
      </button>`,
    ).join('')}</div>`
    for (const btn of view.querySelectorAll<HTMLElement>('[data-game]')) {
      btn.addEventListener('click', () => {
        const project = PROJECTS.find((p) => p.id === btn.dataset['game'])
        if (project) this.#pcDetail(view, project)
      })
    }
  }

  /** One game, still inside the monitor. Leaving the room is a deliberate act. */
  #pcDetail(view: HTMLElement, project: ProjectConfig): void {
    if (!save.data.visitedProjects.includes(project.id)) {
      save.update((d) => {
        d.visitedProjects.push(project.id)
      })
      this.#host.onProgress?.()
    }
    view.innerHTML = `
      <div class="crtgame">
        <button class="crtgame__back" type="button" data-crt-back>
          <span aria-hidden="true">←</span> BACK
        </button>
        <h3 class="crtgame__name">${project.title}</h3>
        <div class="crtgame__art"${project.keyArt ? ` style="background-image:url('${project.keyArt}')"` : ' data-empty'}></div>
        <p class="crtgame__tag">${project.tagline}</p>
        <p class="crtgame__tag crtgame__tag--ko">${project.taglineKo}</p>
        <dl class="crtgame__facts">
          <div><dt>GENRE</dt><dd>${project.genre}</dd></div>
          <div><dt>STATUS</dt><dd>${STATUS_LABEL[project.status]}</dd></div>
          <div><dt>PLATFORM</dt><dd>${project.platforms.join(' · ')}</dd></div>
        </dl>
        <a class="crtgame__full" href="./games.html#${project.id}">VIEW FULL PAGE <span aria-hidden="true">↗</span></a>
      </div>`
    view.querySelector('[data-crt-back]')?.addEventListener('click', () => {
      audio.play('click', 0.3)
      this.#pcList(view)
    })
    view.querySelector<HTMLElement>('[data-crt-back]')?.focus()
  }

  // ── A poster, or a game chosen in the hub ──────────────────────────────
  // Both routes land here, so a poster and the PC can never disagree.
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
           ${project.keyArt ? '' : `<span class="proj__soon">${STATUS_LABEL[project.status]}</span>`}
         </div>
         <p class="proj__tag">${project.tagline}</p>
         <p class="proj__tag proj__tag--ko">${project.taglineKo}</p>
         <dl class="proj__facts">
           <div><dt>GENRE</dt><dd>${project.genre}</dd></div>
           <div><dt>STATUS</dt><dd>${STATUS_LABEL[project.status]}</dd></div>
           <div><dt>PLATFORM</dt><dd>${project.platforms.join(' · ')}</dd></div>
         </dl>
         ${links ? `<div class="proj__links">${links}</div>` : ''}
       </div>`,
    )
  }

  // ── The workbench: the studio, as the notes lying on the desk ──────────
  // Paper, not a dialog: what the studio is, what is on the bench, who is in
  // the room. Everything comes from the registries; no copy is written here.
  openStudioDesk(): void {
    this.#touch('workbench')
    const rows = PROJECTS.map(
      (p) => `<li class="note__row">
         <span class="note__name">${p.title}</span>
         <span class="note__genre">${p.genre}</span>
         <span class="note__status" data-status="${p.status}">${STATUS_LABEL[p.status]}</span>
       </li>`,
    ).join('')
    const crew = CHARACTERS.map(
      (c) => `<li><b>${c.name}</b><span>${c.trait}</span></li>`,
    ).join('')
    const mail = contactRows().find((r) => r.key === 'email')
    this.#show(
      'desk',
      SITE_CONFIG.companyName,
      `${this.#portrait('workbench')}<div class="note">
         <p class="note__lede">Small games.<br>Strange worlds.<br>Made in our garage.</p>
         <p class="note__sub">An independent game studio in ${SITE_CONFIG.location}.
            감정과 캐릭터, 그리고 그들이 사는 세계를 중심으로 만듭니다.</p>
         <section class="note__block">
           <h3 class="note__label">ON THE BENCH</h3>
           <ul class="note__list">${rows}</ul>
         </section>
         <section class="note__block">
           <h3 class="note__label">DOKKA CREW</h3>
           <ul class="about__crew">${crew}</ul>
         </section>
         <p class="note__foot">
           ${mail ? `<a href="${mail.href}">${mail.value}</a> · ` : ''}
           <a href="./studio.html">FULL PAGE <span aria-hidden="true">↗</span></a>
         </p>
       </div>`,
    )
    audio.play('drawer', 0.3)
  }

  // ── The TV: a set that warms up, and can be switched off again ─────────
  openContact(): void {
    this.#touch('tv')
    this.#show(
      'contact',
      'CONTACT',
      `${this.#portrait('tv')}<div class="tvset" data-tv>
         <div class="tvset__screen" data-tv-screen>
           <p class="tvset__static" data-tv-static aria-hidden="true"></p>
           <div data-tv-view></div>
         </div>
         <button class="tvset__power" type="button" data-tv-power aria-pressed="true">
           <span class="tvset__dot" aria-hidden="true"></span>POWER
         </button>
       </div>`,
    )
    const view = this.#body.querySelector<HTMLElement>('[data-tv-view]')
    const set = this.#body.querySelector<HTMLElement>('[data-tv]')
    const power = this.#body.querySelector<HTMLButtonElement>('[data-tv-power]')
    if (!view || !set || !power) return

    const rows = contactRows()
    const contact = (): string =>
      rows.length
        ? `<p class="tvrow__brand">EUNGARAGE</p>${rows
            .map(
              (r) => `<div class="tvrow">
                 <span class="tvrow__label">${r.label}</span>
                 <a class="tvrow__value" href="${r.href}">${r.value}</a>
                 <button class="tvrow__copy" type="button" data-copy="${r.value}" aria-label="${r.label} 복사">COPY</button>
               </div>`,
            )
            .join('')}`
        : '<p class="tvrow__none">NO SIGNAL</p>'

    const wireCopy = (): void => {
      for (const btn of view.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
        btn.addEventListener('click', async () => {
          const value = btn.dataset['copy'] ?? ''
          try {
            await navigator.clipboard.writeText(value)
            btn.textContent = 'COPIED'
            btn.classList.add('is-copied')
            audio.play('click', 0.35)
            this.#later(() => {
              btn.textContent = 'COPY'
              btn.classList.remove('is-copied')
            }, 1600)
          } catch {
            btn.textContent = 'SELECT'
          }
        })
      }
    }

    const on = (): void => {
      set.classList.remove('is-off')
      set.classList.add('is-warming')
      power.setAttribute('aria-pressed', 'true')
      view.innerHTML = ''
      const settle = (): void => {
        set.classList.remove('is-warming')
        view.innerHTML = contact()
        wireCopy()
      }
      if (motion.reduced) settle()
      else this.#later(settle, 240)
    }
    const offScreen = (): void => {
      this.#clearTimers()
      set.classList.remove('is-warming')
      set.classList.add('is-off')
      power.setAttribute('aria-pressed', 'false')
      view.innerHTML = ''
    }
    power.addEventListener('click', () => {
      audio.play('click', 0.3)
      if (set.classList.contains('is-off')) on()
      else offScreen()
    })
    on()
  }

  // ── The fridge: studio life, not an information panel ──────────────────
  openFridge(): { line: string; clue: boolean } {
    this.#touch('fridge')
    const line = lineForToday()
    const today = todayKey()
    if (save.data.fridgeDay !== today) {
      save.update((d) => {
        d.fridgeDay = today
        d.fridgeSnack = line
      })
    }
    const opens = save.data.fridgeOpens + 1
    save.update((d) => {
      d.fridgeOpens = opens
    })
    const earned = opens >= FRIDGE_CLUE_AT
    if (earned) this.#collect('fridge-clue')
    this.#show(
      'fridge',
      'FRIDGE',
      `${this.#portrait('fridge')}<div class="fridge">
         <p class="fridge__line">${line}</p>
         ${
           earned
             ? '<p class="fridge__clue">병 뒤에 뭔가 있었다.</p>'
             : ''
         }
       </div>`,
    )
    audio.play('wrapper', 0.4)
    return { line, clue: earned }
  }

  // ── The cabinet: the studio's own file ─────────────────────────────────
  openStudio(): void {
    this.#touch('cabinet')
    const crew = CHARACTERS.map((c) => `<li><b>${c.name}</b><span>${c.trait}</span></li>`).join('')
    const making = PROJECTS.map((p) => `<li>${p.title} <span>${p.genre}</span></li>`).join('')
    const documents = [
      { label: 'Privacy', href: './privacy.html' },
      { label: 'Terms', href: './terms.html' },
      { label: 'Community', href: './community-guidelines.html' },
      { label: 'Account deletion', href: './account-deletion.html' },
      { label: 'Support', href: './support.html' },
    ]
      .map((i) => `<li><a href="${i.href}">${i.label} <span aria-hidden="true">↗</span></a></li>`)
      .join('')
    this.#show(
      'studio',
      SITE_CONFIG.companyName,
      `${this.#portrait('cabinet')}<div class="file">
         <p class="file__lede">An independent game studio in ${SITE_CONFIG.location}.</p>
         <p class="file__lede file__lede--ko">감정과 캐릭터, 그리고 그들이 사는 세계를 중심으로 만듭니다.</p>
         <section class="file__block">
           <h3 class="file__label">MAKING</h3>
           <ul class="file__list">${making}</ul>
         </section>
         <section class="file__block">
           <h3 class="file__label">DOKKA CREW</h3>
           <ul class="about__crew">${crew}</ul>
         </section>
         <section class="file__block">
           <h3 class="file__label">DOCUMENTS</h3>
           <ul class="file__list file__list--links">${documents}</ul>
         </section>
       </div>`,
    )
  }

  // ── The shelf: what has been found, and nothing else ───────────────────
  openShelf(): void {
    this.#touch('shelf')
    const d = save.data
    const found = [
      { label: 'PC', got: d.touched.includes('pc') },
      { label: 'TV', got: d.touched.includes('tv') },
      { label: 'FRIDGE', got: d.touched.includes('fridge') },
      { label: 'KEY', got: d.collection.includes('fridge-clue') },
      ...PROJECTS.map((p) => ({ label: p.title, got: d.visitedProjects.includes(p.id) })),
    ]
    const items = found
      .map((f) => `<li class="collect ${f.got ? 'is-found' : ''}"><span>${f.got ? f.label : '???'}</span></li>`)
      .join('')
    this.#show('shelf', 'FOUND', `${this.#portrait('shelf')}<ul class="collection">${items}</ul>`)
  }

  // ── The secret door ────────────────────────────────────────────────────
  openSecret(): boolean {
    const met = secretMet()
    if (!met) {
      const d = save.data
      const steps = [
        { label: 'PC', got: d.touched.includes('pc') },
        {
          label: `GAMES ${Math.min(d.visitedProjects.length, SECRET_REQUIREMENTS.projects)}/${SECRET_REQUIREMENTS.projects}`,
          got: d.visitedProjects.length >= SECRET_REQUIREMENTS.projects,
        },
        { label: 'FRIDGE', got: d.collection.includes('fridge-clue') },
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
