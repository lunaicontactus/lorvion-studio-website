/**
 * The visitor's own settings (EUNGARAGE 2.0, PART 21/22, the SETTINGS page).
 *
 * Kept in this browser only, apart from the save (a setting is a preference,
 * not progress), and every one of them changes something real:
 *   motion  'reduce' — the site behaves as under the system's reduced-motion
 *           setting (src/systems/motion.ts reads it; CSS via [data-motion])
 *   intro   'short'  — the shutter's short version every time (src/app/world.ts)
 *   quality 'low'    — fewer of the crew on the floor at once (src/scenes/garage.ts)
 * Sound is the site's own switch (src/systems/sound.ts), shown on the page too.
 */
export interface Settings {
  readonly motion: 'system' | 'reduce'
  readonly intro: 'full' | 'short'
  readonly quality: 'high' | 'low'
}

const KEY = 'eungarage:settings'
export const DEFAULT_SETTINGS: Settings = { motion: 'system', intro: 'full', quality: 'high' }

export function readSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<keyof Settings, unknown>>
    return {
      motion: raw.motion === 'reduce' ? 'reduce' : 'system',
      intro: raw.intro === 'short' ? 'short' : 'full',
      quality: raw.quality === 'low' ? 'low' : 'high',
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeSettings(next: Partial<Settings>): Settings {
  const s = { ...readSettings(), ...next }
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode: the setting lasts for this page only */
  }
  return s
}
