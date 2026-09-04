/**
 * The quarantined space hero is plain JS on its way out; this declaration lets
 * boot.ts import it without dragging the whole file into typecheck.
 */
declare module '@/legacy/space-hero.js' {
  export function mountSpaceHero(): void
}
