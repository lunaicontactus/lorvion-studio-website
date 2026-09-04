/** Logging that stays quiet in production unless ?debug=on is set. */
import { flags } from '@/systems/flags'

const PREFIX = '[eungarage]'

export const log = {
  debug(...args: unknown[]): void {
    if (!flags.debug) return
     
    console.warn(PREFIX, ...args)
  },
  warn(...args: unknown[]): void {
    console.warn(PREFIX, ...args)
  },
  error(...args: unknown[]): void {
    console.error(PREFIX, ...args)
  },
}
