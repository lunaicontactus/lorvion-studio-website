/**
 * What the things in the room open.
 *
 * One accessible shell — dialog, focus trap, Escape, close, focus restore —
 * and a different presentation for every thing (PHASE 5). A touched thing
 * answers in the room first (its light, its sound: src/app/world.ts), then
 * its own cut-out grows out of it and the content is laid into the part of
 * the furniture that would hold it: the monitor's screen, the fridge behind
 * its doors, the paper out of the cabinet's drawer, the dial on the radio.
 * Nothing opens as a card. On a small screen the layer zooms into that
 * surface, so a phone gets the screen filling the window with the bezel round
 * it rather than a shrunken monitor (src/data/props.ts).
 *
 * Content comes from the central registries — PROJECTS, SITE_CONFIG, the
 * discovery pools — never from strings typed into a component.
 */
import { PROJECTS } from '@/data/projects'
import { artworkFor, fullSrc, orientationOf } from '@/data/artwork'
import { contactRows } from '@/data/site'
import { ROOM_ART } from '@/data/world'
import { DOCUMENTS } from '@/data/documents'
import { SHELF_ENTRIES, SHELF_SHOWN } from '@/data/garage/shelf'
import { PARCEL_ENTRIES } from '@/data/garage/parcels'
import { FRIDGE_FOOD, FRIDGE_MEMOS, FRIDGE_SHOWN, fridgeDay } from '@/data/garage/fridge'
import { CABINET_ENTRIES } from '@/data/garage/cabinet'
import { CHANNELS, CAM_ANGLES, TV_ENTRIES } from '@/data/garage/tv'
import type { ChannelId } from '@/data/garage/tv'
import { RADIO_ENTRIES, STATIONS } from '@/data/garage/radio'
import { PLACE_PROPS, SIGNPOST_ARMS, type Place, type PlaceId } from '@/data/playground'
import type { ArchivePlace } from '@/data/archive'
import { WORKBENCH_ENTRIES } from '@/data/garage/workbench'
import type { WipPiece } from '@/data/garage/workbench'
import type { CabinetPaper } from '@/data/garage/cabinet'
import { GarageDiscoveryPool, hashString } from '@/systems/discovery'
import { PROPS, dialPosition } from '@/data/props'
import type { Frac, PropDef } from '@/data/props'
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
  /** Where a thing is on screen, so what opens can grow out of it. */
  readonly rectOf?: (id: string) => DOMRect | null
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
  /** What is growing out of which thing, for the fit on open and on resize. */
  #prop: { readonly id: string; readonly def: PropDef | null; readonly anchor: 'above' | null; readonly aspect: number | null } | null = null
  #onResize = (): void => { if (this.#open) this.#fit() }
  /** A tag anchored to a thing keeps up with it while the camera is still arriving. */
  #following = 0

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
    window.addEventListener('resize', this.#onResize)
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

  /**
   * Open the shell on some content. With `prop`, the content is a piece of
   * furniture growing out of the thing `prop.id` on screen: `def` is its
   * cut-out and surface; `anchor` puts a small tag above the thing instead;
   * `aspect` sizes a picture (the wall) by its own shape.
   */
  #show(kind: string, title: string, html: string,
    prop?: { readonly id: string; readonly def?: PropDef; readonly anchor?: 'above'; readonly aspect?: number }): void {
    this.#clearTimers()
    this.#lastFocus = document.activeElement as HTMLElement | null
    this.#shell.dataset['kind'] = kind
    this.#root.dataset['kind'] = kind
    this.#prop = prop ? { id: prop.id, def: prop.def ?? null, anchor: prop.anchor ?? null, aspect: prop.aspect ?? null } : null
    if (prop) this.#root.dataset['prop'] = prop.id
    else delete this.#root.dataset['prop']
    this.#host.onWorldChange?.(null)
    this.#title.textContent = title
    this.#body.innerHTML = html
    this.#root.hidden = false
    if (prop) this.#fit()
    if (prop?.anchor) this.#follow()
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
    cancelAnimationFrame(this.#following)
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

  /**
   * Where the prop comes from and where it lands.
   *
   * From: the thing's own place on screen, small. To: the middle of the
   * window, at a size where the whole cut-out fits — unless that leaves its
   * surface smaller than can be read, in which case the cut-out is drawn
   * bigger than the window and shifted so the surface is what is centred:
   * the layer looks *into* the monitor, the television, the fridge.
   */
  #fit(): void {
    const prop = this.#prop
    const el = this.#body.querySelector<HTMLElement>('.prop')
    if (!prop || !el) return
    const vw = innerWidth
    const vh = innerHeight
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 78
    const top = navH + 8
    const availW = vw - 24
    const availH = vh - top - 12
    const centreY = top + availH / 2
    const at = this.#host.rectOf?.(prop.id) ?? null
    const fx = at ? at.left + at.width / 2 - vw / 2 : 0
    const fy = at ? at.top + at.height / 2 - vh / 2 : 0
    el.style.setProperty('--fx', `${fx.toFixed(1)}px`)
    el.style.setProperty('--fy', `${fy.toFixed(1)}px`)
    // The layer's middle is the middle of the space under the nav.
    const midShift = centreY - vh / 2

    if (prop.anchor === 'above' && at) {
      // A tag over the thing: no growing to the middle, it sits on the box.
      const h = el.offsetHeight || 120
      let ty = at.top - h / 2 - 10 - vh / 2
      ty = Math.max(top + h / 2 - vh / 2, ty)
      el.style.setProperty('--tx', `${fx.toFixed(1)}px`)
      el.style.setProperty('--ty', `${ty.toFixed(1)}px`)
      el.style.setProperty('--fs', '0.6')
      return
    }
    if (prop.aspect) {
      // A picture: as big as the window allows at its own shape, with room
      // for its caption under it.
      // Room for the caption: under the picture, or beside it on a short window.
      const beside = vh <= 520
      const w = beside
        ? Math.min(availW * 0.92 - 194, availH * 0.94 * prop.aspect)
        : Math.min(availW * 0.92, (availH * 0.94 - 74) * prop.aspect)
      el.style.setProperty('--w', `${Math.round(w)}px`)
      // With the caption beside it, the pair is what is centred.
      el.style.setProperty('--tx', beside ? '-92px' : '0px')
      el.style.setProperty('--ty', `${midShift.toFixed(1)}px`)
      el.style.setProperty('--fs', '0.3')
      return
    }
    const def = prop.def
    if (!def) return
    const ratio = def.h / def.w
    const s = def.surface
    let w = Math.min(availW * 0.94, (availH * 0.94) / ratio)
    let tx = 0
    let ty = midShift
    const surfaceW = w * s.w
    const surfaceH = w * ratio * s.h
    if (surfaceW < def.min.w || surfaceH < def.min.h) {
      // Into the surface. As big as it needs to be to read, but never past
      // what the window can show of the surface itself.
      const need = Math.max(def.min.w / s.w, def.min.h / (s.h * ratio))
      const cap = Math.min((availW * 0.96) / s.w, (availH * 0.96) / (s.h * ratio))
      w = Math.min(Math.max(need, w), cap)
      tx = -(s.x + s.w / 2 - 0.5) * w
      ty = midShift - (s.y + s.h / 2 - 0.5) * w * ratio
    }
    el.style.setProperty('--w', `${Math.round(w)}px`)
    el.style.setProperty('--tx', `${tx.toFixed(1)}px`)
    el.style.setProperty('--ty', `${ty.toFixed(1)}px`)
    el.style.setProperty('--fs', '0.32')
    el.classList.toggle('is-zoomed', w > availW || w * ratio > availH)
  }

  /**
   * The camera is still easing toward the thing when its tag opens, so for
   * a second the tag is re-placed every frame; after that the room is still.
   */
  #follow(): void {
    cancelAnimationFrame(this.#following)
    const until = performance.now() + 1200
    const step = (): void => {
      if (!this.#open || !this.#prop?.anchor) return
      this.#fit()
      if (performance.now() < until) this.#following = requestAnimationFrame(step)
    }
    this.#following = requestAnimationFrame(step)
  }

  /** A slice of the cut-out, for a part that moves on its own (a door). */
  static #slice(def: PropDef, part: Frac, cls: string, extra = ''): string {
    const pos = (v: number, size: number): number => (size >= 1 ? 0 : (v / (1 - size)) * 100)
    return `<div class="prop__part ${cls}" style="left:${part.x * 100}%;top:${part.y * 100}%;width:${part.w * 100}%;height:${part.h * 100}%;`
      + `background-image:url('${def.art}');background-size:${(100 / part.w).toFixed(2)}% ${(100 / part.h).toFixed(2)}%;`
      + `background-position:${pos(part.x, part.w).toFixed(2)}% ${pos(part.y, part.h).toFixed(2)}%" ${extra}></div>`
  }

  /** A region of the cut-out to lay content into. */
  static #region(part: Frac, cls: string, inner: string, extra = ''): string {
    return `<div class="${cls}" style="left:${part.x * 100}%;top:${part.y * 100}%;width:${part.w * 100}%;height:${part.h * 100}%" ${extra}>${inner}</div>`
  }

  /** The cut-out with its content. */
  static #furniture(id: string, def: PropDef, inner: string, cls = ''): string {
    // The old family names stay on the root (tvset, radio…) for the specs
    // and the world that select on them.
    const family: Record<string, string> = { tv: 'tvset', radio: 'radio', cabinet: 'cabinet', shelf: 'shelfcase', workbench: 'bench-top', pc: 'monitor', fridge: 'icebox', 'outside-door': 'door' }
    return `<div class="prop prop--${id} ${family[id] ?? ''} ${cls}" data-prop="${id}" style="--ratio:${def.w}/${def.h}">
      <img class="prop__art" src="${def.art}" alt="" decoding="async">
      ${inner}
    </div>`
  }

  /** Remember a touch, once. */
  #touch(id: string): void {
    if (save.data.touched.includes(id)) return
    save.update((d) => {
      d.touched.push(id)
    })
    this.#host.onProgress?.()
  }

  // ── The PC: the monitor is the interface ────────────────────────────────
  openPc(): void {
    this.#touch('pc')
    const def = PROPS['pc']!
    this.#show(
      'pc',
      'EUNGARAGE OS',
      Panels.#furniture('pc', def, Panels.#region(def.surface, 'prop__surface crt', `
         <div class="crt__screen">
           <p class="crt__boot" data-crt-boot>EUNGARAGE OS<span aria-hidden="true">_</span></p>
           <div class="crt__view" data-crt-view></div>
         </div>`, 'data-crt')),
      { id: 'pc', def },
    )
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
    else this.#later(showList, 300)
  }

  /** The works library, straight from PROJECTS. The five real games and
   *  nothing else: the site's own mini-games live outside, not on this
   *  monitor, and no other object in the room repeats this list. */
  #pcList(view: HTMLElement): void {
    this.#host.onWorldChange?.(null)
    view.innerHTML = `<p class="hub__head">WORKS</p><div class="hub" data-works>${PROJECTS.map(
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
        if (project) {
          audio.play('pc_click', 0.22)
          this.#pcDetail(view, project)
        }
      })
    }
  }

  /** One work, still inside the monitor. Leaving the room is a deliberate act. */
  #pcDetail(view: HTMLElement, project: ProjectConfig): void {
    this.#host.onWorldChange?.(project.world)
    if (!save.data.visitedProjects.includes(project.id)) {
      save.update((d) => {
        d.visitedProjects.push(project.id)
      })
      this.#host.onProgress?.()
    }
    const links = project.links
      .map((l) => `<a class="crtgame__link" href="${l.href}">${l.label} <span aria-hidden="true">↗</span></a>`)
      .join('')
    view.innerHTML = `
      <div class="crtgame">
        <button class="crtgame__back" type="button" data-crt-back>
          <span aria-hidden="true">←</span> WORKS
        </button>
        <div class="crtgame__body">
          <div class="crtgame__art"${shape(project)}></div>
          <div class="crtgame__text">
            <h3 class="crtgame__name">${project.title}</h3>
            <p class="crtgame__tag">${project.tagline}</p>
            <p class="crtgame__tag crtgame__tag--ko">${project.taglineKo}</p>
            <dl class="crtgame__facts">
              <div><dt>GENRE</dt><dd>${project.genre}</dd></div>
              <div><dt>STATUS</dt><dd>${STATUS_LABEL[project.status]}</dd></div>
              <div><dt>PLATFORM</dt><dd>${project.platforms.join(' · ')}</dd></div>
            </dl>
            <div class="crtgame__links">${links}<a class="crtgame__full" href="./games.html#${project.id}">작품 자세히 보기 <span aria-hidden="true">↗</span></a></div>
          </div>
        </div>
      </div>`
    view.querySelector('[data-crt-back]')?.addEventListener('click', () => {
      audio.play('pc_click', 0.22)
      this.#pcList(view)
    })
    view.querySelector<HTMLElement>('[data-crt-back]')?.focus()
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

  /** The next time the TV is opened, open it on this channel. */
  preferChannel(id: ChannelId): void {
    this.#tvChannel = Math.max(0, CHANNELS.findIndex((c) => c.id === id))
  }

  // ── The TV: the tube is the screen, the knobs change the channel ─────────
  openTv(channel?: ChannelId): void {
    this.#touch('tv')
    if (channel) this.#tvChannel = Math.max(0, CHANNELS.findIndex((c) => c.id === channel))
    const def = PROPS['tv']!
    const parts = def.parts!
    this.#show(
      'tv',
      'EUNGARAGE TV',
      Panels.#furniture('tv', def, `
        ${Panels.#region(def.surface, 'prop__surface tvset__screen', `
           <p class="tvset__static" data-tv-static aria-hidden="true"></p>
           <p class="tvset__ch" data-tv-ch aria-live="polite"></p>
           <div class="tvset__view" data-tv-view></div>`, 'data-tv-screen')}
        ${Panels.#region(parts['knobs']!, 'tvset__knobs', `
           <button class="tvset__knob" type="button" data-tv-prev aria-label="이전 채널"><span aria-hidden="true">‹</span></button>
           <button class="tvset__knob" type="button" data-tv-next aria-label="다음 채널"><span aria-hidden="true">›</span></button>`)}
        ${Panels.#region(parts['bezel']!, 'tvset__dial', CHANNELS.map((c, i) =>
          `<button class="tvset__num" type="button" data-tv-go="${i}" aria-label="${c.number} ${c.name}">${c.number.slice(2)}</button>`).join(''))}`,
      ),
      { id: 'tv', def },
    )
    const view = this.#body.querySelector<HTMLElement>('[data-tv-view]')!
    const set = this.#body.querySelector<HTMLElement>('[data-prop="tv"]')!
    set.dataset['tv'] = ''
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
          ? `<div class="tvcontact"><p class="tvrow__brand">EUNGARAGE</p>${rows.map((r) => `<div class="tvrow">
               <span class="tvrow__label">${r.label}</span>
               <a class="tvrow__value" href="${r.href}">${r.value}</a>
               <button class="tvrow__copy" type="button" data-copy="${r.value}" aria-label="${r.label} 복사">COPY</button>
             </div>`).join('')}<a class="tvrow__more" href="./studio.html">STUDIO <span aria-hidden="true">↗</span></a></div>`
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
    const tune = (i: number, first = false): void => {
      this.#tvChannel = (i + CHANNELS.length) % CHANNELS.length
      this.#clearTimers()
      set.classList.add('is-warming')
      view.innerHTML = ''
      // The set's own click on a channel change; the power-on sound was the
      // room's, when the thing was touched.
      if (!first) audio.play('tv_channel', 0.22)
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
    tune(this.#tvChannel, true)
  }

  // ── The radio: the dial is the tuner, the left knob is the power ─────────
  openRadio(): void {
    this.#touch('radio')
    const def = PROPS['radio']!
    const parts = def.parts!
    this.#show(
      'radio',
      'NIGHT RADIO',
      Panels.#furniture('radio', def, `
        ${Panels.#region(parts['grille']!, 'radio__face', `
           <p class="radio__freq" data-radio-freq aria-live="polite">OFF</p>`)}
        ${Panels.#region(parts['dial']!, 'radio__dial', `
           <span class="radio__needle" data-radio-needle aria-hidden="true"></span>
           <span class="radio__glow" aria-hidden="true"></span>`)}
        <div class="radio__stations" role="radiogroup" aria-label="방송국" style="left:${parts['dial']!.x * 100}%;width:${parts['dial']!.w * 100}%;top:${(parts['dial']!.y - 0.075) * 100}%">
          ${STATIONS.map((st, i) => `<button class="radio__st" type="button" role="radio" aria-checked="false" data-station="${i}"
             style="--at:${(dialPosition(Number(st.freq)) * 100).toFixed(1)}%"><b>${st.freq}</b><span>${st.name}</span></button>`).join('')}
        </div>
        ${Panels.#region(parts['left']!, 'radio__knob radio__knob--power', `
           <button class="radio__power" type="button" data-radio-power aria-pressed="false" aria-label="소리 켜기"><span class="radio__mark" aria-hidden="true"></span></button>`)}
        ${Panels.#region(parts['right']!, 'radio__knob radio__knob--tune', `
           <button class="radio__next" type="button" data-radio-next aria-label="다음 방송국"><span class="radio__mark" aria-hidden="true"></span></button>`)}
        <p class="radio__talk" data-radio-talk></p>`,
      ),
      { id: 'radio', def },
    )
    const radio = this.#body.querySelector<HTMLElement>('[data-prop="radio"]')!
    radio.dataset['radio'] = ''
    const freq = this.#body.querySelector<HTMLElement>('[data-radio-freq]')!
    const talk = this.#body.querySelector<HTMLElement>('[data-radio-talk]')!
    const needle = this.#body.querySelector<HTMLElement>('[data-radio-needle]')!
    const power = this.#body.querySelector<HTMLButtonElement>('[data-radio-power]')!

    // The set is already on if the room turned it on (src/systems/audio.ts
    // tunes the garage's own station when sound comes on inside), so the
    // dial shows what is actually playing rather than OFF.
    const playing = STATIONS.findIndex((s) => s.id === audio.station)
    if (playing >= 0) this.#station = playing
    const paint = (): void => {
      const on = sound.enabled
      power.setAttribute('aria-pressed', String(on))
      power.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기')
      radio.dataset['on'] = String(on)
      const st = STATIONS[this.#station]
      radio.dataset['station'] = st?.id ?? ''
      for (const b of this.#body.querySelectorAll<HTMLElement>('[data-station]')) {
        b.setAttribute('aria-checked', String(Number(b.dataset['station']) === this.#station))
      }
      if (st) needle.style.setProperty('--at', `${(dialPosition(Number(st.freq)) * 100).toFixed(1)}%`)
      freq.textContent = st ? `FM ${st.freq} · ${st.name}` : on ? 'FM · · ·' : 'OFF'
    }
    const tuneTo = (i: number): void => {
      this.#station = (i + STATIONS.length) % STATIONS.length
      const st = STATIONS[this.#station]!
      audio.play('radio_tune', 0.2)
      audio.tuneStation(st.id)
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
    this.#body.querySelector('[data-radio-next]')!.addEventListener('click', () => {
      if (!sound.enabled) void sound.setEnabled(true).then(() => tuneTo(this.#station + 1))
      else tuneTo(this.#station + 1)
    })
    power.addEventListener('click', () => {
      void sound.toggle().then(() => {
        if (sound.enabled && this.#station < 0) tuneTo(0)
        else paint()
      })
    })
    paint()
  }

  // ── The fridge: the doors open, and today is on the shelves inside ───────
  openFridge(day = fridgeDay()): void {
    this.#touch('fridge')
    const rng = seededRandom(hashString(`fridge:${day}`))
    const todays = new GarageDiscoveryPool([...FRIDGE_FOOD], { random: rng, recent: 0 }).drawMany('fridge', FRIDGE_SHOWN)
    const memo = new GarageDiscoveryPool([...FRIDGE_MEMOS], { random: seededRandom(hashString(`memo:${day}`)) }).draw('fridge')
    const def = PROPS['fridge']!
    const parts = def.parts!
    const upper = todays.slice(0, 2)
    const lower = todays.slice(2)
    const tile = (i: DiscoveryEntry): string => `<li>
           <button class="chill" type="button" data-item="${i.id}">
             <span class="chill__art"${i.asset ? ` style="background-image:url('${i.asset}')"` : ' data-empty'}></span>
             <span class="chill__label">${esc(i.title)}</span>
           </button>
         </li>`
    this.#show(
      'fridge',
      '오늘의 냉장고',
      Panels.#furniture('fridge', def, `
        ${Panels.#region(def.surface, 'prop__surface fridge fridge__inside', `
           <div class="fridge__light" aria-hidden="true"></div>
           <ul class="fridge__shelves fridge__shelves--top">${upper.map(tile).join('')}</ul>
           ${memo ? `<p class="fridge__memo" data-fridge-memo="${memo.id}">${esc(memo.description)}</p>` : ''}
           <ul class="fridge__shelves fridge__shelves--low">${lower.map(tile).join('')}</ul>
           <p class="fridge__say" data-fridge-say aria-live="polite"></p>`, 'data-fridge')}
        ${Panels.#slice(def, parts['upper']!, 'fridge__door fridge__door--upper', 'data-fridge-door="upper"')}
        ${Panels.#slice(def, parts['lower']!, 'fridge__door fridge__door--lower', 'data-fridge-door="lower"')}
`,
      ),
      { id: 'fridge', def },
    )
    const prop = this.#body.querySelector<HTMLElement>('[data-prop="fridge"]')!
    prop.dataset['day'] = day
    // The doors swing once the fridge has arrived; the light inside comes
    // with them (the room's own light was already on when it was touched).
    const swing = (): void => prop.classList.add('is-open')
    if (motion.reduced) swing()
    else this.#later(swing, 260)
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

  // ── The parcel: the box opens in the room; what was in it comes up ──────
  openParcel(): void {
    this.#touch('parcel')
    const got = this.#draw('parcel')
    this.#host.onThingOpen?.('parcel', true)
    this.#show(
      'parcel',
      '택배',
      `<div class="prop prop--parcel delivery" data-prop="parcel" data-delivery="${got?.id ?? ''}">
         ${got ? `<div class="delivery__out">
           ${got.asset ? `<img class="delivery__thing" src="${got.asset}" alt="" decoding="async">` : ''}
           <b class="delivery__name">${esc(got.title)}</b>
           <span class="delivery__note">${esc(got.description)}</span>
           ${this.#owner(got.owner)}
         </div>
         <span class="delivery__tail" aria-hidden="true"></span>` : ''}
       </div>`,
      { id: 'parcel', anchor: 'above' },
    )
  }

  /** The parcel panel closed: the box in the room closes with it. */
  afterClose(kind: string | undefined): void {
    if (kind === 'parcel') this.#host.onThingOpen?.('parcel', false)
  }

  // ── The cabinet: the drawer comes out and a paper rises from it ─────────
  openCabinet(): void {
    this.#touch('cabinet')
    const paper = this.#draw('cabinet') as CabinetPaper | null
    const def = PROPS['cabinet']!
    const parts = def.parts!
    const files = DOCUMENTS.map(
      (d) => `<li class="file"><a class="file__tab" href="${d.href}">
         <span class="file__name">${d.label}</span>
         <span class="file__go" aria-hidden="true">↗</span>
       </a></li>`,
    ).join('')
    this.#show(
      'cabinet',
      '캐비닛',
      Panels.#furniture('cabinet', def, `
        ${Panels.#region(parts['doors']!, 'drawer drawer__folder', `
           <p class="drawer__label">서류철 · 고객지원과 약관</p>
           <ul class="drawer__files">${files}</ul>`, 'data-drawer')}
        ${Panels.#slice(def, parts['drawer']!, 'drawer__pull', 'data-cabinet-drawer')}
        ${paper ? Panels.#region(def.surface, 'prop__surface drawer__lift', `
           <article class="paper paper--${paper.kind}" data-paper="${paper.id}">
             <h3 class="paper__title">${esc(paper.title)}</h3>
             <p class="paper__body">${esc(paper.description)}</p>
           </article>`) : ''}`,
      ),
      { id: 'cabinet', def },
    )
    const prop = this.#body.querySelector<HTMLElement>('[data-prop="cabinet"]')!
    const out = (): void => {
      prop.classList.add('is-open')
      this.#body.querySelector('[data-drawer]')?.classList.add('is-open')
      audio.play('paper', 0.2)
    }
    if (motion.reduced) out()
    else this.#later(out, 240)
  }

  // ── The shelf: three of their things, on the shelves; one comes forward ─
  openShelf(): void {
    this.#touch('shelf')
    const items = this.pool.drawMany('shelf', SHELF_SHOWN)
    writeSpent(this.pool.spent)
    const def = PROPS['shelf']!
    const parts = def.parts!
    const rows = [parts['top']!, parts['middle']!, parts['bottom']!]
    const seats = [0.22, 0.5, 0.78]
    this.#show(
      'shelf',
      'DOKKA CREW COLLECTION',
      Panels.#furniture('shelf', def, `
        <div class="shelf" data-shelf-items="${items.map((i) => i.id).join(' ')}">
          ${items.map((i, k) => {
            const row = rows[k % rows.length]!
            return `<button class="relic" type="button" data-relic="${i.id}"
               style="left:${(row.x + row.w * seats[k % seats.length]!) * 100}%;top:${(row.y + row.h) * 100}%">
              ${i.asset ? `<span class="relic__art" style="background-image:url('${i.asset}')"></span>` : this.#owner(i.owner)}
              <span class="relic__label">${esc(i.title)}</span>
            </button>`
          }).join('')}
          <div class="shelf__card" data-relic-card hidden></div>
        </div>`,
      ),
      { id: 'shelf', def },
    )
    const card = this.#body.querySelector<HTMLElement>('[data-relic-card]')!
    for (const btn of this.#body.querySelectorAll<HTMLElement>('[data-relic]')) {
      btn.addEventListener('click', () => {
        const item = items.find((i) => i.id === btn.dataset['relic'])
        if (!item) return
        for (const other of this.#body.querySelectorAll('[data-relic]')) {
          other.classList.toggle('is-picked', other === btn)
        }
        card.hidden = false
        card.style.left = btn.style.left
        card.style.top = btn.style.top
        card.innerHTML = `<b class="shelf__name">${esc(item.title)}</b><p class="shelf__note">${esc(item.description)}</p>`
        audio.play('click', 0.22)
      })
    }
  }

  // ── The workbench: what is being worked on, out on the bench ────────────
  openWorkbench(): void {
    this.#touch('workbench')
    const piece = this.#draw('workbench') as WipPiece | null
    const def = PROPS['workbench']!
    const parts = def.parts!
    this.#show(
      'bench',
      '작업대 · WIP',
      Panels.#furniture('workbench', def, `
        <div class="bench2" data-bench data-piece="${piece?.id ?? ''}">
          ${piece ? Panels.#region(parts['board']!, 'bench2__photo', `
             <img class="bench2__img" src="${piece.asset}" alt="${esc(piece.title)}" decoding="async">
             <span class="bench2__pin" aria-hidden="true"></span>`) : ''}
          ${piece ? Panels.#region(parts['block']!, 'bench2__card', `
             <span class="bench2__kind">${piece.kind.toUpperCase()} · ${piece.date}</span>
             <b class="bench2__title">${esc(piece.title)}</b>
             <span class="bench2__note">${esc(piece.description)}</span>
             <code class="bench2__commit">${piece.commit}</code>`) : ''}
          ${Panels.#region(parts['matLeft']!, 'bench bench--mat', `
             <button class="bench__car" type="button" data-bench-car aria-pressed="false"
                     aria-label="조립 중인 장난감 자동차. 누르면 뚜껑을 닫습니다">
               <img data-state="open" src="${ART}/prop_toycar_open.webp" alt="" decoding="async">
               <img data-state="closed" src="${ART}/prop_toycar_closed.webp" alt="" decoding="async">
             </button>`, 'data-bench-props')}
          ${Panels.#region(parts['matRight']!, 'bench bench--tray', `
             <img class="bench__tray" src="${ART}/prop_parts_tray.webp" alt="" decoding="async">
             <p class="bench__note" data-bench-note>태엽 자동차. 뚜껑 열고 기어 맞추는 중.</p>`)}
        </div>`,
      ),
      { id: 'workbench', def },
    )
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

  // ── The outside door: the leaf swings, and there is night behind it ─────
  // The Playground is not built yet; the door does not pretend it is. It
  // opens on the night outside and says what is out there, and the next
  // phase carries the visitor through.
  openOutsideDoor(): void {
    let tried = false
    try {
      tried = sessionStorage.getItem(DOOR_TRIED) === '1'
      sessionStorage.setItem(DOOR_TRIED, '1')
    } catch {
      /* private mode: the door simply forgets */
    }
    this.#touch('outside-door')
    const def = PROPS['outside-door']!
    const parts = def.parts!
    this.#show(
      'door',
      '바깥문',
      Panels.#furniture('outside-door', def, `
        ${Panels.#region(def.surface, 'prop__surface dark', `
           <p class="dark__line">${tried ? '밖에서 여전히 작은 불빛이 움직인다.' : '문틈으로 밤공기가 들어온다.'}</p>
           <p class="dark__sub">도깨비 놀이터로</p>`, 'data-dark data-outside-door')}
        ${Panels.#slice(def, parts['leaf']!, 'door__leaf', 'data-door-leaf')}`,
      ),
      { id: 'outside-door', def },
    )
    const prop = this.#body.querySelector<HTMLElement>('[data-prop="outside-door"]')!
    const dark = this.#body.querySelector<HTMLElement>('[data-dark]')!
    const swing = (): void => {
      prop.classList.add('is-open')
      dark.classList.add('is-ajar')
    }
    if (motion.reduced) swing()
    else this.#later(swing, 260)
  }

  // ── A place outside (PHASE 9): the building grows out of its spot ────────
  /**
   * One of the three buildings in the playground. The delivered cut-out
   * grows out of the painted building, exactly as the furniture does in the
   * garage; inside its doorway, its name, one line, and the way in.
   */
  openPlace(place: Place, onEnter: () => void): void {
    const def = PLACE_PROPS[place.id]
    if (!def) return
    const LINES: Partial<Record<PlaceId, string>> = {
      'poko-office': '부장님이 자리를 비운 사이에만.',
      'snack-stall': '누가 뭘 시켰는지, 30초 안에.',
      'parcel-office': '이번 주 택배를 작품별로.',
    }
    this.#show(
      'place',
      place.label,
      Panels.#furniture(place.id, def, `
        ${Panels.#region(def.surface, 'prop__surface place', `
           <p class="place__name">${esc(place.label)}</p>
           <p class="place__line">${esc(LINES[place.id] ?? '')}</p>
           <button class="place__enter" type="button" data-place-enter>들어가기</button>`, `data-place-surface="${place.id}"`)}`,
        'prop--place'),
      { id: place.id, def },
    )
    this.#body.querySelector('[data-place-enter]')?.addEventListener('click', () => onEnter())
  }

  /**
   * The signpost: not a menu, a hint. The delivered post grows out of the
   * painted one, and its three arms are the three places, each a way to be
   * taken to look at it.
   */
  openSignpost(place: Place, onArm: (target: PlaceId) => void): void {
    const def = PLACE_PROPS[place.id]
    if (!def) return
    this.#show(
      'place',
      place.label,
      Panels.#furniture(place.id, def, `
        ${Panels.#region(def.surface, 'prop__surface sign', SIGNPOST_ARMS.map((a) =>
          `<button class="sign__arm" type="button" data-sign-arm="${a.place}" aria-label="${esc(a.text)} 쪽"><span aria-hidden="true">${esc(a.text)} →</span></button>`).join(''), 'data-signpost')}`,
        'prop--place'),
      { id: place.id, def },
    )
    for (const b of this.#body.querySelectorAll<HTMLElement>('[data-sign-arm]')) {
      b.addEventListener('click', () => onArm(b.dataset['signArm'] as PlaceId))
    }
  }

  // ── In the archive (PHASE 12): the two boxes ─────────────────────────────
  /** The music box: open, swaying a little with its own small sound. */
  openMusicBox(place: ArchivePlace, def: PropDef): void {
    this.#show(
      'archive',
      place.label,
      Panels.#furniture(place.id, def, `
        ${Panels.#region(def.surface, 'prop__surface musicbox', `
           <p class="musicbox__line">태엽은 감겨 있다. 아주 작게 돈다.</p>`, 'data-musicbox')}`,
        'prop--archive'),
      { id: place.id, def },
    )
    const prop = this.#body.querySelector<HTMLElement>(`[data-prop="${place.id}"]`)
    this.#later(() => prop?.classList.add('is-playing'), motion.reduced ? 0 : 420)
  }

  /**
   * The memory box: what the box held is one real day of making — a
   * capture, a sheet, a fix, from the same record the workbench keeps
   * (src/data/garage/workbench.ts), with its date and its commit. Nothing
   * invented.
   */
  openMemoryBox(place: ArchivePlace, def: PropDef): void {
    const piece = this.#draw('workbench') as WipPiece | null
    this.#show(
      'archive',
      place.label,
      Panels.#furniture(place.id, def, `
        ${Panels.#region(def.surface, 'prop__surface memory', piece ? `
           <img class="memory__img" src="${piece.asset}" alt="${esc(piece.title)}" decoding="async">
           <p class="memory__note" data-memory="${piece.id}">${esc(piece.description)}
             <span class="memory__when">${esc(piece.date)} · ${esc(piece.commit)}</span></p>` : `
           <p class="memory__note">상자는 비어 있다.</p>`, 'data-memorybox')}`,
        'prop--archive'),
      { id: place.id, def },
    )
  }

  // ── A piece off the wall: the picture comes forward, and it is the whole thing
  openPoster(project: ProjectConfig): void {
    this.#touch(`poster-${project.id}`)
    const piece = artworkFor(project.id)
    const shot = piece
      ? `<img class="view__img" src="${fullSrc(piece)}" width="${piece.width}" height="${piece.height}"
              alt="${project.title}" decoding="async">`
      : `<span class="view__none">${project.title}</span>`
    const id = project.id === 'rubato' ? 'picture-rubato' : `poster-${project.id}`
    this.#show(
      `poster poster--${project.id}`,
      project.title,
      `<div class="prop prop--wall wall" data-prop="wall" style="--accent:${project.accent}">
         <figure class="view" data-artwork-view${piece ? ` data-orientation="${orientationOf(piece)}"` : ''}>
           ${shot}
           <figcaption class="view__cap">
             <b>${project.title}</b>
             <span>${project.taglineKo}</span>
             <button class="wall__go" type="button" data-poster-go>PC에서 자세히 보기 <span aria-hidden="true">›</span></button>
           </figcaption>
         </figure>
       </div>`,
      { id, aspect: piece ? piece.width / piece.height : 2 / 3 },
    )
    this.#body.querySelector('[data-poster-go]')?.addEventListener('click', () => {
      this.queueProject(project.id)
      this.#host.onGoTo?.('pc')
    })
  }
}
