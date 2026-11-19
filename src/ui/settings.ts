/**
 * SETTINGS page (EUNGARAGE 2.0): sound, motion, the shutter, graphics.
 * Every switch does something real (src/systems/settings.ts says what), and
 * says what it did. Language: Korean for now — the English copy is not
 * written yet, so there is no switch that would show half a site.
 */
import { motion } from '@/systems/motion'
import { sound } from '@/systems/sound'
import { readSettings, writeSettings, type Settings } from '@/systems/settings'

const row = (name: keyof Settings | 'sound', title: string, note: string, options: readonly [string, string][], value: string): string => `
    <fieldset class="setting" data-setting="${name}">
      <legend>${title}</legend>
      <p class="setting__note">${note}</p>
      <div class="setting__opts">${options.map(([v, label]) => `
        <label><input type="radio" name="${name}" value="${v}"${v === value ? ' checked' : ''}><span>${label}</span></label>`).join('')}
      </div>
    </fieldset>`

export function mountSettings(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>('[data-settings]')
  if (!host) return undefined
  const s = readSettings()
  host.innerHTML = `
    <form class="settings" data-settings-form>
      ${row('sound', '소리', '차고의 음악과 효과음. 처음에는 꺼져 있고, 켜야만 소리가 나요.', [['on', '켜기'], ['off', '끄기']], sound.enabled ? 'on' : 'off')}
      ${row('motion', '움직임', '움직임 줄이기를 고르면 캐릭터가 제자리에 서 있고, 화면 전환이 바로 바뀌어요. 기기 설정이 이미 줄이기라면 그대로 따라가요.', [['system', '기기 설정 따르기'], ['reduce', '움직임 줄이기']], s.motion)}
      ${row('intro', '셔터 연출', '차고에 들어갈 때 셔터가 올라가는 장면의 길이.', [['full', '처음 방문처럼 전부'], ['short', '짧게']], s.intro)}
      ${row('quality', '그래픽 품질', '낮추면 차고에 한 번에 나와 있는 크루가 다섯에서 셋으로 줄어 휴대폰이 덜 뜨거워요.', [['high', '보통'], ['low', '가볍게']], s.quality)}
      <fieldset class="setting"><legend>언어</legend><p class="setting__note">지금은 한국어만 있어요. 영어는 번역을 검수한 뒤에 열 거예요.</p></fieldset>
      <p class="settings__status" data-settings-status role="status"></p>
    </form>`
  const form = host.querySelector<HTMLFormElement>('[data-settings-form]')!
  const status = host.querySelector<HTMLElement>('[data-settings-status]')!
  const onChange = async (e: Event): Promise<void> => {
    const input = e.target as HTMLInputElement
    if (input.name === 'sound') {
      if ((input.value === 'on') !== sound.enabled) await sound.toggle()
      status.textContent = sound.enabled ? '소리를 켰어요.' : '소리를 껐어요.'
      return
    }
    writeSettings({ [input.name]: input.value } as Partial<Settings>)
    if (input.name === 'motion') {
      motion.changed()
      document.documentElement.dataset['motion'] = motion.reduced ? 'reduced' : 'full'
      status.textContent = motion.reduced ? '움직임을 줄였어요.' : '기기 설정을 따라요.'
    } else if (input.name === 'intro') status.textContent = input.value === 'short' ? '다음부터 셔터가 짧게 올라가요.' : '다음부터 셔터 장면을 전부 보여 줘요.'
    else status.textContent = input.value === 'low' ? '다음에 차고에 들어가면 크루가 셋만 나와 있어요.' : '다음에 차고에 들어가면 크루가 다섯 나와 있어요.'
  }
  form.addEventListener('change', onChange)
  return () => form.removeEventListener('change', onChange)
}
