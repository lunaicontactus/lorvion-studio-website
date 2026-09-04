/**
 * Asset loading with a visible, non-fatal failure path.
 *
 * A missing sprite must never leave a hole that swallows clicks or an empty
 * frame that looks like a bug. Anything that fails to load is marked so CSS
 * can show a soft placeholder, and the promise still resolves.
 */
import { log } from '@/systems/log'

export interface LoadedImage {
  readonly src: string
  readonly ok: boolean
  readonly image: HTMLImageElement | null
}

const cache = new Map<string, Promise<LoadedImage>>()

export function loadImage(src: string, timeoutMs = 10_000): Promise<LoadedImage> {
  const hit = cache.get(src)
  if (hit) return hit

  const p = new Promise<LoadedImage>((resolve) => {
    const img = new Image()
    let settled = false
    const done = (ok: boolean): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (!ok) log.warn('asset failed:', src)
      resolve({ src, ok, image: ok ? img : null })
    }
    const timer = setTimeout(() => done(false), timeoutMs)
    img.addEventListener('load', () => done(true), { once: true })
    img.addEventListener('error', () => done(false), { once: true })
    img.decoding = 'async'
    img.src = src
  })

  cache.set(src, p)
  return p
}

export async function loadImages(srcs: readonly string[]): Promise<LoadedImage[]> {
  return Promise.all(srcs.map((s) => loadImage(s)))
}

/**
 * Mark broken <img> elements so styles can dress the gap instead of showing
 * the browser's torn-image icon. Returns a teardown.
 */
export function installImageFallback(root: ParentNode = document): () => void {
  const onError = (event: Event): void => {
    const el = event.target
    if (el instanceof HTMLImageElement) {
      el.dataset['assetFailed'] = 'true'
      log.warn('image failed, placeholder shown:', el.currentSrc || el.src)
    }
  }
  // Capture: <img> error events do not bubble.
  root.addEventListener('error', onError, true)
  return () => root.removeEventListener('error', onError, true)
}
