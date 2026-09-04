/**
 * The sound switch.
 *
 * Turning sound on is the gesture that unlocks audio, so the toggle is the only
 * place a context is ever created.
 */
import { sound } from '@/systems/sound'

export function mountSoundToggle(root: ParentNode = document): () => void {
  const btn = root.querySelector<HTMLButtonElement>('[data-sound-toggle]')
  if (!btn) return () => undefined

  const paint = (on: boolean): void => {
    btn.setAttribute('aria-pressed', String(on))
    btn.dataset['state'] = on ? 'on' : 'off'
    btn.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기')
  }
  paint(sound.enabled)

  const onClick = (): void => {
    void sound.toggle().then(() => paint(sound.enabled))
  }
  btn.addEventListener('click', onClick)
  const offSub = sound.subscribe(paint)

  return () => {
    btn.removeEventListener('click', onClick)
    offSub()
  }
}
