/**
 * Which frames each dokkaebi plays, and how fast.
 *
 * Data, not code: a character with frames on disk becomes animated by being
 * listed here, and one without simply is not in the map. The room asks for a
 * set by id and falls back to its three still views when there is none, so a
 * character keeps working untouched until its frames exist.
 *
 * Nothing in this table is taste. Every number was measured off the rendered
 * frames or off the walk cycle, and the two that matter most are:
 *
 * `walkFps` — the cadence. The rendered stride covers a known distance per
 * cycle (scripts/measure_gait.py), and the room walks each character at
 * `NavGraph.speed * profile.pace`. The frame rate that makes the feet agree
 * with the floor follows from those two and is not a free choice. MOMO walks
 * at full pace and needs nine frames a second; NUNU walks at 0.78 of it and
 * needs seven. Playing NUNU at nine would be a moonwalk — feet going through
 * a walk faster than the ground goes past — and it reads instantly even
 * though neither the sprite nor the speed is wrong on its own.
 *
 * `figureRatio` — how much of the frame the character fills, top to bottom.
 * The frame runs from the render's fixed floor row upward and carries
 * headroom above the hair, so the room divides the height it wants by this to
 * size the <img>. It is measured per character from the standing frames,
 * because the alternative — one shared ratio — makes whoever has the most
 * hair 3% shorter than they should be. Two dokkaebi standing side by side is
 * exactly the comparison that shows it.
 */
import type { SpriteAction, SpriteAnimation, SpriteDirection, SpriteSet } from '@/types/character'

const ROOT = '/assets/images/dokkaebi'

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
const DIRS: Readonly<Record<SpriteAction, readonly SpriteDirection[]>> = {
  idle: ['front', 'back', 'left', 'right'],
  walk: ['front', 'back', 'left', 'right'],
  work: ['back', 'front'],
  sit: ['front', 'left', 'right'],
  wave: ['front'],
  look: ['front'],
}

/** The rate each action plays at, before a character's own tempo. */
const BASE_FPS: Readonly<Record<SpriteAction, number>> = {
  idle: 3, walk: 9, work: 5, sit: 2, wave: 6, look: 4,
}

interface Sheet {
  /** Frames rendered for each action. Differs per character: a slower
   *  dokkaebi's cycles were rendered with more frames in them. */
  readonly frames: Readonly<Record<SpriteAction, number>>
  /** Cadence, derived from that character's stride and walking pace. */
  readonly walkFps: number
  /** Frame width / frame height, measured. */
  readonly aspect: number
  /** Standing figure height / frame height, measured off the idle frames. */
  readonly figureRatio: number
  /** Body width / frame width, measured off the idle frames. */
  readonly bodyWidth: number
  /** Multiplies every action but the walk: a slower character breathes and
   *  works at its own rate, and the walk is not free to follow suit. */
  readonly tempo: number
}

const SHEETS: Readonly<Record<string, Sheet>> = {
  // Frames 298x420, standing figure 395px, body 270px. 89 units per cycle at
  // full pace: 8 frames / (89/100)s = 8.99fps.
  momo: {
    frames: { idle: 4, walk: 8, work: 6, sit: 4, wave: 5, look: 6 },
    walkFps: 8.99, aspect: 298 / 420, figureRatio: 0.9405, bodyWidth: 0.906,
    tempo: 1,
  },
  // Frames 342x420 — wider, because NUNU sits with its legs further out and
  // every frame of a character shares one crop window. A slightly longer
  // stride than MOMO's, 90.8 units per cycle, walked at 0.78 pace:
  // 8 frames / (90.8/78)s = 6.87fps.
  nunu: {
    frames: { idle: 4, walk: 8, work: 8, sit: 5, wave: 6, look: 8 },
    walkFps: 6.87, aspect: 342 / 420, figureRatio: 0.9143, bodyWidth: 0.792,
    tempo: 1.25,
  },
  // RUKI, YOMI and POKO are driven by MOMO's skeleton (see the generation
  // log), so their stride is hers exactly: 89.0 units per cycle. What differs
  // is the pace each of them walks at, and the cadence follows from it.
  // RUKI: full pace, 8 frames / 0.89s = 8.99fps. Quick, short cycles.
  ruki: {
    frames: { idle: 4, walk: 8, work: 5, sit: 4, wave: 4, look: 5 },
    walkFps: 8.99, aspect: 337 / 420, figureRatio: 0.9429, bodyWidth: 0.864,
    tempo: 0.9,
  },
  // YOMI: 1.15 pace, so 115 units a second over an 89-unit cycle needs
  // 8 frames at 10.34fps. The fastest and the shortest cycles of the five.
  yomi: {
    frames: { idle: 4, walk: 8, work: 5, sit: 3, wave: 4, look: 5 },
    walkFps: 10.34, aspect: 331 / 420, figureRatio: 0.9452, bodyWidth: 0.846,
    tempo: 0.8,
  },
  // POKO: 0.88 pace, 8 frames at 7.91fps. The longest cycles of the five, and
  // the smallest movements — it is mostly watching something.
  poko: {
    frames: { idle: 4, walk: 8, work: 7, sit: 5, wave: 6, look: 7 },
    walkFps: 7.91, aspect: 337 / 420, figureRatio: 0.9452, bodyWidth: 0.819,
    tempo: 1.2,
  },
}

/** Six steps over four frames: out and back, so a breath does not snap. */
const IDLE_ORDER = [1, 2, 3, 4, 3, 2]

const DIRECTIONS: readonly SpriteDirection[] = ['front', 'back', 'left', 'right']

function frame(id: string, action: SpriteAction, dir: SpriteDirection, n: number): string {
  return `${ROOT}/${id}/${action}/${dir}/${id}_${action}_${dir}_${String(n).padStart(2, '0')}.webp`
}

function setFor(id: string, sheet: Sheet): SpriteSet {
  const byDirection = <T>(make: (d: SpriteDirection) => T): Readonly<Record<SpriteDirection, T>> =>
    Object.fromEntries(DIRECTIONS.map((d) => [d, make(d)])) as Record<SpriteDirection, T>
  const build = (action: SpriteAction): Readonly<Record<SpriteDirection, SpriteAnimation>> => {
    const count = sheet.frames[action]
    const order = action === 'idle'
      ? IDLE_ORDER.filter((n) => n <= count)
      : Array.from({ length: count }, (_, i) => i + 1)
    // The walk answers to the floor; everything else answers to the character.
    const fps = action === 'walk' ? sheet.walkFps : BASE_FPS[action] / sheet.tempo
    return byDirection((d) => ({
      frames: order.map((n) => frame(id, action, DIRS[action].includes(d) ? d : 'front', n)),
      fps,
      loop: true,
    }))
  }
  return {
    idle: build('idle'), walk: build('walk'), work: build('work'),
    sit: build('sit'), wave: build('wave'), look: build('look'),
  }
}

const SPRITES: Readonly<Record<string, SpriteSet>> =
  Object.fromEntries(Object.entries(SHEETS).map(([id, sheet]) => [id, setFor(id, sheet)]))

export function spritesFor(characterId: string): SpriteSet | null {
  return SPRITES[characterId] ?? null
}

/** The measured proportions of one character's frames, for sizing and hit boxes. */
export function metricsFor(characterId: string): Sheet | null {
  return SHEETS[characterId] ?? null
}

/** How long one pass of an animation takes, in milliseconds. Used for the
 *  states whose whole duration is "until this gesture has finished". */
export function durationOf(anim: SpriteAnimation): number {
  return anim.fps > 0 ? (anim.frames.length / anim.fps) * 1000 : 0
}

/** Everything one character can show. Used to decide what to fetch, and when. */
export function allFrames(set: SpriteSet): readonly string[] {
  return [...new Set(Object.values(set).flatMap((byDir) =>
    Object.values(byDir).flatMap((a) => a.frames)))]
}

/**
 * The hit box, as a fraction of the frame.
 *
 * The width is a fraction of the body rather than of the frame, because the
 * frame is only as wide as that character's widest pose and NUNU's is wide
 * because of how it sits. A fixed fraction of the frame would give the one
 * with the roomiest sit the narrowest target while standing.
 */
export const HIT_BOX = { body: 0.7, height: 0.9 }

export function idleFrames(set: SpriteSet): readonly string[] {
  return [...new Set(Object.values(set.idle).flatMap((a) => a.frames))]
}
