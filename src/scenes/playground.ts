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

export type PlaygroundHandle = SceneHandle<PlaygroundLayout>

export function mountPlayground(root: ParentNode = document, opts: PlaygroundOptions = {}): PlaygroundHandle | null {
  return mountScene<PlaygroundLayout>(root, {
    root: 'playground',
    layoutFor: playgroundFor,
    ...(opts.onPlace ? { onPlace: opts.onPlace } : {}),
    decorate: (world, layout) => {
      if (motion.reduced) return
      for (const [i, f] of layout.fires.entries()) {
        const img = document.createElement('img')
        img.className = 'playground__fire'
        img.src = '/assets/images/playground/fire.webp'
        img.alt = ''
        img.decoding = 'async'
        img.dataset['fire'] = String(i)
        const w = Math.round(84 * f.scale)
        Object.assign(img.style, {
          left: `${f.x - w / 2}px`, top: `${f.y - Math.round(w * 1.43)}px`, width: `${w}px`,
          animationDuration: `${f.period}s, ${f.period * 1.37}s`,
          animationDelay: `${-f.phase}s, ${-f.phase * 0.7}s`,
        })
        world.append(img)
      }
    },
  })
}
