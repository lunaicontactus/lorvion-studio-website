/**
 * 무궁화꽃이 피었습니다 — 부장님 감시 편.
 *
 * The room is the board. Nothing switches to a game map: the layer this draws
 * into is transparent and the garage is behind it, still lit, with the rest of
 * the crew still at their benches. What is added is two figures and a button.
 *
 * POKO walks the back of the room in glasses. While its back is turned you
 * hold the button and do nothing, and doing nothing is what earns. When it
 * stops and straightens its glasses you have about a second and a half to let
 * go. If it turns round and finds you idle, that is the end of the round.
 *
 * One sentence, and it has to land in three seconds: **부장님 몰래 딴짓하다
 * 들키면 끝.**
 *
 * What is reused rather than rebuilt: the boss's timing, which was already
 * the careful part of the older game (src/games/build/boss.ts → poko/boss.ts);
 * the glasses, which are a CSS layer over the face rather than a new drawing,
 * re-measured for the approved crew; the shell's clock, input, countdown,
 * result, stars and best score (PHASE 4). Nothing here starts a timer or adds
 * a listener.
 *
 * What is *not* reused: everything about running. No jumping, no obstacles,
 * no finish line. The tension is a held button and a decision about when to
 * let go of it.
 */
import { PokoRound, starsFor } from '@/games/poko/round'
import { spritesFor } from '@/data/sprites'
import { seededRandom } from '@/scenes/npc'
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'
import type { SpriteSet } from '@/types/character'

const ROUND = 45

/**
 * Where POKO's eyes are in each pose, as fractions of the frame, measured off
 * the approved frames by scripts/eye_measure.py. Glasses at one guessed spot
 * are glasses on the forehead in half the poses.
 */
const EYES: Readonly<Record<string, readonly [number, number, number]>> = {
  'idle:front': [0.500, 0.452, 0.36],
  'look:front': [0.500, 0.452, 0.36],
  'work:front': [0.500, 0.452, 0.36],
  'walk:left': [0.824, 0.451, 0.17],
  'walk:right': [0.189, 0.446, 0.17],
  'walk:back': [0.500, 0.452, 0.0],
  'walk:front': [0.500, 0.452, 0.36],
}

/** What POKO is doing to look at, for each of its five states. */
const POSE: Readonly<Record<string, { action: string; dir: string; says: string }>> = {
  // Walking has real left and right frames, so the direction is chosen from
  // which way it is going and nothing is mirrored. Mirroring the whole figure
  // would mirror the glasses with it and then mirror them again, which is how
  // a pair of glasses ends up floating beside a head.
  PATROLLING: { action: 'walk', dir: 'right', says: '순찰 중' },
  AWAY: { action: 'walk', dir: 'back', says: '저쪽에 갔다' },
  WARNING: { action: 'look', dir: 'front', says: '안경을 고쳐 쓴다' },
  WATCHING: { action: 'idle', dir: 'front', says: '보고 있다' },
  RECOVER: { action: 'walk', dir: 'front', says: '돌아선다' },
}

export const POKO_GAME: GameDef = {
  id: 'mugunghwa',
  title: '무궁화꽃이 피었습니다',
  hint: '부장님이 안 볼 때 몰래 딴짓하세요. 돌아보면 바로 일하는 척!',
  controls: [
    { keys: 'Space 누르고 있기', touch: '몰래 딴짓 누르고 있기', does: '딴짓 (점수)' },
    { keys: 'Space 떼기', touch: '손 떼기', does: '일하는 척 (안전)' },
  ],
  seconds: ROUND,
  holdKeys: [' ', 'Spacebar', 'ArrowDown', 's', 'S'],
  mount: (host) => new PokoGame(host),
}

class PokoGame implements GameInstance {
  readonly #host: GameHost
  readonly #root: HTMLElement
  #round: PokoRound
  #poko: HTMLElement
  #pokoImg: HTMLImageElement
  #glasses: HTMLElement
  #says: HTMLElement
  #warnBar: HTMLElement
  #player: HTMLElement
  #playerImg: HTMLImageElement
  #prop: HTMLElement
  #bubble: HTMLElement
  #hold: HTMLElement | null = null
  #pokoSet: SpriteSet | null
  #playerSet: SpriteSet | null
  #phase = 0
  #running = false
  #over = false
  /** Held for a beat after being caught, so the moment can be seen. */
  #endIn = 0
  #warned = false

  constructor(host: GameHost) {
    this.#host = host
    this.#root = host.root
    this.#pokoSet = spritesFor('poko')
    this.#playerSet = spritesFor('momo')
    // A pinned patrol when asked for, so a test can replay one exactly.
    const seed = Number(new URLSearchParams(location.search).get('pokoseed'))
    this.#round = new PokoRound({
      seconds: ROUND,
      ...(Number.isFinite(seed) && seed > 0 ? { random: seededRandom(seed) } : {}),
    })

    this.#root.classList.add('poko')
    this.#root.innerHTML = `
      <div class="poko__room" data-poko-room>
        <div class="poko__boss" data-poko-boss data-state="PATROLLING">
          <img class="poko__bossImg" alt="" decoding="async" data-poko-bossimg>
          <span class="poko__glasses" data-poko-glasses aria-hidden="true"></span>
          <span class="poko__bubble" data-poko-bubble hidden>…음?</span>
        </div>
        <p class="poko__says" data-poko-says aria-live="polite">순찰 중</p>
        <div class="poko__warn" data-poko-warn hidden><i></i></div>
        <div class="poko__player" data-poko-player data-slacking="WORK">
          <img class="poko__playerImg" alt="" decoding="async" data-poko-playerimg>
          <span class="poko__prop" data-poko-prop aria-hidden="true"></span>
        </div>
      </div>`
    this.#poko = this.#root.querySelector('[data-poko-boss]')!
    this.#pokoImg = this.#root.querySelector('[data-poko-bossimg]')!
    this.#glasses = this.#root.querySelector('[data-poko-glasses]')!
    this.#says = this.#root.querySelector('[data-poko-says]')!
    this.#warnBar = this.#root.querySelector('[data-poko-warn]')!
    this.#player = this.#root.querySelector('[data-poko-player]')!
    this.#playerImg = this.#root.querySelector('[data-poko-playerimg]')!
    this.#prop = this.#root.querySelector('[data-poko-prop]')!
    this.#bubble = this.#root.querySelector('[data-poko-bubble]')!

    if (host.touch) {
      // One button, the size of a thumb, and it says what it does. No stick,
      // no taps to count: the whole game is holding this and letting go.
      const pad = document.createElement('button')
      pad.type = 'button'
      pad.className = 'poko__hold'
      pad.dataset['pokoHold'] = ''
      pad.setAttribute('aria-label', '몰래 딴짓 — 누르고 있기')
      pad.innerHTML = '<b>몰래 딴짓</b><span>누르고 있기</span>'
      this.#root.append(pad)
      this.#hold = pad
    }

    this.#draw(0)
  }

  // ── The shell drives all of this ─────────────────────────────────────────

  start(): void {
    this.#running = true
    this.#host.sfx('click', 0.2)
  }

  pause(): void {
    this.#running = false
    // Whatever was held is not held any more. The shell has already let go of
    // the input; this is the logical half of the same thing, and it is why
    // alt-tabbing with the button down cannot come back as a caught player.
    this.#round.setSlacking(false)
    this.#paint()
  }

  resume(): void {
    if (this.#over) return
    this.#running = true
  }

  destroy(): void {
    this.#running = false
    this.#root.classList.remove('poko')
    this.#hold?.remove()
    this.#hold = null
    this.#root.textContent = ''
  }

  onInput(event: GameInputEvent): void {
    if (!this.#running || this.#over) return
    if (event.kind === 'HOLD_START') {
      this.#round.setSlacking(true)
      this.#paint()
    }
    if (event.kind === 'HOLD_END') {
      // Instant, and before anything is drawn. Somebody who let go in time
      // let go in time, whatever the picture is doing.
      this.#round.setSlacking(false)
      this.#paint()
    }
  }

  step(dt: number, secondsLeft: number): void {
    if (!this.#running) return
    if (this.#over) {
      this.#endIn -= dt
      if (this.#endIn <= 0) this.#finish()
      return
    }
    const was = this.#round.bossState
    this.#round.step(dt)
    const now = this.#round.bossState

    if (was !== 'WARNING' && now === 'WARNING') {
      this.#warned = true
      this.#host.sfx('click', 0.14)
    }
    if (was !== 'WATCHING' && now === 'WATCHING') this.#host.sfx('bell', 0.12)

    if (this.#round.verdict === 'CAUGHT') {
      this.#caught()
      return
    }
    if (secondsLeft <= 0) {
      this.#round.clear()
      this.#finish()
      return
    }
    this.#phase += dt
    this.#draw(dt)
    this.#host.hud(this.#round.score, secondsLeft)
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  #draw(dt: number): void {
    const look = this.#round.boss.look
    const base = POSE[look.state]!
    const pose = look.state === 'PATROLLING'
      ? { ...base, dir: look.facing < 0 ? 'left' : 'right' }
      : base
    this.#poko.dataset['state'] = look.state
    // Along the back of the room, in the box's own width. The room behind is
    // the backdrop; this is a lane across it.
    this.#poko.style.setProperty('--at', String(look.at))
    this.#says.textContent = pose.says

    const set = this.#pokoSet
    if (set) {
      const anim = (set as unknown as Record<string, Record<string, { frames: readonly string[]; fps: number }>>)[pose.action]?.[pose.dir]
      if (anim && anim.frames.length) {
        const i = Math.floor((this.#phase / 1000) * Math.max(1, anim.fps)) % anim.frames.length
        const src = anim.frames[i]!
        if (this.#pokoImg.getAttribute('src') !== src) this.#pokoImg.src = src
      }
    }
    const eyes = EYES[`${pose.action}:${pose.dir}`] ?? EYES['idle:front']!
    this.#glasses.style.setProperty('--gx', `${eyes[0] * 100}%`)
    this.#glasses.style.setProperty('--gy', `${eyes[1] * 100}%`)
    this.#glasses.style.setProperty('--gw', `${eyes[2] * 100}%`)
    // Out of the picture altogether: the long window, and it should look like
    // one rather than like a character standing still.
    this.#poko.classList.toggle('is-gone', look.state === 'AWAY')
    this.#glasses.classList.toggle('is-glinting', look.state === 'WARNING')

    // The warning, as a bar that runs out. The glint says "something is
    // happening"; the bar says "this much longer".
    const warning = look.state === 'WARNING'
    this.#warnBar.hidden = !warning
    if (warning) this.#warnBar.style.setProperty('--left', String(1 - look.through))

    this.#paint()
    if (dt === 0) this.#paint()
  }

  /** The player, drawn from the logical state and nothing else. */
  #paint(): void {
    const slacking = this.#round.slacking === 'SLACK'
    this.#player.dataset['slacking'] = this.#round.slacking
    const set = this.#playerSet
    if (set) {
      // Working is the back of a head at a bench. Slacking is turning round
      // and doing nothing, with a snack. Nobody could mistake one for the
      // other at a glance, which is the whole requirement.
      const anim = (set as unknown as Record<string, Record<string, { frames: readonly string[]; fps: number }>>)[slacking ? 'idle' : 'work']?.[slacking ? 'front' : 'back']
      if (anim && anim.frames.length) {
        const i = Math.floor((this.#phase / 1000) * Math.max(1, anim.fps)) % anim.frames.length
        const src = anim.frames[i]!
        if (this.#playerImg.getAttribute('src') !== src) this.#playerImg.src = src
      }
    }
    this.#prop.hidden = !slacking
  }

  #caught(): void {
    if (this.#over) return
    this.#over = true
    this.#endIn = 1100
    this.#poko.dataset['state'] = 'CAUGHT'
    this.#bubble.hidden = false
    this.#says.textContent = '들켰다'
    this.#warnBar.hidden = true
    this.#host.sfx('bell', 0.3)
    this.#paint()
  }

  #finish(): void {
    if (!this.#running && this.#over && this.#endIn > 0) return
    const caught = this.#round.verdict === 'CAUGHT'
    const score = this.#round.score
    this.#running = false
    this.#over = true
    this.#host.end({
      score,
      reason: caught ? 'caught' : 'time',
      detail: caught
        ? `부장님이 ${this.#round.survived + 1}번째로 돌아봤을 때 딴짓 중`
        : `${ROUND}초를 버텼습니다 · 넘긴 감시 ${this.#round.survived}회`,
      stars: starsFor(score),
      success: !caught,
    })
  }

  /** The rules, for anything that wants to ask rather than watch. */
  get debug(): { boss: string; slacking: string; score: number; warned: boolean } {
    return {
      boss: this.#round.bossState,
      slacking: this.#round.slacking,
      score: this.#round.score,
      warned: this.#warned,
    }
  }
}
