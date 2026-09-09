/**
 * Which frames each dokkaebi plays.
 *
 * Data, not code: a character with frames on disk becomes animated by being
 * listed here, and one without simply is not in the map. The room asks for a
 * set by id and falls back to its three still views when there is none, so
 * NUNU, RUKI, YOMI and POKO keep working untouched until their frames exist.
 *
 * WALK_FPS is measured, not taste. The rendered stride is 44.5 world units
 * per step — 89 for a full cycle of eight frames — so at nine frames a second
 * the cycle lasts 0.889s and covers 89 units of floor at 100 units a second.
 * Feet and floor agree. The old walking speed of 150 would have needed 13.5
 * fps to match, which is a scurry, so the speed came down instead of the
 * cadence going up (see NavGraph.speed).
 */
import type { SpriteAction, SpriteAnimation, SpriteDirection, SpriteSet } from '@/types/character'

/**
 * How much of a frame the character actually fills, top to bottom. The frame
 * runs from the render's fixed floor row upward, so there is headroom above
 * the hair that belongs to the frame and not to the dokkaebi. The room sizes
 * the <img> by dividing the height it wants by this, or the character comes
 * out short by the headroom.
 */
export const FIGURE_RATIO = 0.9262

const ROOT = '/assets/images/dokkaebi'
const WALK_FPS = 9
/** Six steps over four frames: out and back, so a breath does not snap. */
const IDLE_ORDER = [1, 2, 3, 4, 3, 2]
const IDLE_FPS = 3

const DIRECTIONS: readonly SpriteDirection[] = ['front', 'back', 'left', 'right']

function frame(id: string, action: SpriteAction, dir: SpriteDirection, n: number): string {
  return `${ROOT}/${id}/${action}/${dir}/${id}_${action}_${dir}_${String(n).padStart(2, '0')}.webp`
}

function sequence(
  id: string,
  action: SpriteAction,
  dir: SpriteDirection,
  order: readonly number[],
  fps: number,
): SpriteAnimation {
  return { frames: order.map((n) => frame(id, action, dir, n)), fps, loop: true }
}

function setFor(id: string, walkFrames: number): SpriteSet {
  const walkOrder = Array.from({ length: walkFrames }, (_, i) => i + 1)
  const byDirection = <T>(make: (d: SpriteDirection) => T): Readonly<Record<SpriteDirection, T>> =>
    Object.fromEntries(DIRECTIONS.map((d) => [d, make(d)])) as Record<SpriteDirection, T>
  return {
    idle: byDirection((d) => sequence(id, 'idle', d, IDLE_ORDER, IDLE_FPS)),
    walk: byDirection((d) => sequence(id, 'walk', d, walkOrder, WALK_FPS)),
  }
}

const SPRITES: Readonly<Record<string, SpriteSet>> = {
  momo: setFor('momo', 8),
}

export function spritesFor(characterId: string): SpriteSet | null {
  return SPRITES[characterId] ?? null
}

/** Everything one character can show. Used to decide what to fetch, and when. */
export function allFrames(set: SpriteSet): readonly string[] {
  return [...new Set(Object.values(set).flatMap((byDir) =>
    Object.values(byDir).flatMap((a) => a.frames)))]
}

/** The hit box, as a fraction of the frame: the body, not the empty corners
 *  a turning character needs the frame to be wide enough for. */
export const HIT_BOX = { width: 0.62, height: 0.9 }

export function idleFrames(set: SpriteSet): readonly string[] {
  return [...new Set(Object.values(set.idle).flatMap((a) => a.frames))]
}
