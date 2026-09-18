/**
 * A game that is barely a game, for proving the shell.
 *
 * It exists so the lifecycle — ready, countdown, playing, pause, resume,
 * result, retry, exit — can be walked end to end before any real game is
 * written, and so the tests for that lifecycle do not depend on being good at
 * a running game. It counts the frames it is given and the presses it is
 * handed, which is exactly enough to tell whether it is being driven, whether
 * it is being driven twice, and whether it is still being driven while paused.
 *
 * It is not in the registry and there is no route to it. The only way it
 * reaches a browser is a test mounting it, which is the point: a mock game in
 * the games list is a mock game somebody eventually plays.
 */
import type { GameDef, GameHost, GameInstance } from '@/games/types'
import type { GameInputEvent } from '@/games/input'

export interface MockLog {
  readonly calls: string[]
  readonly frames: number
  readonly inputs: GameInputEvent[]
}

class MockGame implements GameInstance {
  readonly #host: GameHost
  readonly calls: string[] = []
  readonly inputs: GameInputEvent[] = []
  frames = 0
  #score = 0
  #running = false

  constructor(host: GameHost) {
    this.#host = host
    host.root.innerHTML = '<p class="mock" data-mock>준비</p>'
    this.calls.push('mount')
  }

  start(): void {
    this.#running = true
    this.calls.push('start')
    this.#say('가는 중')
  }

  pause(): void {
    this.#running = false
    this.calls.push('pause')
    this.#say('멈춤')
  }

  resume(): void {
    this.#running = true
    this.calls.push('resume')
    this.#say('가는 중')
  }

  destroy(): void {
    this.#running = false
    this.calls.push('destroy')
    this.#host.root.textContent = ''
  }

  step(dt: number, secondsLeft: number): void {
    // Counted even if the shell has got it wrong and is stepping a paused
    // game: the count is how the test finds that out.
    this.frames += 1
    if (!this.#running) {
      this.calls.push('stepped-while-paused')
      return
    }
    this.#score += Math.round(dt / 100)
    this.#host.hud(this.#score, secondsLeft)
  }

  onInput(event: GameInputEvent): void {
    this.inputs.push(event)
    if (event.kind === 'SELECT') {
      this.#score += 10
      this.#host.hud(this.#score, 0)
    }
    if (event.kind === 'SELECT' && event.choice === 'end') {
      this.#host.end({ score: this.#score, reason: 'done', detail: '끝냈습니다', stars: 2, success: true })
    }
  }

  #say(text: string): void {
    const el = this.#host.root.querySelector('[data-mock]')
    if (el) el.textContent = text
  }
}

/** The instance the last mount made, so a test can read what it saw. */
export let lastMock: MockGame | null = null

export const MOCK_GAME: GameDef = {
  id: 'mock',
  title: '테스트',
  hint: '셸을 확인하기 위한 것입니다.',
  controls: [{ keys: 'Space', touch: '누르기', does: '아무것도' }],
  seconds: 6,
  mount: (host) => {
    const game = new MockGame(host)
    lastMock = game
    return game
  },
}
