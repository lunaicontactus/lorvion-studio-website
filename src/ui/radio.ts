/**
 * RADIO page behaviour (EUNGARAGE 2.0, PART 17): play, pause, next, previous,
 * seek, volume, mute, the title and the time. One <audio>, preload none:
 * nothing is fetched or heard until the visitor presses play.
 */
import { radioHtml } from '@/render/pages2'

const fmt = (s: number): string => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

export function mountRadio(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>('[data-radio]')
  if (!host) return undefined
  if (!host.hasAttribute('data-prerendered')) host.innerHTML = radioHtml()
  const items = [...host.querySelectorAll<HTMLButtonElement>('[data-track]')]
  if (!items.length) return undefined
  const audio = new Audio()
  audio.preload = 'none'
  audio.volume = 0.6
  const q = <T extends Element>(s: string): T => host.querySelector<T>(s)!
  const play = q<HTMLButtonElement>('[data-radio="play"]')
  const mute = q<HTMLButtonElement>('[data-radio="mute"]')
  const seek = q<HTMLInputElement>('[data-radio-seek]')
  const vol = q<HTMLInputElement>('[data-radio-vol]')
  const now = q<HTMLElement>('[data-radio-now]')
  const time = q<HTMLElement>('[data-radio-time]')
  const deck = q<HTMLElement>('[data-cassette]')
  let index = 0
  let loaded = -1

  const select = (i: number): void => {
    index = (i + items.length) % items.length
    for (const [k, b] of items.entries()) b.setAttribute('aria-current', k === index ? 'true' : 'false')
    now.textContent = `♪ ${items[index]!.querySelector('b')?.textContent ?? ''}`
  }
  const start = async (i = index): Promise<void> => {
    select(i)
    if (loaded !== index) {
      audio.src = items[index]!.dataset['src'] ?? ''
      loaded = index
    }
    try {
      await audio.play()
    } catch {
      now.textContent = '재생할 수 없어요. 다시 눌러 주세요.'
    }
  }
  const sync = (): void => {
    const on = !audio.paused
    play.textContent = on ? '⏸' : '▶'
    play.setAttribute('aria-label', on ? '일시정지' : '재생')
    play.setAttribute('aria-pressed', String(on))
    deck.classList.toggle('is-playing', on)
  }
  const tick = (): void => {
    const d = audio.duration
    time.textContent = `${fmt(audio.currentTime)} / ${fmt(d)}`
    if (Number.isFinite(d) && d > 0 && document.activeElement !== seek) seek.value = String(Math.round((audio.currentTime / d) * 1000))
  }
  const onClick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement
    const tr = t.closest<HTMLButtonElement>('[data-track]')
    if (tr) return void start(Number(tr.dataset['track']))
    const k = t.closest<HTMLButtonElement>('[data-radio]')?.dataset['radio']
    if (k === 'play') return void (audio.paused ? start() : audio.pause())
    if (k === 'next') return void start(index + 1)
    if (k === 'prev') return void start(audio.currentTime > 3 ? index : index - 1)
    if (k === 'mute') {
      audio.muted = !audio.muted
      mute.textContent = audio.muted ? '🔇' : '🔈'
      mute.setAttribute('aria-pressed', String(audio.muted))
      mute.setAttribute('aria-label', audio.muted ? '음소거 해제' : '음소거')
    }
  }
  const onSeek = (): void => {
    if (Number.isFinite(audio.duration)) audio.currentTime = (Number(seek.value) / 1000) * audio.duration
  }
  const onVol = (): void => { audio.volume = Number(vol.value) / 100 }
  const onEnded = (): void => void start(index + 1)

  host.addEventListener('click', onClick)
  seek.addEventListener('input', onSeek)
  vol.addEventListener('input', onVol)
  audio.addEventListener('play', sync)
  audio.addEventListener('pause', sync)
  audio.addEventListener('timeupdate', tick)
  audio.addEventListener('loadedmetadata', tick)
  audio.addEventListener('ended', onEnded)
  select(0)
  now.textContent = '재생 버튼을 눌러 주세요'
  return () => {
    audio.pause()
    audio.src = ''
    host.removeEventListener('click', onClick)
    seek.removeEventListener('input', onSeek)
    vol.removeEventListener('input', onVol)
  }
}
