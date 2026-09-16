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
import { artworkFor, fullSrc, orientationOf } from '@/data/artwork'
import { contactRows } from '@/data/site'
import { OBJECT_ART, ROOM_ART } from '@/data/world'
import { DOCUMENTS } from '@/data/documents'
import { SHELF_ENTRIES, SHELF_SHOWN } from '@/data/garage/shelf'
import { PARCEL_ENTRIES } from '@/data/garage/parcels'
import { FRIDGE_FOOD, FRIDGE_MEMOS, FRIDGE_SHOWN, fridgeDay } from '@/data/garage/fridge'
import { CABINET_ENTRIES } from '@/data/garage/cabinet'
import { CHANNELS, CAM_ANGLES, TV_ENTRIES } from '@/data/garage/tv'
import type { ChannelId } from '@/data/garage/tv'
import { RADIO_ENTRIES, STATIONS } from '@/data/garage/radio'
import { WORKBENCH_ENTRIES } from '@/data/garage/workbench'
import type { WipPiece } from '@/data/garage/workbench'
import type { CabinetPaper } from '@/data/garage/cabinet'
import { GarageDiscoveryPool, hashString } from '@/systems/discovery'
import type { DiscoveryEntry } from '@/systems/discovery'
import { seededRandom } from '@/scenes/npc'
import { sound } from '@/systems/sound'
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
  /** A two-state thing in the room (the parcel) should be shown open or shut. */
  readonly onThingOpen?: (id: string, open: boolean) => void
  /**
   * The monitor is showing one game (its `world`), or none again. The room
   * lights itself from this; the panel colours itself from it.
   */
  readonly onWorldChange?: (world: string | null) => void
}

/** The only place a status is turned into words. */
const STATUS_LABEL: Record<ProjectStatus, string> = {
  released: 'RELEASED',
  inDevelopment: 'IN DEVELOPMENT',
  prototype: 'PROTOTYPE',
  comingSoon: 'COMING SOON',
}


/**
 * The picture, and the shape of it, in one attribute.
 *
 * Every box that shows a project's art reads `--shot` for its own proportions
 * rather than deciding on 16:9 and filling it. Without this the boxes and the
 * pictures disagree, and the way CSS settles that disagreement is by cutting
 * the picture.
 */
function shape(project: ProjectConfig): string {
  if (!project.keyArt) return ' data-empty'
  const piece = artworkFor(project.id)
  const ratio = piece ? ` --shot:${piece.width}/${piece.height};` : ''
  return ` style="background-image:url('${project.keyArt}');${ratio}"`
}

/** The approved crew's own face, for things that belong to one of them. */
export function ownerPortrait(owner: string | undefined): string | null {
  return owner ? `/assets/images/dokkaebi-v2/${owner}/idle/front/${owner}_idle_front_01.webp` : null
}

const OWNER_NAME: Readonly<Record<string, string>> = { momo: 'MOMO', nunu: 'NUNU', ruki: 'RUKI', yomi: 'YOMI', poko: 'POKO' }

/** Ids the pool has spent this visit, kept for the length of the tab. */
const SPENT_KEY = 'eungarage:discoverySpent'

function readSpent(): string[] {
  try {
    const raw = sessionStorage.getItem(SPENT_KEY)
    const v: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeSpent(ids: readonly string[]): void {
  try {
    sessionStorage.setItem(SPENT_KEY, JSON.stringify(ids))
  } catch {
    /* private mode: once-a-visit becomes once-a-page */
  }
}

function esc(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Remembered for this visit only: the door has already been tried. */
const DOOR_TRIED = 'eungarage:outsideDoorTried'

const ART = '/assets/images/garage'

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
  /** Everything the room's things can bring out, and what they brought last. */
  readonly pool = new GarageDiscoveryPool(
    [...SHELF_ENTRIES, ...PARCEL_ENTRIES, ...CABINET_ENTRIES, ...TV_ENTRIES, ...RADIO_ENTRIES, ...WORKBENCH_ENTRIES],
    { spent: readSpent() },
  )
  #tvChannel = 0
  #station = -1

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
    // The layer too, so the PC can be laid out beside the room rather than
    // over it (immersive.css) without the shell knowing.
    this.#root.dataset['kind'] = kind
    this.#host.onWorldChange?.(null)
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
    this.afterClose(this.#shell.dataset['kind'])
    this.#host.onWorldChange?.(null)
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
      'EUNGARAGE OS',
      `${this.#portrait('pc')}<div class="crt" data-crt>
         <div class="crt__screen">
           <p class="crt__boot" data-crt-boot>EUNGARAGE OS<span aria-hidden="true">_</span></p>
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
    // 300, not 520: measured on a throttled phone, the boot was a third of
    // the wait between the tap and a list that takes a tap.
    if (motion.reduced) showList()
    else this.#later(showList, 300)
  }

  /** The works library, straight from PROJECTS. The five real games and
   *  nothing else: the site's own mini-games live outside, not on this
   *  monitor, and no other object in the room repeats this list. */
  #pcList(view: HTMLElement): void {
    this.#host.onWorldChange?.(null)
    view.innerHTML = `<p class="hub__head">EUNGARAGE OS · WORKS</p><div class="hub" data-works>${PROJECTS.map(
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
    this.#host.onWorldChange?.(project.world)
    if (!save.data.visitedProjects.includes(project.id)) {
      save.update((d) => {
        d.visitedProjects.push(project.id)
      })
      this.#host.onProgress?.()
    }
    view.innerHTML = `
      <div class="crtgame">
        <button class="crtgame__back" type="button" data-crt-back>
          <span aria-hidden="true">←</span> 작품 목록
        </button>
        <h3 class="crtgame__name">${project.title}</h3>
        <div class="crtgame__art"${shape(project)}></div>
        <p class="crtgame__tag">${project.tagline}</p>
        <p class="crtgame__tag crtgame__tag--ko">${project.taglineKo}</p>
        <dl class="crtgame__facts">
          <div><dt>GENRE</dt><dd>${project.genre}</dd></div>
          <div><dt>STATUS</dt><dd>${STATUS_LABEL[project.status]}</dd></div>
          <div><dt>PLATFORM</dt><dd>${project.platforms.join(' · ')}</dd></div>
        </dl>
        <a class="crtgame__full" href="./games.html#${project.id}">작품 자세히 보기 <span aria-hidden="true">↗</span></a>
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
         <div class="proj__art"${shape(project)}>
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

  /** Draw from the pool, and remember what a visit has used up. */
  #draw(category: Parameters<GarageDiscoveryPool['draw']>[0]): DiscoveryEntry | null {
    const e = this.pool.draw(category)
    writeSpent(this.pool.spent)
    return e
  }

  /** The owner's face and name, for a thing that belongs to someone. */
  #owner(owner: string | undefined): string {
    const face = ownerPortrait(owner)
    if (!face || !owner) return ''
    return `<span class="owner"><img class="owner__face" src="${face}" alt="" decoding="async"><span class="owner__name">${OWNER_NAME[owner]}</span></span>`
  }

  // ── The workbench: work in progress, one piece out at a time ─────────────
  // Not the game list. Real working material from this site's own crew
  // rebuild: test captures and sheets, each with its date and commit.
  openWorkbench(): void {
    this.#touch('workbench')
    const piece = this.#draw('workbench') as WipPiece | null
    const pinned = WORKBENCH_ENTRIES.filter((e) => e.id !== piece?.id).slice(0, 3)
    this.#show(
      'bench',
      '작업대 · WIP',
      `${this.#portrait('workbench')}<div class="bench2" data-bench data-piece="${piece?.id ?? ''}">
         <div class="bench" data-bench-props>
           <button class="bench__car" type="button" data-bench-car aria-pressed="false"
                   aria-label="조립 중인 장난감 자동차. 누르면 뚜껑을 닫습니다">
             <img data-state="open" src="${ART}/prop_toycar_open.webp" alt="" decoding="async">
             <img data-state="closed" src="${ART}/prop_toycar_closed.webp" alt="" decoding="async">
           </button>
           <img class="bench__tray" src="${ART}/prop_parts_tray.webp" alt="" decoding="async">
           <p class="bench__note" data-bench-note>태엽 자동차. 뚜껑 열고 기어 맞추는 중.</p>
         </div>
         ${piece ? `<figure class="bench2__top">
           <img class="bench2__img" src="${piece.asset}" alt="${esc(piece.title)}" decoding="async">
           <figcaption class="bench2__card">
             <span class="bench2__kind">${piece.kind.toUpperCase()} · ${piece.date}</span>
             <b class="bench2__title">${esc(piece.title)}</b>
             <span class="bench2__note">${esc(piece.description)}</span>
             <code class="bench2__commit">${piece.commit}</code>
           </figcaption>
         </figure>` : ''}
         <ul class="bench2__under" aria-label="작업대에 깔린 다른 것들">${pinned.map((e) => `<li>${esc(e.title)}</li>`).join('')}</ul>
       </div>`,
    )
    audio.play('drawer', 0.3)
    // The car on the bench: open, being built. A touch closes the bonnet and
    // opens it again. Both cut-outs sit on one canvas, so nothing jumps.
    const car = this.#body.querySelector<HTMLButtonElement>('[data-bench-car]')
    const note = this.#body.querySelector<HTMLElement>('[data-bench-note]')
    car?.addEventListener('click', () => {
      const done = !car.classList.contains('is-done')
      car.classList.toggle('is-done', done)
      car.setAttribute('aria-pressed', String(done))
      if (note) note.textContent = done ? '닫았다. 남은 부품은 못 본 걸로.' : '태엽 자동차. 뚜껑 열고 기어 맞추는 중.'
      audio.play('click', 0.3)
    })
  }

  /** The next time the TV is opened, open it on this channel. */
  preferChannel(id: ChannelId): void {
    this.#tvChannel = Math.max(0, CHANNELS.findIndex((c) => c.id === id))
  }

  // ── The TV: five channels, none of them the PC ──────────────────────────
  openTv(channel?: ChannelId): void {
    this.#touch('tv')
    if (channel) this.#tvChannel = Math.max(0, CHANNELS.findIndex((c) => c.id === channel))
    this.#show(
      'tv',
      'EUNGARAGE TV',
      `${this.#portrait('tv')}<div class="tvset" data-tv>
         <div class="tvset__screen" data-tv-screen>
           <p class="tvset__static" data-tv-static aria-hidden="true"></p>
           <p class="tvset__ch" data-tv-ch aria-live="polite"></p>
           <div data-tv-view></div>
         </div>
         <div class="tvset__dial">
           <button class="tvset__btn" type="button" data-tv-prev aria-label="이전 채널">‹</button>
           ${CHANNELS.map((c, i) => `<button class="tvset__num" type="button" data-tv-go="${i}" aria-label="${c.number} ${c.name}">${c.number.slice(2)}</button>`).join('')}
           <button class="tvset__btn" type="button" data-tv-next aria-label="다음 채널">›</button>
         </div>
       </div>`,
    )
    const view = this.#body.querySelector<HTMLElement>('[data-tv-view]')!
    const set = this.#body.querySelector<HTMLElement>('[data-tv]')!
    const label = this.#body.querySelector<HTMLElement>('[data-tv-ch]')!

    const render = (): void => {
      const ch = CHANNELS[this.#tvChannel]!
      set.dataset['channel'] = ch.id
      label.textContent = `${ch.number} ${ch.name}`
      for (const b of this.#body.querySelectorAll<HTMLElement>('[data-tv-go]')) {
        b.setAttribute('aria-pressed', String(Number(b.dataset['tvGo']) === this.#tvChannel))
      }
      if (ch.id === 'news') {
        const n = this.#draw('tv')
        view.innerHTML = n ? `<div class="tvnews" data-tv-news="${n.id}">
            <span class="tvnews__tag">${esc(n.title)}</span>
            <p class="tvnews__line">${esc(n.description)}</p>
            <span class="tvnews__ticker" aria-hidden="true">EUNGARAGE NEWS · LIVE FROM THE GARAGE ·</span>
          </div>` : ''
      } else if (ch.id === 'cam') {
        const wide = innerWidth >= innerHeight
        const angles = CAM_ANGLES[wide ? 'landscape' : 'portrait']
        const room = ROOM_ART[wide ? 'landscape' : 'portrait']
        const i = Math.floor(Math.random() * angles.length)
        const a = angles[i]!
        const scale = 100 / a.w
        view.innerHTML = `<div class="tvcam" data-tv-cam="${i}" role="img" aria-label="${esc(a.label)}"
            style="background-image:url('${room.src}');background-size:${room.w * scale}% auto;background-position:${(a.x / (room.w - a.w)) * 100}% ${(a.y / (room.h - a.h)) * 100}%">
            <span class="tvcam__rec">● REC</span><span class="tvcam__label">${esc(a.label)}</span>
            <span class="tvcam__time" data-tv-time></span>
          </div>`
        const t = view.querySelector<HTMLElement>('[data-tv-time]')
        if (t) t.textContent = new Date().toTimeString().slice(0, 8)
      } else if (ch.id === 'teaser') {
        const withArt = PROJECTS.filter((p) => p.keyArt)
        const p = withArt[Math.floor(Math.random() * withArt.length)]
        view.innerHTML = p ? `<div class="tvteaser" data-tv-teaser="${p.id}" style="--accent:${p.accent}">
            <span class="tvteaser__art" style="background-image:url('${p.keyArt}')"></span>
            <span class="tvteaser__name">${esc(p.title)}</span>
            <span class="tvteaser__tag">${esc(p.taglineKo)}</span>
            <button class="tvteaser__go" type="button" data-tv-pc="${p.id}">PC에서 자세히 보기 <span aria-hidden="true">›</span></button>
          </div>` : ''
        view.querySelector('[data-tv-pc]')?.addEventListener('click', () => {
          if (!p) return
          this.queueProject(p.id)
          this.#host.onGoTo?.('pc')
        })
      } else if (ch.id === 'contact') {
        const rows = contactRows()
        view.innerHTML = rows.length
          ? `<p class="tvrow__brand">EUNGARAGE</p>${rows.map((r) => `<div class="tvrow">
               <span class="tvrow__label">${r.label}</span>
               <a class="tvrow__value" href="${r.href}">${r.value}</a>
               <button class="tvrow__copy" type="button" data-copy="${r.value}" aria-label="${r.label} 복사">COPY</button>
             </div>`).join('')}<a class="tvrow__more" href="./studio.html">STUDIO <span aria-hidden="true">↗</span></a>`
          : '<p class="tvrow__none">NO SIGNAL</p>'
        for (const btn of view.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(btn.dataset['copy'] ?? '')
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
      } else {
        view.innerHTML = '<p class="tvrow__none" data-tv-nosignal>NO SIGNAL</p>'
      }
    }
    const tune = (i: number): void => {
      this.#tvChannel = (i + CHANNELS.length) % CHANNELS.length
      this.#clearTimers()
      set.classList.add('is-warming')
      view.innerHTML = ''
      audio.play('click', 0.3)
      const settle = (): void => {
        set.classList.remove('is-warming')
        render()
      }
      if (motion.reduced) settle()
      else this.#later(settle, 220)
    }
    this.#body.querySelector('[data-tv-prev]')!.addEventListener('click', () => tune(this.#tvChannel - 1))
    this.#body.querySelector('[data-tv-next]')!.addEventListener('click', () => tune(this.#tvChannel + 1))
    for (const b of this.#body.querySelectorAll<HTMLElement>('[data-tv-go]')) {
      b.addEventListener('click', () => tune(Number(b.dataset['tvGo'])))
    }
    tune(this.#tvChannel)
  }

  // ── The radio: the site's audio, and its mute switch ─────────────────────
  openRadio(): void {
    this.#touch('radio')
    this.#show(
      'radio',
      'NIGHT RADIO',
      `${this.#portrait('radio')}<div class="radio" data-radio>
         <div class="radio__face">
           <p class="radio__freq" data-radio-freq aria-live="polite">OFF</p>
           <p class="radio__talk" data-radio-talk></p>
         </div>
         <div class="radio__stations" role="radiogroup" aria-label="방송국">
           ${STATIONS.map((st, i) => `<button class="radio__st" type="button" role="radio" aria-checked="false" data-station="${i}">
              <b>${st.freq}</b><span>${st.name}</span></button>`).join('')}
         </div>
         <button class="radio__power" type="button" data-radio-power aria-pressed="false">
           <span class="radio__dot" aria-hidden="true"></span><span data-radio-power-label>소리 켜기</span>
         </button>
       </div>`,
    )
    const freq = this.#body.querySelector<HTMLElement>('[data-radio-freq]')!
    const talk = this.#body.querySelector<HTMLElement>('[data-radio-talk]')!
    const power = this.#body.querySelector<HTMLButtonElement>('[data-radio-power]')!
    const powerLabel = this.#body.querySelector<HTMLElement>('[data-radio-power-label]')!
    const radio = this.#body.querySelector<HTMLElement>('[data-radio]')!

    const paint = (): void => {
      const on = sound.enabled
      power.setAttribute('aria-pressed', String(on))
      powerLabel.textContent = on ? '소리 끄기' : '소리 켜기'
      radio.dataset['on'] = String(on)
      const st = STATIONS[this.#station]
      radio.dataset['station'] = st?.id ?? ''
      for (const b of this.#body.querySelectorAll<HTMLElement>('[data-station]')) {
        b.setAttribute('aria-checked', String(Number(b.dataset['station']) === this.#station))
      }
      freq.textContent = st ? `FM ${st.freq} · ${st.name}` : on ? 'FM · · ·' : 'OFF'
    }
    const tuneTo = (i: number): void => {
      this.#station = i
      const st = STATIONS[i]!
      audio.play('click', 0.25)
      audio.tune(st.track, st.volume)
      if (st.id === 'news') {
        const seg = this.#draw('radio')
        talk.textContent = seg ? `${seg.title} — ${seg.description}` : ''
        talk.dataset['segment'] = seg?.id ?? ''
      } else {
        talk.textContent = ''
        delete talk.dataset['segment']
      }
      paint()
    }
    for (const b of this.#body.querySelectorAll<HTMLElement>('[data-station]')) {
      b.addEventListener('click', () => {
        const i = Number(b.dataset['station'])
        // Choosing a station is also asking to hear it.
        if (!sound.enabled) void sound.setEnabled(true).then(() => tuneTo(i))
        else tuneTo(i)
      })
    }
    power.addEventListener('click', () => {
      void sound.toggle().then(() => {
        if (sound.enabled && this.#station < 0) tuneTo(0)
        else paint()
      })
    })
    paint()
  }

  // ── The fridge: today's fridge, the same all day ─────────────────────────
  openFridge(day = fridgeDay()): void {
    this.#touch('fridge')
    const rng = seededRandom(hashString(`fridge:${day}`))
    const todays = new GarageDiscoveryPool([...FRIDGE_FOOD], { random: rng, recent: 0 }).drawMany('fridge', FRIDGE_SHOWN)
    const memo = new GarageDiscoveryPool([...FRIDGE_MEMOS], { random: seededRandom(hashString(`memo:${day}`)) }).draw('fridge')
    this.#show(
      'fridge',
      '오늘의 냉장고',
      `${this.#portrait('fridge')}<div class="fridge" data-fridge data-day="${day}">
         ${memo ? `<p class="fridge__memo" data-fridge-memo="${memo.id}">${esc(memo.description)}</p>` : ''}
         <ul class="fridge__shelves">${todays.map((i) => `<li>
           <button class="chill" type="button" data-item="${i.id}">
             <span class="chill__art"${i.asset ? ` style="background-image:url('${i.asset}')"` : ' data-empty'}></span>
             <span class="chill__label">${esc(i.title)}</span>
           </button>
         </li>`).join('')}</ul>
         <p class="fridge__say" data-fridge-say aria-live="polite"></p>
       </div>`,
    )
    audio.play('wrapper', 0.4)
    const say = this.#body.querySelector<HTMLElement>('[data-fridge-say]')
    for (const btn of this.#body.querySelectorAll<HTMLElement>('[data-item]')) {
      btn.addEventListener('click', () => {
        const item = todays.find((i) => i.id === btn.dataset['item'])
        if (!item || !say) return
        say.textContent = item.description
        say.classList.remove('is-said')
        void say.offsetWidth
        say.classList.add('is-said')
        audio.play('click', 0.22)
      })
    }
  }

  // ── The parcel: one box, one thing in it ─────────────────────────────────
  openParcel(): void {
    this.#touch('parcel')
    const got = this.#draw('parcel')
    this.#host.onThingOpen?.('parcel', true)
    this.#show(
      'parcel',
      '택배',
      `<div class="delivery" data-delivery="${got?.id ?? ''}">
         <img class="delivery__box" src="${ART}/prop_parcel_open.webp" alt="" decoding="async">
         ${got ? `<div class="delivery__out">
           ${got.asset ? `<img class="delivery__thing" src="${got.asset}" alt="" decoding="async">` : ''}
           <b class="delivery__name">${esc(got.title)}</b>
           <span class="delivery__note">${esc(got.description)}</span>
           ${this.#owner(got.owner)}
         </div>` : ''}
       </div>`,
    )
    audio.play('wrapper', 0.4)
  }

  /** The parcel panel closed: the box in the room closes with it. */
  afterClose(kind: string | undefined): void {
    if (kind === 'parcel') this.#host.onThingOpen?.('parcel', false)
  }

  // ── The cabinet: records and lore; the legal folder always at the back ──
  openCabinet(): void {
    this.#touch('cabinet')
    const paper = this.#draw('cabinet') as CabinetPaper | null
    const files = DOCUMENTS.map(
      (d) => `<li class="file"><a class="file__tab" href="${d.href}">
         <span class="file__name">${d.label}</span>
         <span class="file__go" aria-hidden="true">↗</span>
       </a></li>`,
    ).join('')
    this.#show(
      'cabinet',
      '캐비닛',
      `${this.#portrait('cabinet')}<div class="drawer" data-drawer>
         ${paper ? `<article class="paper paper--${paper.kind}" data-paper="${paper.id}">
           <h3 class="paper__title">${esc(paper.title)}</h3>
           <p class="paper__body">${esc(paper.description)}</p>
         </article>` : ''}
         <p class="drawer__label">서류철 · 고객지원과 약관</p>
         <ul class="drawer__files">${files}</ul>
       </div>`,
    )
    audio.play('drawer', 0.35)
    const drawer = this.#body.querySelector<HTMLElement>('[data-drawer]')
    if (!drawer) return
    if (motion.reduced) drawer.classList.add('is-open')
    else requestAnimationFrame(() => drawer.classList.add('is-open'))
  }

  // ── The shelf: the crew's own things, a few at a time ────────────────────
  openShelf(): void {
    this.#touch('shelf')
    const items = this.pool.drawMany('shelf', SHELF_SHOWN)
    writeSpent(this.pool.spent)
    this.#show(
      'shelf',
      'DOKKA CREW COLLECTION',
      `${this.#portrait('shelf')}<div class="shelf" data-shelf-items="${items.map((i) => i.id).join(' ')}">
         <ul class="shelf__row">${items.map((i) => `<li>
           <button class="relic" type="button" data-relic="${i.id}">
             ${i.asset ? `<span class="relic__art" style="background-image:url('${i.asset}')"></span>` : ''}
             ${this.#owner(i.owner)}
             <span class="relic__label">${esc(i.title)}</span>
           </button>
         </li>`).join('')}</ul>
         <div class="shelf__card" data-relic-card hidden></div>
       </div>`,
    )
    audio.play('drawer', 0.3)
    const card = this.#body.querySelector<HTMLElement>('[data-relic-card]')
    for (const btn of this.#body.querySelectorAll<HTMLElement>('[data-relic]')) {
      btn.addEventListener('click', () => {
        const item = items.find((i) => i.id === btn.dataset['relic'])
        if (!item || !card) return
        for (const other of this.#body.querySelectorAll('[data-relic]')) {
          other.classList.toggle('is-picked', other === btn)
        }
        card.hidden = false
        card.innerHTML = `<b class="shelf__name">${esc(item.title)}</b><p class="shelf__note">${esc(item.description)}</p>`
        audio.play('click', 0.22)
      })
    }
  }

  // ── The outside door ─────────────────────────────────────────────────────
  // The garage's own door, which will open onto the Dokkaebi Playground. The
  // Playground is not built yet, so the door is honest about it: it moves,
  // light comes through the gap, and it says what is out there.
  openOutsideDoor(): void {
    let tried = false
    try {
      tried = sessionStorage.getItem(DOOR_TRIED) === '1'
      sessionStorage.setItem(DOOR_TRIED, '1')
    } catch {
      /* private mode: the door simply forgets */
    }
    this.#touch('outside-door')
    audio.play('door', 0.35)
    this.#show(
      'door',
      '',
      `<div class="dark" data-dark data-outside-door>
         <p class="dark__line">${tried ? '밖에서 여전히 작은 불빛이 움직인다.' : '문틈으로 밤공기가 들어온다.'}</p>
         <p class="dark__sub">도깨비 놀이터 · 준비 중</p>
       </div>`,
    )
    const dark = this.#body.querySelector<HTMLElement>('[data-dark]')
    if (!dark) return
    if (motion.reduced) dark.classList.add('is-ajar')
    else requestAnimationFrame(() => dark.classList.add('is-ajar'))
  }

  // ── A piece off the wall, looked at properly ───────────────────────────
  //
  // Whatever shape the picture is, is the shape it is shown at. It is an
  // <img> with its own width and height on it, capped against the window and
  // otherwise left alone — so a 1024x1536 key visual opens tall and a
  // 1920x1080 background opens wide, and neither loses an edge. The frame it
  // is in is drawn around the picture after the picture has been sized, not
  // before, which is the whole difference from what this used to do: a 16:9
  // box with the picture set to cover it, which threw away two thirds of
  // every portrait key visual in the studio.
  //
  // The name and one line under it, from the project registry. Nothing else:
  // the PC holds what the project is, and repeating it here would give the
  // room two places to disagree.
  openPoster(project: ProjectConfig): void {
    this.#touch(`poster-${project.id}`)
    const piece = artworkFor(project.id)
    const shot = piece
      ? `<img class="view__img" src="${fullSrc(piece)}" width="${piece.width}" height="${piece.height}"
              alt="${project.title}" decoding="async">`
      : `<span class="view__none">${project.title}</span>`
    this.#show(
      `poster poster--${project.id}`,
      project.title,
      `<div class="wall" style="--accent:${project.accent}">
         <figure class="view" data-artwork-view${piece ? ` data-orientation="${orientationOf(piece)}"` : ''}>
           ${shot}
           <figcaption class="view__cap">
             <b>${project.title}</b>
             <span>${project.taglineKo}</span>
           </figcaption>
         </figure>
         <button class="wall__go" type="button" data-poster-go>
           PC에서 자세히 보기 <span aria-hidden="true">›</span>
         </button>
       </div>`,
    )
    this.#body.querySelector('[data-poster-go]')?.addEventListener('click', () => {
      this.queueProject(project.id)
      this.#host.onGoTo?.('pc')
    })
  }
}
