/**
 * The Dokkaebi Playground: outside the garage's door, at night (PHASE 9).
 *
 * The painted plate, the camera and the places are the shared scene
 * (src/scenes/scene.ts). What is the playground's own is the three dokkaebi
 * fires drifting at their own pace — the same drawing three times, each its
 * own size, period and phase, so they never move together — and none of
 * them for a visitor who asked for less motion.
 */
import { mountScene, type SceneHandle } from '@/scenes/scene'
import { playgroundFor, type PlaygroundLayout, type Place } from '@/data/playground'
import { motion } from '@/systems/motion'

export interface PlaygroundOptions {
  /** A place was touched. The host decides what that means. */
  readonly onPlace?: (place: Place) => void
}

export interface PlaygroundHandle extends SceneHandle<PlaygroundLayout> {
  /** Which of the three buildings have given their star: the socket on each sign. */
  setStars(earned: readonly string[]): void
  /** A star just earned at this building: its socket comes on with a little light. */
  lightStar(gameId: string): void
}

export function mountPlayground(root: ParentNode = document, opts: PlaygroundOptions = {}): PlaygroundHandle | null {
  /** The games that have given their star, as last told; applied whenever the plate is built. */
  let earned: readonly string[] = []
  const scene = mountScene<PlaygroundLayout>(root, {
    root: 'playground',
    layoutFor: playgroundFor,
    ...(opts.onPlace ? { onPlace: opts.onPlace } : {}),
    decorate: (world, layout) => {
      // Each game building wears a star socket on its sign: dark until the
      // game has given its star. The rule — a star from each building opens
      // the door in the bookcase — is on the buildings and on the door, not
      // in a message.
      for (const p of layout.places) {
        if (!p.game) continue
        const spot = world.querySelector<HTMLElement>(`[data-place="${p.id}"]`)
        if (!spot) continue
        const socket = document.createElement('span')
        socket.className = 'spot__socket'
        socket.dataset['game'] = p.game
        socket.setAttribute('aria-hidden', 'true')
        socket.innerHTML = '<i class="spot__star"></i>'
        socket.classList.toggle('is-lit', earned.includes(p.game))
        spot.append(socket)
      }
      if (motion.reduced) return
      // The dokkaebi fires: ambient, small, and never in front of anything
      // the visitor is here to look at. Two to three, low, at the edges.
      for (const [i, f] of layout.fires.entries()) {
        const img = document.createElement('img')
        img.className = 'playground__fire'
        img.src = '/assets/images/playground/fire.webp'
        img.alt = ''
        img.decoding = 'async'
        img.dataset['fire'] = String(i)
        const w = Math.round(54 * f.scale)
        Object.assign(img.style, {
          left: `${f.x - w / 2}px`, top: `${f.y - Math.round(w * 1.43)}px`, width: `${w}px`,
          animationDuration: `${f.period * 1.6}s`,
          animationDelay: `${-f.phase}s`,
        })
        world.append(img)
      }
    },
  })
  if (!scene) return null
  const socket = (gameId: string): HTMLElement | null => scene.world.querySelector<HTMLElement>(`.spot__socket[data-game="${gameId}"]`)
  return Object.assign(scene, {
    setStars(ids: readonly string[]): void {
      earned = ids
      for (const el of scene.world.querySelectorAll<HTMLElement>('.spot__socket')) {
        el.classList.toggle('is-lit', earned.includes(el.dataset['game'] ?? ''))
      }
    },
    lightStar(gameId: string): void {
      const el = socket(gameId)
      if (!el) return
      el.classList.add('is-lit')
      el.classList.remove('is-lighting')
      void el.offsetWidth
      el.classList.add('is-lighting')
      setTimeout(() => el.classList.remove('is-lighting'), 1000)
    },
  })
}
