/**
 * 빌드 중입니다, 부장님 — the first mini-game.
 *
 * POKO is at the next desk, in glasses, being the boss. You are playing a
 * one-button runner when you should be working. Every so often the boss
 * adjusts its glasses and looks up; if the runner is on your screen when it
 * does, you are caught. Switch to the build screen in time and you are
 * working, as far as anyone can tell — and scoring nothing.
 *
 * Two screens, one round of forty-five seconds, and one rule that has to be
 * exactly right: the judgement happens on the tick, from the boss's state
 * and the screen's state as they are on that tick. Nothing is queued, so a
 * switch that landed before the boss looked up counts, and one that landed
 * after does not.
 *
 * The "build" screen is a picture of a build. It lives inside the game's own
 * frame with the game's own timer over it, and says so, because a page that
 * shows a progress bar has an obligation not to be mistaken for the site
 * installing something.
 *
 * POKO's poses come from the garage's own rendered frames — the boss is the
 * same POKO — with the glasses drawn over the face as a separate layer. The
 * garage's POKO is not touched. Where a state has no real pose yet (squinting,
 * the boss's own guilty snack) the nearest frame stands in and the shortfall
 * is listed in the report, not hidden.
 */
import { ticker } from '@/systems/tick'
import { Boss, type BossState } from '@/games/build/boss'
import type { GameDef, GameHost, GameInstance } from '@/games/types'

const ROUND = 45
/** Logical canvas; scaled to the box by CSS. */
const W = 640
const H = 300
const GROUND = 244
const GRAVITY = 2200
const JUMP = -760
const SPEED = 300
/** After coming back from the build screen, this long before things move. */
const RESUME_MS = 800
/** After a collision: no second hit for this long. */
const GRACE_MS = 800

const POKO = '/assets/images/dokkaebi/poko'
const MOMO = '/assets/images/dokkaebi/momo'
const frame = (id: string, action: string, dir: string, n: number): string =>
  `${id === 'poko' ? POKO : MOMO}/${action}/${dir}/${id}_${action}_${dir}_${String(n).padStart(2, '0')}.webp`

interface Obstacle {
  x: number
  w: number
  h: number
  passed: boolean
}

/**
 * What each boss state looks like: frames, whether it faces the player, and
 * where the eyes are in that action's frames — measured off the frames
 * themselves (the centre of the two dark eye clusters, as a fraction of the
 * frame), so the glasses sit on the eyes in every pose rather than at one
 * guessed spot that only fits the standing one.
 */
interface Look {
  action: string
  frames: number
  fps: number
  faces: boolean
  label: string
  /** Eye centre x, y and eye separation, as fractions of the frame. */
  eyes: readonly [number, number, number]
}
const LOOK: Record<BossState | 'CAUGHT', Look> = {
  WORK: { action: 'work', frames: 7, fps: 4, faces: false, label: '업무 중', eyes: [0.515, 0.391, 0.173] },
  DOZE: { action: 'sit', frames: 5, fps: 1.6, faces: false, label: '졸고 있음', eyes: [0.510, 0.520, 0.201] },
  WARN: { action: 'look', frames: 7, fps: 6, faces: false, label: '안경을 고쳐 쓴다', eyes: [0.519, 0.446, 0.148] },
  CHECK: { action: 'idle', frames: 4, fps: 3, faces: true, label: '보고 있다', eyes: [0.524, 0.448, 0.205] },
  CAUGHT: { action: 'look', frames: 1, fps: 1, faces: true, label: '들켰다', eyes: [0.519, 0.446, 0.148] },
}

export const BUILD_GAME: GameDef = {
  id: 'build',
  title: '빌드 중입니다, 부장님',
  hint: '부장님이 안 볼 때 달리고, 고개를 들면 빌드 화면으로 숨기세요.',
  controls: [
    { keys: 'Space', touch: '점프', does: '장애물 넘기' },
    { keys: 'Shift', touch: '전환', does: '게임 ↔ 빌드 화면' },
  ],
  seconds: ROUND,
  mount: (host) => new BuildGame(host),
}

class BuildGame implements GameInstance {
  readonly #host: GameHost
  readonly #root: HTMLElement
  #canvas: HTMLCanvasElement
  #ctx: CanvasRenderingContext2D
  #work: HTMLElement
  #boss: HTMLElement
  #bossImg: HTMLImageElement
  #bossLabel: HTMLElement
  #bossGlasses: HTMLElement
  #status: HTMLElement
  #controls: HTMLElement | null = null

  #boss_ = new Boss({ seconds: ROUND })
  #screen: 'GAME' | 'WORK' = 'GAME'
  #running = false
  #over = false
  #timeLeft = ROUND * 1000
  #score = 0
  #combo = 0
  #resumeLeft = RESUME_MS
  #grace = 0
  #playerY = GROUND
  #vy = 0
  #obstacles: Obstacle[] = []
  #spawnIn = 1400
  #walkPhase = 0
  #bossPhase = 0
  #bossLook: keyof typeof LOOK = 'WORK'
  #buildPct = 47
  #buildLine = 0
  #off: (() => void) | null = null
  #held = new Set<string>()
  #momo: HTMLImageElement[] = []
  #teardown: (() => void)[] = []

  constructor(host: GameHost) {
    this.#host = host
    this.#root = host.root
    this.#root.classList.add('build')
    this.#root.innerHTML = `
      <div class="build__desk" data-build-boss>
        <div class="build__poko">
          <img class="build__pokoImg" alt="" decoding="async" data-boss-img>
          <span class="build__glasses" data-boss-glasses aria-hidden="true"></span>
        </div>
        <p class="build__bossLabel" data-boss-label aria-live="polite">업무 중</p>
      </div>
      <div class="build__screen">
        <canvas class="build__canvas" width="${W}" height="${H}" data-build-canvas aria-label="달리기 게임 화면"></canvas>
        <div class="build__work" data-build-work hidden>
          <div class="build__workHead">
            <span class="build__workDot"></span>
            <span>EUNGARAGE BUILD</span>
            <span class="build__workTag">게임 속 위장 화면</span>
          </div>
          <p class="build__workTitle">빌드 중입니다…</p>
          <div class="build__bar"><span class="build__barFill" data-build-fill style="width:47%"></span></div>
          <pre class="build__log" data-build-log></pre>
        </div>
        <p class="build__status" data-build-status hidden></p>
      </div>`
    this.#canvas = this.#root.querySelector('[data-build-canvas]')!
    this.#ctx = this.#canvas.getContext('2d')!
    this.#work = this.#root.querySelector('[data-build-work]')!
    this.#boss = this.#root.querySelector('[data-build-boss]')!
    this.#bossImg = this.#root.querySelector('[data-boss-img]')!
    this.#bossLabel = this.#root.querySelector('[data-boss-label]')!
    this.#bossGlasses = this.#root.querySelector('[data-boss-glasses]')!
    this.#status = this.#root.querySelector('[data-build-status]')!

    for (let i = 1; i <= 8; i++) {
      const img = new Image()
      img.src = frame('momo', 'walk', 'right', i)
      this.#momo.push(img)
    }
    this.#bossImg.src = frame('poko', 'work', 'front', 1)

    if (host.touch) {
      const c = document.createElement('div')
      c.className = 'build__touch'
      c.innerHTML = `
        <button class="build__pad build__pad--jump" type="button" data-build-jump>점프</button>
        <button class="build__pad build__pad--swap" type="button" data-build-swap>전환</button>`
      this.#root.append(c)
      this.#controls = c
      const jump = c.querySelector('[data-build-jump]')!
      const swap = c.querySelector('[data-build-swap]')!
      const onJump = (e: Event): void => {
        e.preventDefault()
        this.#jump()
      }
      const onSwap = (e: Event): void => {
        e.preventDefault()
        this.#swap()
      }
      jump.addEventListener('pointerdown', onJump)
      swap.addEventListener('pointerdown', onSwap)
      this.#teardown.push(() => {
        jump.removeEventListener('pointerdown', onJump)
        swap.removeEventListener('pointerdown', onSwap)
      })
    }

    const onKeyDown = (e: KeyboardEvent): void => {
      if (!this.#running) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!this.#held.has('Space')) this.#jump()
        this.#held.add('Space')
      } else if (e.key === 'Shift') {
        e.preventDefault()
        if (!this.#held.has('Shift')) this.#swap()
        this.#held.add('Shift')
      }
    }
    const onKeyUp = (e: KeyboardEvent): void => {
      this.#held.delete(e.code === 'Space' ? 'Space' : e.key)
    }
    // Anything that takes the keyboard away lets go of every held key, so a
    // Space held across an alt-tab does not come back as a jump.
    const release = (): void => this.#held.clear()
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('keyup', onKeyUp, true)
    addEventListener('blur', release)
    document.addEventListener('visibilitychange', release)
    this.#root.addEventListener('touchcancel', release)
    this.#teardown.push(() => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('keyup', onKeyUp, true)
      removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', release)
      this.#root.removeEventListener('touchcancel', release)
    })

    this.#draw()
    this.#showBoss('WORK', true)
  }

  start(): void {
    if (this.#over) return
    this.#running = true
    this.#note('준비…')
    this.#off = ticker.subscribe((info) => this.#step(Math.min(info.delta, 64)), 40)
  }

  pause(): void {
    this.#running = false
    this.#held.clear()
    this.#off?.()
    this.#off = null
  }

  resume(): void {
    if (this.#over) return
    this.#running = true
    // Coming back from a pause is the same courtesy as coming back from the
    // build screen: a beat before anything moves.
    this.#resumeLeft = Math.max(this.#resumeLeft, RESUME_MS)
    this.#note('준비…')
    this.#off = ticker.subscribe((info) => this.#step(Math.min(info.delta, 64)), 40)
  }

  destroy(): void {
    this.pause()
    for (const t of this.#teardown) t()
    this.#teardown = []
    this.#controls?.remove()
    this.#root.classList.remove('build')
    this.#root.textContent = ''
  }

  #note(text: string | null): void {
    this.#status.hidden = text === null
    this.#status.textContent = text ?? ''
  }

  #jump(): void {
    if (!this.#running || this.#screen !== 'GAME' || this.#resumeLeft > 0) return
    if (this.#playerY >= GROUND) {
      this.#vy = JUMP
      this.#host.sfx('click', 0.12)
    }
  }

  #swap(): void {
    if (!this.#running || this.#over) return
    this.#screen = this.#screen === 'GAME' ? 'WORK' : 'GAME'
    this.#work.hidden = this.#screen !== 'WORK'
    this.#host.sfx('keyboard', 0.18)
    if (this.#screen === 'GAME') {
      this.#resumeLeft = RESUME_MS
      this.#note('준비…')
    } else {
      this.#note(null)
    }
    // Judged now, on this state, not on the next frame's.
    this.#judge()
  }

  /** Being on the game screen while the boss is looking is being caught. */
  #judge(): void {
    if (this.#over) return
    if (this.#boss_.state === 'CHECK' && this.#screen === 'GAME') this.#caught()
  }

  #caught(): void {
    this.#over = true
    this.#running = false
    this.#showBoss('CAUGHT', true)
    this.#host.sfx('surprise', 0.4)
    this.#note(null)
    this.#draw()
    this.#host.end({
      score: this.#score,
      reason: 'caught',
      detail: `부장님이 보는 중에 게임 화면이 켜져 있었습니다 (${this.#boss_.checks}번째 확인)`,
    })
  }

  #step(dt: number): void {
    if (!this.#running || this.#over) return
    this.#timeLeft -= dt
    this.#host.hud(this.#score, this.#timeLeft / 1000)
    this.#boss_.step(dt)
    this.#judge()
    if (this.#over) return
    this.#animateBoss(dt)

    if (this.#timeLeft <= 0) {
      this.#over = true
      this.#running = false
      this.#note(null)
      this.#host.end({ score: this.#score, reason: 'time', detail: '45초를 버텼습니다' })
      return
    }

    if (this.#screen === 'WORK') {
      // Working, allegedly. The build creeps; the runner is frozen.
      this.#buildPct = Math.min(99, this.#buildPct + dt * 0.0009)
      this.#buildLine += dt
      if (this.#buildLine > 900) {
        this.#buildLine = 0
        this.#log()
      }
      const fill = this.#work.querySelector<HTMLElement>('[data-build-fill]')
      if (fill) fill.style.width = `${this.#buildPct.toFixed(0)}%`
      return
    }

    if (this.#resumeLeft > 0) {
      this.#resumeLeft -= dt
      if (this.#resumeLeft <= 0) this.#note(null)
      this.#draw()
      return
    }

    // The runner.
    const s = dt / 1000
    this.#vy += GRAVITY * s
    this.#playerY = Math.min(GROUND, this.#playerY + this.#vy * s)
    if (this.#playerY >= GROUND) this.#vy = 0
    this.#walkPhase += dt
    this.#grace = Math.max(0, this.#grace - dt)

    this.#spawnIn -= dt
    if (this.#spawnIn <= 0) {
      const h = 26 + Math.random() * 22
      this.#obstacles.push({ x: W + 20, w: 26 + Math.random() * 14, h, passed: false })
      this.#spawnIn = 1100 + Math.random() * 900
    }
    const px = 110
    const pw = 34
    for (const o of this.#obstacles) {
      o.x -= SPEED * s
      const hit = o.x < px + pw - 6 && o.x + o.w > px + 6 && this.#playerY > GROUND - o.h + 4
      if (hit && this.#grace === 0) {
        this.#score = Math.max(0, this.#score - 3)
        this.#combo = 0
        this.#grace = GRACE_MS
        this.#host.sfx('drawer', 0.2)
      }
      if (!o.passed && o.x + o.w < px) {
        o.passed = true
        this.#combo += 1
        this.#score += 1 + Math.min(2, Math.floor(this.#combo / 5))
      }
    }
    this.#obstacles = this.#obstacles.filter((o) => o.x + o.w > -10)
    this.#draw()
  }

  #log(): void {
    const lines = [
      'compiling src/world/room.ts',
      'linking dokkaebi.crew (5 modules)',
      'optimising sprites… ok',
      'bundling assets/audio',
      'checking types (0 errors)',
      'writing dist/',
    ]
    const log = this.#work.querySelector<HTMLElement>('[data-build-log]')
    if (!log) return
    const next = lines[Math.floor(Math.random() * lines.length)]!
    log.textContent = `${log.textContent}\n> ${next}`.split('\n').slice(-5).join('\n')
  }

  // ── The boss ─────────────────────────────────────────────────────────────
  #showBoss(look: keyof typeof LOOK, reset: boolean): void {
    if (this.#bossLook === look && !reset) return
    this.#bossLook = look
    this.#bossPhase = 0
    const l = LOOK[look]
    this.#bossLabel.textContent = l.label
    this.#boss.dataset['state'] = look
    this.#bossImg.src = frame('poko', l.action, 'front', 1)
    // Turning to face the player is shown with the body, not only the label:
    // the glasses catch the light on the warning, and the whole figure turns
    // on the check, so it reads with the sound off.
    this.#boss.classList.toggle('is-facing', l.faces)
    this.#boss.classList.toggle('is-warning', look === 'WARN')
    this.#bossGlasses.classList.toggle('is-glinting', look === 'WARN')
    const [ex, ey, sep] = l.eyes
    const g = this.#bossGlasses.style
    g.setProperty('--gx', `${(ex * 100).toFixed(1)}%`)
    g.setProperty('--gy', `${(ey * 100).toFixed(1)}%`)
    g.setProperty('--gw', `${((sep + 0.17) * 100).toFixed(1)}%`)
  }

  #animateBoss(dt: number): void {
    const state = this.#boss_.state
    this.#showBoss(state, false)
    const l = LOOK[state]
    this.#bossPhase += dt
    const i = 1 + (Math.floor((this.#bossPhase / 1000) * l.fps) % l.frames)
    const src = frame('poko', l.action, 'front', i)
    if (this.#bossImg.getAttribute('src') !== src) this.#bossImg.src = src
    if (state === 'WARN') {
      // How much warning is left, as a shrinking bar under the boss.
      this.#boss.style.setProperty('--warn', String(this.#boss_.left / 1500))
    }
  }

  // ── Drawing ──────────────────────────────────────────────────────────────
  #draw(): void {
    const c = this.#ctx
    c.clearRect(0, 0, W, H)
    c.fillStyle = '#1c1a17'
    c.fillRect(0, 0, W, H)
    // Boards.
    c.fillStyle = '#6b4a2b'
    c.fillRect(0, GROUND, W, H - GROUND)
    c.fillStyle = '#7d5834'
    for (let x = -((this.#walkPhase * 0.3) % 64); x < W; x += 64) c.fillRect(x, GROUND, 60, 4)
    // Obstacles: parcels.
    for (const o of this.#obstacles) {
      c.fillStyle = '#b08652'
      c.fillRect(o.x, GROUND - o.h, o.w, o.h)
      c.fillStyle = '#e6d2b0'
      c.fillRect(o.x + o.w / 2 - 2, GROUND - o.h, 4, o.h)
    }
    // The runner: MOMO, from the garage's own walk frames.
    const img = this.#momo[Math.floor((this.#walkPhase / 1000) * 9) % 8]
    const hh = 64
    const ww = hh * (298 / 420)
    if (img && img.complete && img.naturalWidth > 0) {
      if (this.#grace > 0 && Math.floor(this.#grace / 100) % 2 === 0) c.globalAlpha = 0.4
      c.drawImage(img, 110 + 17 - ww / 2, this.#playerY - hh, ww, hh)
      c.globalAlpha = 1
    } else {
      c.fillStyle = '#f1b7b7'
      c.fillRect(110, this.#playerY - 52, 34, 52)
    }
    // Combo.
    if (this.#combo >= 5) {
      c.fillStyle = '#ffe08a'
      c.font = '700 14px ui-monospace, monospace'
      c.fillText(`x${1 + Math.min(2, Math.floor(this.#combo / 5))}  콤보 ${this.#combo}`, 16, 28)
    }
  }
}
