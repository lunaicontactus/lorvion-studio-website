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
/**
 * How many frames each action has, and which directions were rendered.
 *
 * Work happens at the bench with the dokkaebi's back to the room, so it is
 * rendered back and front and nothing else; waving and looking are addressed
 * to the visitor, who is the camera, so they are front only. A direction that
 * was not rendered falls back to `front` — a slightly wrong angle rather than
 * a missing image, which is the difference between a small compromise and a
 * hole where the character was.
 */
const ACTIONS: Readonly<Record<SpriteAction, { frames: number; fps: number; dirs: readonly SpriteDirection[] }>> = {
  idle: { frames: 4, fps: 3, dirs: ['front', 'back', 'left', 'right'] },
  walk: { frames: 8, fps: WALK_FPS, dirs: ['front', 'back', 'left', 'right'] },
  work: { frames: 6, fps: 5, dirs: ['back', 'front'] },
  sit: { frames: 4, fps: 2, dirs: ['front', 'left', 'right'] },
  wave: { frames: 5, fps: 6, dirs: ['front'] },
  look: { frames: 6, fps: 4, dirs: ['front'] },
}
/** Six steps over four frames: out and back, so a breath does not snap. */
const IDLE_ORDER = [1, 2, 3, 4, 3, 2]

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

function setFor(id: string): SpriteSet {
  const byDirection = <T>(make: (d: SpriteDirection) => T): Readonly<Record<SpriteDirection, T>> =>
    Object.fromEntries(DIRECTIONS.map((d) => [d, make(d)])) as Record<SpriteDirection, T>
  const build = (action: SpriteAction): Readonly<Record<SpriteDirection, SpriteAnimation>> => {
    const spec = ACTIONS[action]
    const order = action === 'idle'
      ? IDLE_ORDER
      : Array.from({ length: spec.frames }, (_, i) => i + 1)
    return byDirection((d) =>
      sequence(id, action, spec.dirs.includes(d) ? d : 'front', order, spec.fps))
  }
  return {
    idle: build('idle'), walk: build('walk'), work: build('work'),
    sit: build('sit'), wave: build('wave'), look: build('look'),
  }
}

const SPRITES: Readonly<Record<string, SpriteSet>> = {
  momo: setFor('momo'),
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
