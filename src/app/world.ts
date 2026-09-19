/**
 * Joining the alley to the garage, and running what the room's things do.
 *
 * One page, two places. ENTER finishes its push through the doorway and the
 * garage takes over the screen from exactly that view — no reload, no route
 * change — and the door in the corner of the room brings you back.
 *
 * Everything a thing does goes through one machine (src/systems/interaction),
 * so there is a single answer to "what is open, and may this click happen
 * now". Adding a thing is a registry entry plus a case in `interfaceFor`; no
 * object gets its own listeners scattered through the file.
 */
import { mountAlley } from '@/scenes/alley'
import { mountGarage, type GarageHandle } from '@/scenes/garage'
import { mountPlayground, type PlaygroundHandle } from '@/scenes/playground'
import type { Place } from '@/data/playground'
import { mountArchive, type ArchiveHandle } from '@/scenes/archive'
import { ARCHIVE_PROPS, type ArchivePlace } from '@/data/archive'
import { acknowledge, secretState } from '@/systems/secret'
import { GameRunner } from '@/games/runner'
import { gameById } from '@/games/registry'
import { Panels } from '@/ui/panels'
import { PixelWipe } from '@/ui/pixelWipe'
import type { GameDef } from '@/games/types'
import { Interaction } from '@/systems/interaction'
import { PROJECTS } from '@/data/projects'
import { ROOM_ART, worldFor } from '@/data/world'
import { audio, LOOPS } from '@/systems/audio'
import { motion } from '@/systems/motion'
import { log } from '@/systems/log'
import { save } from '@/systems/storage'
import { loadImage } from '@/systems/assets'
import type { WorldObject } from '@/types/world'

/** What each thing sounds like when it answers a touch. */
const REACT_SFX: Readonly<Record<string, { readonly name: string; readonly volume: number }>> = {
  pc: { name: 'pc_on', volume: 0.3 },
  tv: { name: 'tv_channel', volume: 0.28 },
  fridge: { name: 'fridge_open', volume: 0.36 },
  cabinet: { name: 'drawer_open', volume: 0.3 },
  radio: { name: 'radio_tune', volume: 0.26 },
  'outside-door': { name: 'door_open', volume: 0.3 },
  // The door in the bookcase is a door too, once it opens (a locked touch
  // never reaches here: it only shows its seam).
  'secret-door': { name: 'door_open', volume: 0.24 },
  // The parcel and the shelf have no sound of their own, so they have none.
  workbench: { name: 'paper', volume: 0.24 },
  wall: { name: 'paper', volume: 0.18 },
}

/** Which nav link stands for which thing in the room. */
const NAV_TARGETS: Readonly<Record<string, string>> = {
  games: 'pc',
  // STUDIO keeps its own page: the workbench is work in progress now, not
  // the studio's introduction.
  contact: 'tv',
}

export function mountWorld(): () => void {
  const alleyEl = document.querySelector<HTMLElement>('[data-alley]')
  const garageEl = document.querySelector<HTMLElement>('[data-garage]')
  const panelRoot = document.querySelector<HTMLElement>('[data-panel-root]')
  if (!garageEl || !panelRoot) return () => undefined

  const off: (() => void)[] = []
  let garage: GarageHandle | null = null
  let inside = false
  // ── Outside (PHASE 8/9) ──────────────────────────────────────────────────
  const playgroundEl = document.querySelector<HTMLElement>('[data-playground]')
  const crossingEl = document.querySelector<HTMLElement>('[data-crossing]')
  let playground: PlaygroundHandle | null = null
  /** In the playground rather than the garage. */
  let outside = false
  /** Mid-crossing: nothing else moves between worlds until it is over. */
  let crossing = false
  /**
   * A crossing asked for during a crossing — Back pressed while the night
   * is still going out — waits for it and then happens. Refusing it left
   * the visitor outside with a Back that had done nothing.
   */
  let afterCrossing: (() => void) | null = null
  const crossed = (): void => {
    crossing = false
    const next = afterCrossing
    afterCrossing = null
    next?.()
  }
  const PLAYGROUND_MUSIC = '/assets/audio/music/playground.m4a'
  // ── The archive (PHASE 11–13) ────────────────────────────────────────────
  const archiveEl = document.querySelector<HTMLElement>('[data-archive]')
  let archive: ArchiveHandle | null = null
  /** In the archive rather than the garage. */
  let inArchive = false
  const ARCHIVE_MUSIC = '/assets/audio/music/archive.m4a'
  /** Each game's own track (PHASE 14), a loop derivative of the delivered one. */
  const GAME_MUSIC: Readonly<Record<string, string>> = {
    mugunghwa: '/assets/audio/music/poko.m4a',
    snack: '/assets/audio/music/snack.m4a',
    parcel: '/assets/audio/music/parcel.m4a',
  }
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const later = (fn: () => void, ms: number): void => {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }

  const panels = new Panels(panelRoot, {
    onClose: () => {
      if (outside) closePlace()
      else if (inArchive) closeArchivePlace()
      else interaction.dismiss()
    },
    onGoTo: (id) => goTo(id),
    // The monitor is showing one game: the room takes that game's light, and
    // the panel takes its colour. Null puts both back.
    onWorldChange: (world) => {
      garage?.setWorld(world)
      if (world) panelRoot.dataset['world'] = world
      else delete panelRoot.dataset['world']
    },
    // The parcel in the room opens with its panel and shuts after it.
    onThingOpen: (id, open) => garage?.setThingOpen(id, open),
    // Where the thing is on screen, so its cut-out can grow out of it —
    // in the room, or outside.
    rectOf: (id) => (outside ? playground?.screenRectOf(id) : inArchive ? archive?.screenRectOf(id) : garage?.screenRectOf(id)) ?? null,
  })
  const gameRoot = document.querySelector<HTMLElement>('[data-game-root]')!
  // The door between the painted site and the pixel games (WORLD 2.1).
  const wipe = new PixelWipe()
  off.push(() => wipe.destroy())
  const wait = (ms: number): Promise<void> => new Promise((resolve) => later(resolve, ms))
  const games = new GameRunner(gameRoot, {
    // Leaving a game goes back to wherever it was entered from.
    exitLabel: () => (outside ? '놀이터로' : '차고로'),
    leave: (close) => wipe.cover('', 420).then(() => {
      close()
      return wait(motion.reduced ? 0 : 160)
    }).then(() => wipe.uncover(480)),
    onOpenChange: (open, gameId) => {
      // WORLD 2.1: a game is its own world, entered from its building
      // outside. One music at a time: the game's own while it is up, and the
      // playground's back afterwards; the playground's night air steps out
      // while a game plays so nothing of the painted world sounds under the
      // pixels, and comes back with it.
      const track = GAME_MUSIC[gameId]
      playground?.setPaused(open || !outside)
      garage?.setPaused(open || outside || inArchive)
      document.body.classList.toggle('is-playing', open)
      if (open) {
        audio.unloop('playground', motion.reduced ? 0 : 500)
        if (track) audio.playWorld(track, 0.24, motion.reduced ? 0 : 900)
        else audio.stopWorld(motion.reduced ? 0 : 400)
      } else {
        audio.playWorld(PLAYGROUND_MUSIC, 0.3, motion.reduced ? 0 : 1200)
        audio.loop('playground', LOOPS.playground, 0.3, motion.reduced ? 0 : 1600)
        // A round may have earned the star that opens the door; it is
        // counted when the visitor is back in the room.
        later(() => syncSecret(true), 400)
      }
    },
  })

  const objectById = (id: string): WorldObject | undefined =>
    [...worldFor(false).objects, ...worldFor(true).objects].find((o) => o.id === id)

  /** The interface a thing opens. One place, chosen by the registry. */
  const interfaceFor = (obj: WorldObject): void => {
    const action = obj.action
    if (action.kind === 'exit') {
      leaveGarage()
      return
    }
    if (action.kind === 'project') {
      const project = PROJECTS.find((p) => p.id === action.projectId)
      if (project) panels.openPoster(project)
      return
    }
    // A toggle is the scene's own business; it never gets this far.
    if (action.kind !== 'panel') return
    switch (action.panelId) {
      case 'pc':
        panels.openPc()
        break
      case 'building':
        panels.openWorkbench()
        break
      case 'tv':
        panels.openTv()
        break
      case 'radio':
        panels.openRadio()
        break
      case 'parcel':
        panels.openParcel()
        break
      case 'fridge':
        panels.openFridge()
        break
      case 'cabinet':
        panels.openCabinet()
        break
      case 'shelf':
        panels.openShelf()
        break
      case 'archive':
        // The door in the bookcase, open: the archive is on the other side
        // (PHASE 12). The room has already reacted (the seam, the sound).
        audio.preloadWorld(ARCHIVE_MUSIC)
        later(() => {
          if (interaction.state === 'OBJECT_OPEN' && interaction.activeObjectId === 'secret-door') goArchive()
        }, motion.reduced ? 200 : 600)
        break
      case 'outside':
        // The door opens (PHASE 5's own presentation), and then it is a
        // door: a moment after the leaf swings, the night comes in and the
        // playground is on the other side (PHASE 8). Escape in that moment
        // is a change of mind, and nothing crosses.
        panels.openOutsideDoor()
        audio.preloadWorld(PLAYGROUND_MUSIC)
        later(() => {
          if (interaction.state === 'OBJECT_OPEN' && interaction.activeObjectId === 'outside-door') goOutside()
        }, motion.reduced ? 400 : 1150)
        break
      default:
        log.debug('world: no interface for', action.panelId)
    }
  }

  const interaction = new Interaction({
    focus: (id) => {
      garage?.focusObject(id)
      // The thing answers first — its light comes on and it makes its sound
      // — and its content follows once the camera has arrived (FOCUS_MS).
      garage?.reactObject(id, true)
      const sfx = REACT_SFX[id.replace(/^(poster|picture)-.*/, 'wall')]
      if (sfx) audio.play(sfx.name, sfx.volume)
      // The visitor comes first: whoever is standing at that thing moves off,
      // and nobody starts a new errand while it is open.
      for (const one of garage?.crew ?? []) {
        one.yieldTo(id)
        one.setCalm(true)
      }
    },
    restore: () => {
      // Content is already gone (close); now the thing goes back to how it
      // was and the camera returns.
      for (const obj of [...worldFor(false).objects]) garage?.reactObject(obj.id, false)
      garage?.restoreCamera()
      for (const one of garage?.crew ?? []) one.setCalm(false)
    },
    open: (id) => {
      const obj = objectById(id)
      if (obj) interfaceFor(obj)
    },
    close: () => panels.close(),
    setPaused: (v) => garage?.setPaused(v),
    onUnavailable: (id) => {
      // In the room, but nothing behind it yet. Say so where it stands.
      const el = garageEl.querySelector(`.thing--${id}`)
      el?.classList.add('is-rattling')
      setTimeout(() => el?.classList.remove('is-rattling'), 460)
      // The locked door: the seam shows for a moment, and that is all.
      if (id === 'secret-door') garage?.hintSecret()
    },
  })

  // ── History ──────────────────────────────────────────────────────────────
  // An open thing is a history entry, so Back closes it instead of leaving the
  // site. Nothing else about the page is routed: this is one document.
  const pushOpen = (id: string): void => {
    // pushState fires no popstate, so there is nothing to guard against here.
    history.pushState({ garageObject: id }, '', `#${id}`)
  }
  /**
   * Closing from inside the page consumes its own history entry rather than
   * calling `history.back()`. Back is asynchronous: with two objects opened
   * and closed quickly, its event could arrive after the next entry had been
   * pushed, and the room would re-open the thing you had just shut.
   */
  const popOpen = (): void => {
    if (history.state?.garageObject) history.replaceState({}, '', location.pathname)
  }
  const onPopState = (): void => {
    const st = history.state as { world?: string; place?: string; garageObject?: string } | null
    // Between worlds (PHASE 8): Back from the playground is the garage, and
    // Forward into it is the playground again. A place open outside closes
    // on Back the way a thing open in the room does.
    if (outside) {
      if (st?.world === 'playground') {
        if (panels.isOpen && !st.place) {
          panels.close()
          closePlace()
        }
        return
      }
      comeBack({ fromHistory: true })
      return
    }
    if (inArchive) {
      if (st?.world === 'archive') {
        if (panels.isOpen && !st.place) {
          panels.close()
          closeArchivePlace()
        }
        return
      }
      backFromArchive({ fromHistory: true })
      return
    }
    if (st?.world === 'playground' && inside) {
      goOutside({ fromHistory: true })
      return
    }
    if (st?.world === 'archive' && inside) {
      goArchive({ fromHistory: true })
      return
    }
    // A real Back press. Anything open closes; nothing leaves the page.
    if (interaction.state === 'OBJECT_OPEN') {
      interaction.dismiss()
      return
    }
    const id = String(st?.garageObject ?? location.hash.replace('#', ''))
    if (id && id !== 'playground') goTo(id, { fromHistory: true })
  }
  window.addEventListener('popstate', onPopState)
  off.push(() => window.removeEventListener('popstate', onPopState))

  /** Touch a thing by name: from the room, from the nav, or from a link. */
  const goTo = (id: string, opts: { readonly fromHistory?: boolean } = {}): void => {
    const obj = objectById(id)
    if (!obj) return
    const start = (): void => {
      // The secret door is a cabinet until the three games each have a star.
      const enabled = obj.enabled && (obj.id !== 'secret-door' || secretState().unlocked)
      const started = interaction.request(id, {
        enabled,
        instant: motion.reduced,
      })
      if (started && !opts.fromHistory) pushOpen(id)
    }
    if (inside) start()
    else enterGarage({ then: start })
  }

  // ── The room ─────────────────────────────────────────────────────────────
  const enterGarage = (opts: { readonly then?: () => void } = {}): void => {
    garageEl.hidden = false
    document.body.classList.add('is-inside')
    // A visitor cannot have interacted without a gesture reaching us first.
    audio.unlock()
    // The room's own sound, if sound is on, unless the entrance has already
    // brought it up under the door (`onBeat` below).
    if (!soundUnderDoor) audio.enterRoom()
    soundUnderDoor = false
    if (!garage) {
      garage = mountGarage(document, {
        onObject: (obj) => goTo(obj.id),
        onExit: () => leaveGarage(),
      })
    }
    inside = true
    log.debug('world: inside the garage')
    // The door in the bookcase shows how far the three games have got; the
    // moment it opens is shown here, once the room is in front of the
    // visitor rather than under the door.
    later(() => syncSecret(true), 1200)
    if (opts.then) setTimeout(opts.then, 60)
  }

  const leaveGarage = (): void => {
    interaction.dismiss({ instant: true })
    garageEl.hidden = true
    document.body.classList.remove('is-inside')
    inside = false
    alleyEl?.classList.remove('alley--inside', 'alley--push')
    audio.leaveRoom()
    // Out the way it came in: the shutter.
    audio.play('shutter_open', 0.26)
  }

  // ── Outside: the crossing, the places, the way back ──────────────────────
  /** Night in, then the promise; night out is the caller's. */
  /**
   * `ms` is how long the night takes to come in (or go out); the crossing's
   * CSS transition is set to match, so the promise and the picture agree.
   * `dusk` is the outward journey's own night (WORLD 2.1): deep blue with the
   * doorway's warm light in the middle of it, rather than plain dark.
   */
  const dark = (quick: boolean, ms = 660, dusk = false): Promise<void> => new Promise((resolve) => {
    if (!crossingEl) {
      resolve()
      return
    }
    const t = quick ? 170 : ms
    crossingEl.style.setProperty('--cross-ms', `${t}ms`)
    crossingEl.classList.toggle('is-dusk', dusk && !quick)
    crossingEl.hidden = false
    void crossingEl.offsetWidth
    crossingEl.classList.add('is-dark')
    later(resolve, t)
  })
  const light = (quick: boolean, ms = 660): Promise<void> => new Promise((resolve) => {
    if (!crossingEl) {
      resolve()
      return
    }
    const t = quick ? 170 : ms
    crossingEl.style.setProperty('--cross-ms', `${t}ms`)
    crossingEl.classList.remove('is-dark')
    later(() => {
      crossingEl.hidden = true
      crossingEl.classList.remove('is-dusk')
      resolve()
    }, t)
  })
  /** A breath in the dark, between one place and the next. */
  const pause = (ms: number): Promise<void> => new Promise((resolve) => later(resolve, ms))

  /**
   * The way out to the playground, in time (WORLD 2.1). Not a cut: the
   * room's sound goes down with the light, the night outside comes in from
   * the doorway, there is a breath of dark in which the playground's own air
   * starts, and then it is there — a little close and dim at first, settling
   * back to itself — and its places show their rings and names only as the
   * night lifts. About four seconds from the door to a playground you can
   * touch; the reduced-motion visitor gets the quick cut.
   */
  const OUT = { dark: 1300, breath: 450, light: 1400, settle: 2600 } as const

  /**
   * Through the door (PHASE 8). The room's sound goes down as the night
   * comes in; on the other side the playground is up and its music comes up
   * under it. The garage stays mounted and simply waits, paused, with
   * everything where it was, which is what coming back finds.
   */
  const goOutside = (o: { readonly fromHistory?: boolean; readonly instant?: boolean } = {}): void => {
    if (outside || !playgroundEl) return
    if (crossing) {
      afterCrossing = () => goOutside(o)
      return
    }
    crossing = true
    const quick = motion.reduced || o.instant === true
    audio.leaveRoom(quick ? 0 : OUT.dark + 500)
    void dark(quick, OUT.dark, true).then(() => {
      interaction.dismiss({ instant: true })
      garageEl.hidden = true
      garage?.setPaused(true)
      if (!playground) playground = mountPlayground(document, { onPlace })
      playgroundEl.hidden = false
      // Arriving: close and dim, and nothing to touch yet (styles/playground.css).
      if (!quick) playgroundEl.classList.add('is-arriving', 'is-hushed')
      playground?.setPaused(false)
      document.body.classList.add('is-outside')
      outside = true
      // The air first, in the dark; the song a moment after it.
      audio.loop('playground', LOOPS.playground, 0.3, quick ? 0 : 2400)
      audio.playWorld(PLAYGROUND_MUSIC, 0.3, quick ? 0 : 2800)
      if (!o.fromHistory) {
        // The door's own entry (pushed when it was touched) becomes the
        // playground's: Back from outside is the room, not the door again.
        const st = history.state as { garageObject?: string } | null
        if (st?.garageObject === 'outside-door') history.replaceState({ world: 'playground' }, '', '#playground')
        else history.pushState({ world: 'playground' }, '', '#playground')
      }
      log.debug('world: outside')
      return quick ? light(true) : pause(OUT.breath).then(() => {
        void playgroundEl.offsetWidth
        playgroundEl.classList.add('is-settling')
        later(() => playgroundEl.classList.remove('is-arriving', 'is-settling'), OUT.settle)
        // The places come up as the night lifts; the picture keeps settling.
        return light(false, OUT.light).then(() => playgroundEl.classList.remove('is-hushed'))
      })
    }).then(crossed)
  }

  /** Back through the arch: the garage as it was left. */
  const comeBack = (o: { readonly fromHistory?: boolean } = {}): void => {
    if (!outside || !playgroundEl) return
    if (crossing) {
      afterCrossing = () => comeBack(o)
      return
    }
    crossing = true
    const quick = motion.reduced
    if (panels.isOpen) {
      panels.close()
      closePlace()
    }
    audio.stopWorld(quick ? 0 : 500)
    audio.unloop('playground', quick ? 0 : 600)
    void dark(quick).then(() => {
      playgroundEl.hidden = true
      playground?.setPaused(true)
      document.body.classList.remove('is-outside')
      garageEl.hidden = false
      garage?.setPaused(false)
      outside = false
      audio.enterRoom(quick ? null : { tone: 900, music: 1400, musicAfter: 300 })
      if (!o.fromHistory && (history.state as { world?: string } | null)?.world === 'playground') {
        history.replaceState({}, '', location.pathname)
      }
      log.debug('world: back inside')
      // The stars earned outside are counted at the door.
      later(() => syncSecret(true), 900)
      return light(quick)
    }).then(crossed)
  }

  /**
   * The door in the bookcase: how far the three games have got, shown on
   * the door; and, the first time all three have a star, the moment it
   * opens — once, and remembered so a reload finds it open quietly.
   */
  const syncSecret = (mayCelebrate: boolean): void => {
    if (!garage) return
    const s = secretState()
    const celebrate = mayCelebrate && inside && !outside && !inArchive && s.unlocked && !s.celebrated
    garage.setSecret(s, celebrate)
    if (celebrate) audio.play('secret_unlock', 0.4)
    acknowledge(s.have)
  }

  /** Through the door in the bookcase (PHASE 12). The same night, in and out. */
  const goArchive = (o: { readonly fromHistory?: boolean; readonly instant?: boolean } = {}): void => {
    if (inArchive || outside || !archiveEl) return
    if (!secretState().unlocked) return
    if (crossing) {
      afterCrossing = () => goArchive(o)
      return
    }
    crossing = true
    const quick = motion.reduced || o.instant === true
    audio.leaveRoom(quick ? 0 : 700)
    void dark(quick).then(() => {
      interaction.dismiss({ instant: true })
      garageEl.hidden = true
      garage?.setPaused(true)
      if (!archive) archive = mountArchive(document, { onPlace: onArchivePlace })
      archiveEl.hidden = false
      archive?.setPaused(false)
      document.body.classList.add('is-in-archive')
      inArchive = true
      audio.playWorld(ARCHIVE_MUSIC, 0.26, quick ? 0 : 1600)
      // The same night air as the room, lower: it is the same building.
      audio.toggleAmbient(true, 0.1)
      if (!o.fromHistory) {
        const st = history.state as { garageObject?: string } | null
        if (st?.garageObject === 'secret-door') history.replaceState({ world: 'archive' }, '', '#archive')
        else history.pushState({ world: 'archive' }, '', '#archive')
      }
      log.debug('world: in the archive')
      return light(quick)
    }).then(crossed)
  }

  const backFromArchive = (o: { readonly fromHistory?: boolean } = {}): void => {
    if (!inArchive || !archiveEl) return
    if (crossing) {
      afterCrossing = () => backFromArchive(o)
      return
    }
    crossing = true
    const quick = motion.reduced
    archive?.setHealing(false)
    archive?.closeSky()
    if (panels.isOpen) {
      panels.close()
      closeArchivePlace()
    }
    audio.stopWorld(quick ? 0 : 500)
    void dark(quick).then(() => {
      archiveEl.hidden = true
      archive?.setPaused(true)
      document.body.classList.remove('is-in-archive')
      garageEl.hidden = false
      garage?.setPaused(false)
      inArchive = false
      audio.enterRoom(quick ? null : { tone: 900, music: 1400, musicAfter: 300 })
      if (!o.fromHistory && (history.state as { world?: string } | null)?.world === 'archive') {
        history.replaceState({}, '', location.pathname)
      }
      log.debug('world: back from the archive')
      return light(quick)
    }).then(crossed)
  }

  /** Something in the archive was touched. */
  const onArchivePlace = (place: ArchivePlace): void => {
    if (crossing || !archive) return
    if (archive.healing) return
    // The touch that ended the rest is not also a touch on a thing: a key
    // on the cushion's button, or a click that lands on a place, has done
    // its work already.
    if (performance.now() - healingEndedAt < 600) return
    switch (place.id) {
      case 'star-jar':
        archive.sparkle()
        audio.play('star_get', 0.22)
        return
      case 'lantern':
        archive.toggleLantern()
        audio.play('lantern', 0.3)
        return
      case 'telescope':
        archive.openSky()
        return
      case 'cushion':
        startHealing()
        return
      case 'polaroids': {
        if (panels.isOpen) return
        archive.setActive(place.id)
        archive.setPaused(true)
        audio.play('paper', 0.2)
        // ?album=empty shows the table as it looks before any photo is added.
        panels.openPolaroids(place, new URLSearchParams(location.search).get('album') === 'empty' ? [] : undefined)
        history.pushState({ world: 'archive', place: place.id }, '', '#archive')
        return
      }
      case 'music-box':
      case 'memory-box': {
        if (panels.isOpen) return
        const def = ARCHIVE_PROPS[place.id]
        if (!def) return
        archive.setActive(place.id)
        archive.focusPlace(place.id)
        archive.setPaused(true)
        if (place.id === 'music-box') {
          // Its own tune, wound and playing, with the archive's song
          // stepped back under it until the lid is closed.
          audio.dimWorld(0.3, 700)
          audio.loop('musicBox', LOOPS.musicBox, 0.34, 900)
          panels.openMusicBox(place, def)
        } else {
          audio.play('paper', 0.2)
          panels.openMemoryBox(place, def)
        }
        history.pushState({ world: 'archive', place: place.id }, '', '#archive')
        return
      }
    }
  }

  const closeArchivePlace = (): void => {
    if (audio.loopPlaying('musicBox')) {
      audio.unloop('musicBox', 700)
      audio.dimWorld(1, 900)
    }
    if (!archive) return
    archive.setActive(null)
    archive.restoreCamera()
    archive.setPaused(false)
    if ((history.state as { place?: string } | null)?.place) {
      history.replaceState({ world: 'archive' }, '', '#archive')
    }
  }

  // ── Healing Mode (PHASE 13): rest, until anything is touched ────────────
  let healingSince = 0
  let healingEndedAt = -Infinity
  const startHealing = (): void => {
    if (!archive || archive.healing) return
    healingSince = performance.now()
    archive.setHealing(true)
  }
  const endHealing = (e?: Event): void => {
    if (!archive?.healing) return
    // Not the touch that started it.
    if (performance.now() - healingSince < 400) return
    if (e instanceof KeyboardEvent && (e.key === 'Tab' || e.key === 'Shift')) return
    healingEndedAt = performance.now()
    archive.setHealing(false)
  }
  document.addEventListener('pointerdown', endHealing, true)
  document.addEventListener('keydown', endHealing, true)
  off.push(() => {
    document.removeEventListener('pointerdown', endHealing, true)
    document.removeEventListener('keydown', endHealing, true)
  })

  /** A place outside was touched. */
  const onPlace = (place: Place): void => {
    if (crossing || !playground) return
    if (place.id === 'garage-door') {
      comeBack()
      return
    }
    if (panels.isOpen) return
    playground.setActive(place.id)
    playground.focusPlace(place.id)
    playground.setPaused(true)
    if (place.id === 'signpost') {
      panels.openSignpost(place, (target) => {
        panels.close()
        closePlace()
        playground?.focusPlace(target)
        // The camera is on it: nothing else, the visitor decides.
        later(() => playground?.restoreCamera(), 2400)
      })
    } else {
      // The game's track, fetched while its building is open.
      if (place.game && GAME_MUSIC[place.game]) audio.preloadWorld(GAME_MUSIC[place.game]!)
      const def = place.game ? gameById(place.game) : undefined
      const go = (): void => {
        if (!def || !panels.isOpen || entering) return
        entering = true
        panels.close()
        closePlace()
        enterGame(def)
      }
      panels.openPlace(place, go)
      // WORLD 2.1: the building answers — its sign lights, with the lantern's
      // own sound — and a moment later the screen goes to pixels and the game
      // is there. 들어가기 is still the immediate way; Escape still says no.
      later(() => {
        if (!panels.isOpen) return
        document.querySelector(`.prop--place[data-prop="${place.id}"]`)?.classList.add('is-lit')
        audio.play('lantern', 0.28)
      }, motion.reduced ? 0 : 380)
      const opened = panelsOpenedAt = performance.now()
      later(() => {
        if (panelsOpenedAt === opened) go()
      }, motion.reduced ? 400 : 1600)
    }
    history.pushState({ world: 'playground', place: place.id }, '', '#playground')
  }

  /** Into a game, through the pixels: covered, the title, the game, uncovered. */
  let entering = false
  let panelsOpenedAt = 0
  const enterGame = (def: GameDef): void => {
    void wipe.cover(def.title, 460)
      // The game's name, long enough to read.
      .then(() => wait(motion.reduced ? 0 : 750))
      .then(() => {
        games.open(def)
        return wait(80)
      })
      .then(() => wipe.uncover(440))
      .finally(() => { entering = false })
  }

  /** The place is given back: unringed, the camera returned, the world moving. */
  const closePlace = (): void => {
    // Whatever was about to happen at the place does not, now.
    panelsOpenedAt = -1
    if (!playground) return
    playground.setActive(null)
    playground.restoreCamera()
    playground.setPaused(false)
    if ((history.state as { place?: string } | null)?.place) {
      history.replaceState({ world: 'playground' }, '', '#playground')
    }
  }

  // ── Escape, and the nav ──────────────────────────────────────────────────
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    if (inArchive) {
      // The sky closes itself on Escape (src/scenes/archive.ts).
      if (archive?.skyOpen) return
      if (panels.isOpen) {
        e.preventDefault()
        // A photo in the hand goes back on the table before anything closes.
        if (panels.stepBack()) return
        panels.close()
        closeArchivePlace()
      }
      return
    }
    if (outside) {
      if (panels.isOpen) {
        e.preventDefault()
        panels.close()
        closePlace()
      }
      return
    }
    // Also while the camera is still on its way: a visitor who presses Escape
    // during the move means it, and should not have a panel open on them.
    if (interaction.state !== 'OBJECT_OPEN' && interaction.state !== 'OBJECT_FOCUSING') return
    e.preventDefault()
    popOpen()
    interaction.dismiss()
  }
  document.addEventListener('keydown', onKey)
  off.push(() => document.removeEventListener('keydown', onKey))

  // The top nav and the room are the same site: GAMES is the PC.
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.nav-links a')) {
    const key = (link.textContent ?? '').trim().toLowerCase()
    const target = NAV_TARGETS[key]
    if (!target) continue // STUDIO and SUPPORT keep their own pages.
    const onClick = (e: MouseEvent): void => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      // CONTACT is a channel on the television, not the television's first one.
      if (key === 'contact') panels.preferChannel('contact')
      goTo(target)
    }
    link.addEventListener('click', onClick)
    off.push(() => link.removeEventListener('click', onClick))
  }

  // ── The room, fetched before it is asked for ─────────────────────────────
  // The painted room is the biggest file on the site, and it used to start
  // downloading only once the shutter was already up: for about a second
  // after ENTER the room was a brown space with one dokkaebi standing in it.
  // It is fetched quietly while the visitor is still outside, once the
  // entrance has had the network to itself.
  const warmRoom = (): void => {
    const portrait = matchMedia('(orientation:portrait)').matches
    const img = new Image()
    img.decoding = 'async'
    img.setAttribute('fetchpriority', 'low')
    img.src = portrait ? ROOM_ART.portrait.src : ROOM_ART.landscape.src
  }
  const warmTimer = setTimeout(warmRoom, 900)
  off.push(() => clearTimeout(warmTimer))
  /**
   * Whether the room's plate is here (PHASE 7). The entrance asks at the
   * moment the camera is through the door: if the answer is still on its
   * way, it says so and waits for it, and never otherwise.
   */
  const roomReady = (): Promise<unknown> | null => {
    const portrait = matchMedia('(orientation:portrait)').matches
    const src = portrait ? ROOM_ART.portrait.src : ROOM_ART.landscape.src
    // Already decoded and cached: nothing to wait for. Otherwise the shared
    // load — the same request as the warm-up above and the room's own
    // background, never a second download — and the entrance waits on it.
    const probe = new Image()
    probe.src = src
    if (probe.complete && probe.naturalWidth > 0) return null
    return loadImage(src)
  }
  /** The entrance brought the room's sound up under the door already. */
  let soundUnderDoor = false

  off.push(
    mountAlley(document, {
      // Somebody who has been here before gets the short door. Read at
      // ENTER: the count is written at boot (registerVisit), once a session.
      returning: () => save.data.visitCount > 1,
      ready: roomReady,
      // The sound is on the picture (PHASE 7): the shutter as it goes up,
      // the room's air as its light comes on, its song under that a moment
      // later — all from the one gesture that started the door.
      onBeat: (beat) => {
        if (beat === 'enter') {
          audio.unlock()
          // The alley's own night air, for the moment before the shutter.
          audio.loop('alley', LOOPS.alley, 0.3, 500)
        }
        if (beat === 'rise') audio.play('shutter_open', 0.34)
        if (beat === 'light' || beat === 'skip') {
          // Inside, the room's air takes over from the street's.
          audio.unloop('alley', beat === 'skip' ? 300 : 1800)
          if (soundUnderDoor) return
          soundUnderDoor = true
          audio.enterRoom({ tone: 1400, music: 2200, musicAfter: 700 })
        }
      },
      onEntered: () => {
        enterGarage()
        // Someone arrived on /#pc: open it once the room is up. Or on
        // /#playground: through the door, without the ceremony.
        const wanted = location.hash.replace('#', '')
        if (wanted === 'playground') setTimeout(() => goOutside({ fromHistory: true, instant: true }), 300)
        else if (wanted === 'archive') setTimeout(() => goArchive({ fromHistory: true, instant: true }), 300)
        else if (wanted && objectById(wanted)) setTimeout(() => goTo(wanted, { fromHistory: true }), 240)
        // And /?play=<id> opens a game straight away. It is how the shell is
        // walked end to end in a test, and until the Dokkaebi Playground is
        // built it is the only way into the site's mini-games: they are not
        // on the PC, which holds the real works only.
        const play = new URLSearchParams(location.search).get('play')
        const def = play ? gameById(play) : undefined
        if (def) {
          // The games live outside (WORLD 2.1): out first, without the
          // ceremony, then straight into the game.
          setTimeout(() => goOutside({ fromHistory: true, instant: true }), 200)
          const open = (): void => {
            if (outside && !crossing) games.open(def)
            else setTimeout(open, 80)
          }
          setTimeout(open, 420)
        }
      },
    }),
  )

  return () => {
    interaction.destroy()
    garage?.destroy()
    playground?.destroy()
    archive?.destroy()
    for (const t of timers) clearTimeout(t)
    timers.clear()
    for (const fn of off) fn()
    off.length = 0
  }
}
