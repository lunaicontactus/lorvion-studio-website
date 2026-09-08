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
import { DOCUMENTS } from '@/data/documents'
import { FRIDGE_ITEMS } from '@/data/fridge'
import { SHELF_ITEMS, shelfCrew } from '@/data/shelf'
import { save } from '@/systems/storage'
import { audio } from '@/systems/audio'
import { motion } from '@/systems/motion'
import type { ProjectConfig, ProjectStatus } from '@/types/project'

export interface PanelHost {
  /** Send the visitor to another thing in the room, e.g. shelf → PC. */
  readonly onGoTo?: (objectId: string) => void
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

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Remembered for this visit only: the door has already been tried. */
const SECRET_SEEN = 'eungarage:secretTried'

const ART = '/assets/images/garage'

/**
 * The poster cut-outs we actually have. WORM UP! has none, so its frame shows
 * the paper and the name rather than somebody else's picture.
 */
const POSTER_ART: Readonly<Record<string, string | undefined>> = {
  lunai: `${ART}/poster_lunai.webp`,
  liminal: `${ART}/poster_liminal_a.webp`,
  rubato: `${ART}/poster_rubato.webp`,
  // wormup: poster_wormup.webp — not drawn yet.
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

  /** Set when another object asked for a game: the PC opens on it directly. */
  #queued: string | null = null

  /** Ask the next PC opening to land on this game. */
  queueProject(id: string): void {
    this.#queued = id
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
      const wanted = this.#queued
      this.#queued = null
      const project = wanted ? PROJECTS.find((p) => p.id === wanted) : undefined
      if (project) this.#pcDetail(view, project)
      else this.#pcList(view)
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

  // ── The fridge: the week's shopping, and nothing to collect ───────────
  openFridge(): void {
    this.#touch('fridge')
    const shelves = FRIDGE_ITEMS.map(
      (i) => `<li>
         <button class="chill" type="button" data-item="${i.id}">
           <span class="chill__art"${i.art ? ` style="background-image:url('${i.art}')"` : ' data-empty'}></span>
           <span class="chill__label">${i.label}</span>
         </button>
       </li>`,
    ).join('')
    this.#show(
      'fridge',
      'FRIDGE',
      `${this.#portrait('fridge')}<div class="fridge" data-fridge>
         <ul class="fridge__shelves">${shelves}</ul>
         <p class="fridge__say" data-fridge-say aria-live="polite"></p>
       </div>`,
    )
    audio.play('wrapper', 0.4)
    const say = this.#body.querySelector<HTMLElement>('[data-fridge-say]')
    for (const btn of this.#body.querySelectorAll<HTMLElement>('[data-item]')) {
      btn.addEventListener('click', () => {
        const item = FRIDGE_ITEMS.find((i) => i.id === btn.dataset['item'])
        if (!item || !say) return
        say.textContent = item.note
        say.classList.remove('is-said')
        void say.offsetWidth
        say.classList.add('is-said')
        audio.play('click', 0.22)
      })
    }
  }

  // ── The cabinet: the paperwork, in the open ────────────────────────────
  // A second way to pages that are also in the top navigation. Legal and
  // support information is never a puzzle and never behind a discovery.
  openCabinet(): void {
    this.#touch('cabinet')
    const files = DOCUMENTS.map(
      (d) => `<li class="file"><a class="file__tab" href="${d.href}">
         <span class="file__name">${d.label}</span>
         <span class="file__go" aria-hidden="true">↗</span>
       </a></li>`,
    ).join('')
    this.#show(
      'cabinet',
      'FILES',
      `${this.#portrait('cabinet')}<div class="drawer" data-drawer>
         <ul class="drawer__files">${files}</ul>
       </div>`,
    )
    audio.play('drawer', 0.35)
    const drawer = this.#body.querySelector<HTMLElement>('[data-drawer]')
    if (!drawer) return
    if (motion.reduced) drawer.classList.add('is-open')
    else requestAnimationFrame(() => drawer.classList.add('is-open'))
  }

  // ── The shelf: the small things left over from making the games ───────
  // Not a second games menu: one object per project, a line each, and a way
  // through to the PC's page for that game rather than repeating it here.
  openShelf(): void {
    this.#touch('shelf')
    // No picture of the object yet: the tile is its label plate, which is what
    // half a workshop shelf is anyway. Nothing is stood in for.
    const items = SHELF_ITEMS.map((i) => {
      const accent = PROJECTS.find((p) => p.id === i.projectId)?.accent ?? '#8a6f52'
      return `<li>
         <button class="relic" type="button" data-relic="${i.id}" style="--accent:${accent}">
           ${i.art ? `<span class="relic__art" style="background-image:url('${i.art}')"></span>` : ''}
           <span class="relic__rule" aria-hidden="true"></span>
           <span class="relic__label">${i.label}</span>
         </button>
       </li>`
    }).join('')
    const crew = shelfCrew()
      .map(
        (c) => `<li class="figure">
           <img class="figure__art" src="${c.art.front}" alt="" loading="lazy" decoding="async">
           <span class="figure__name">${c.name}</span>
         </li>`,
      )
      .join('')
    this.#show(
      'shelf',
      'ON THE SHELF',
      `${this.#portrait('shelf')}<div class="shelf">
         <ul class="shelf__row">${items}</ul>
         <div class="shelf__card" data-relic-card hidden></div>
         <p class="shelf__label">DOKKA CREW</p>
         <ul class="shelf__figures">${crew}</ul>
       </div>`,
    )
    audio.play('drawer', 0.3)
    const card = this.#body.querySelector<HTMLElement>('[data-relic-card]')
    for (const btn of this.#body.querySelectorAll<HTMLElement>('[data-relic]')) {
      btn.addEventListener('click', () => {
        const item = SHELF_ITEMS.find((i) => i.id === btn.dataset['relic'])
        if (!item || !card) return
        for (const other of this.#body.querySelectorAll('[data-relic]')) {
          other.classList.toggle('is-picked', other === btn)
        }
        const project = item.projectId
          ? PROJECTS.find((p) => p.id === item.projectId)
          : undefined
        card.hidden = false
        card.innerHTML = `
          <p class="shelf__note">${item.note}</p>
          ${
            project
              ? `<button class="shelf__go" type="button" data-shelf-go="${project.id}">
                   VIEW ${project.title} <span aria-hidden="true">›</span>
                 </button>`
              : ''
          }`
        card.querySelector('[data-shelf-go]')?.addEventListener('click', () => {
          // Straight to that game on the PC: one piece of information, one place.
          this.queueProject(String(project?.id))
          this.#host.onGoTo?.('pc')
        })
      })
    }
  }

  // ── The secret door: nothing is behind it, and it says so ─────────────
  // No invented project, no date, no teaser art. What it has is a handle that
  // moves, a gap of dark, and one sentence. The room remembers, for this visit
  // only, that you have already tried it.
  openSecret(): void {
    const seen = sessionStorage.getItem(SECRET_SEEN) === '1'
    try {
      sessionStorage.setItem(SECRET_SEEN, '1')
    } catch {
      /* private mode: the door simply forgets */
    }
    this.#touch('secret-door')
    audio.play('bell', 0.35)
    this.#show(
      'secret',
      '',
      `<div class="dark" data-dark>
         <p class="dark__line">${seen ? '아직도 아무것도 없다.' : '아직 아무것도 없다.'}</p>
         <p class="dark__sub">Nothing is behind it yet.</p>
       </div>`,
    )
    const dark = this.#body.querySelector<HTMLElement>('[data-dark]')
    if (!dark) return
    if (motion.reduced) dark.classList.add('is-ajar')
    else requestAnimationFrame(() => dark.classList.add('is-ajar'))
  }

  // ── A poster on the wall ───────────────────────────────────────────────
  // A poster, kept a poster: the paper, its name, and a way to the game.
  // Nothing about the project is repeated here; the PC holds that.
  openPoster(project: ProjectConfig): void {
    this.#touch(`poster-${project.id}`)
    const art = POSTER_ART[project.id]
    this.#show(
      `poster poster--${project.id}`,
      project.title,
      `<div class="wall" style="--accent:${project.accent}">
         <div class="wall__paper"${art ? ` style="background-image:url('${art}')"` : ' data-empty'}>
           ${art ? '' : `<span class="wall__name">${project.title}</span>`}
         </div>
         <button class="wall__go" type="button" data-poster-go>
           VIEW ${project.title} <span aria-hidden="true">›</span>
         </button>
       </div>`,
    )
    this.#body.querySelector('[data-poster-go]')?.addEventListener('click', () => {
      this.queueProject(project.id)
      this.#host.onGoTo?.('pc')
    })
  }
}
