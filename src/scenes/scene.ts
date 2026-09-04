/**
 * Scene lifecycle.
 *
 * A scene is one place the visitor can be: the alley, the workshop, a project
 * world. Only one is mounted at a time and every scene hands back a teardown,
 * which is how the site avoids the listener and timer leaks that a growing
 * world otherwise accumulates.
 */
import { log } from '@/systems/log'
import { motionDuration } from '@/systems/motion'

export interface SceneContext {
  /** The element the scene owns. */
  readonly root: HTMLElement
  /** Where the visitor came from, for entry direction. */
  readonly from: string | null
}

export interface Scene {
  readonly id: string
  /** Mount into the container. Return a teardown that removes everything. */
  mount(ctx: SceneContext): void | (() => void) | Promise<void | (() => void)>
}

export class SceneManager {
  #container: HTMLElement
  #active: { id: string; teardown: () => void } | null = null
  #scenes = new Map<string, Scene>()
  #transitionMs: number
  /** Guards against a second switch landing while the first is still awaiting. */
  #token = 0

  constructor(container: HTMLElement, transitionMs = 420) {
    this.#container = container
    this.#transitionMs = transitionMs
  }

  get activeId(): string | null {
    return this.#active?.id ?? null
  }

  register(scene: Scene): void {
    this.#scenes.set(scene.id, scene)
  }

  async goto(id: string): Promise<boolean> {
    const scene = this.#scenes.get(id)
    if (!scene) {
      log.error('unknown scene:', id)
      return false
    }
    if (this.#active?.id === id) return true

    const token = ++this.#token
    const from = this.#active?.id ?? null

    await this.#fade('out')
    if (token !== this.#token) return false // superseded mid-transition

    this.#teardownActive()

    const root = document.createElement('div')
    root.className = 'scene'
    root.dataset['scene'] = id
    this.#container.append(root)

    let teardown: (() => void) | undefined
    try {
      const result = await scene.mount({ root, from })
      if (typeof result === 'function') teardown = result
    } catch (err) {
      log.error(`scene "${id}" failed to mount`, err)
      root.remove()
      this.#container.dataset['sceneError'] = id
      await this.#fade('in')
      return false
    }

    if (token !== this.#token) {
      // Another switch won while we were mounting: undo this one.
      teardown?.()
      root.remove()
      return false
    }

    this.#active = {
      id,
      teardown: () => {
        teardown?.()
        root.remove()
      },
    }
    this.#container.dataset['scene'] = id
    delete this.#container.dataset['sceneError']
    await this.#fade('in')
    return true
  }

  destroy(): void {
    this.#token++
    this.#teardownActive()
  }

  #teardownActive(): void {
    if (!this.#active) return
    try {
      this.#active.teardown()
    } catch (err) {
      log.error('scene teardown failed', err)
    }
    this.#active = null
  }

  #fade(dir: 'in' | 'out'): Promise<void> {
    const ms = motionDuration(this.#transitionMs)
    this.#container.dataset['transition'] = dir
    if (ms === 0) return Promise.resolve()
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
