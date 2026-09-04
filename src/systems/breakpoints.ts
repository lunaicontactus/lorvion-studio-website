/**
 * Breakpoints, shared between CSS and JS.
 *
 * The values are duplicated in src/styles/tokens.css as documentation; these
 * are the ones code reads, so a layout decision made in JS and one made in CSS
 * cannot drift apart.
 */
export const BREAKPOINTS = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1600,
} as const

export type BreakpointName = keyof typeof BREAKPOINTS

export function isAtLeast(name: BreakpointName, width = window.innerWidth): boolean {
  return width >= BREAKPOINTS[name]
}

/** True for a mouse or trackpad; false for touch. Read live, never cached —
 *  a tablet with a keyboard case changes this mid-session. */
export function hasFinePointer(): boolean {
  try {
    return globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
  } catch {
    return false
  }
}
