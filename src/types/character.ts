/** Every pose the puppet rig can hold. Frames are procedural unless noted. */
export type CharacterState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'look'
  | 'sit'
  | 'squat'
  | 'work'
  | 'sleep'
  | 'play'
  | 'interact'
  | 'hide'
  | 'surprised'

/** Which way the puppet faces. The art gives us three views; `left` is `right`
 *  mirrored, which is why there is no separate asset for it. */
export type Facing = 'front' | 'side' | 'back'

/** Named areas of the workshop a character prefers to be in. */
export type ZoneId = 'left' | 'centre' | 'right' | 'door' | 'window' | 'alley'

/** Wordless reactions — readable without translation. */
export type ReactionIcon =
  | 'question'
  | 'exclaim'
  | 'ellipsis'
  | 'heart'
  | 'note'
  | 'sleep'
  | 'spark'
  | 'sweat'
  | 'anger'

export interface CharacterArt {
  /** Three-view turnaround. `side` is drawn facing right. */
  readonly front: string
  readonly side: string
  readonly back: string
  /** Poses that the puppet rig cannot fake convincingly get real art later.
   *  Missing entries fall back to a procedural approximation. */
  readonly poses?: Partial<Record<CharacterState, string>>
  /** Natural pixel height, used to size the puppet without a layout read. */
  readonly nativeHeight: number
}

/** How often a character picks each activity, relative to its siblings. */
export type ActivityWeights = Partial<Record<CharacterState, number>>

export interface CharacterConfig {
  readonly id: string
  /** Shown in DOKKADEX; never used as dialogue. */
  readonly name: string
  readonly nameKo: string
  /** One line of character for the DEX card, not for the world. */
  readonly trait: string
  readonly art: CharacterArt
  /** Walk speed in CSS px per second. */
  readonly speed: number
  /** Where this character likes to be, most-preferred first. */
  readonly preferredZones: readonly ZoneId[]
  /** Fraction of the time spent standing still (0-1). */
  readonly idleBias: number
  readonly activityWeights: ActivityWeights
  /** Reactions to repeated clicks, in order. The last one repeats. */
  readonly clickReactions: readonly ReactionIcon[]
  /** Accent used for the DEX card and focus ring. */
  readonly accent: string
}

/** Which way a sprite faces. Four, because that is what the render gives. */
export type SpriteDirection = 'front' | 'back' | 'left' | 'right'

/** What it is doing. Only what real frames exist for. */
export type SpriteAction = 'idle' | 'walk' | 'work' | 'sit' | 'wave' | 'look'

export interface SpriteAnimation {
  /** Absolute URLs, in play order. Ping-pong is expressed by repeating
   *  frames here rather than by a mode flag nobody can see in the data. */
  readonly frames: readonly string[]
  readonly fps: number
  readonly loop: boolean
}

/** Every sequence one character has. */
export type SpriteSet = Readonly<
  Record<SpriteAction, Readonly<Record<SpriteDirection, SpriteAnimation>>>
>

/**
 * How one dokkaebi differs from the next.
 *
 * Five characters running the same machine with the same numbers are one
 * character five times. These are the numbers, kept as data so a personality
 * is a row in a table rather than a branch in the state machine.
 */
export interface BehaviourProfile {
  /** Relative pull of each way of spending time. Not percentages. */
  readonly idle: number
  readonly wander: number
  readonly work: number
  readonly sit: number
  readonly look: number
  /** Things this one gravitates to, most-liked first. */
  readonly favours: readonly string[]
  /** Multiplies the walking pace. The cadence follows it, so the feet keep up. */
  readonly pace: number
  /** How long it stands about, in milliseconds. */
  readonly idleFor: readonly [number, number]
  /**
   * How long a stint at the bench lasts, and how long it sits down for.
   *
   * These carry more of the personality than the weights do, because what a
   * visitor sees is time and not decisions. RUKI picking work twice as often
   * as MOMO but leaving after the same ten seconds does not look like the one
   * who is absorbed in a job; RUKI staying half a minute does.
   */
  readonly workFor: readonly [number, number]
  readonly sitFor: readonly [number, number]
  /** Chance a touch gets a wave rather than just a look up. */
  readonly waveChance: number
  /**
   * How readily this one engages with another dokkaebi it meets, 0 to 1.
   * Both parties are consulted, so two shy ones almost never speak and the
   * gregarious one carries most of the room's conversation.
   */
  readonly social: number
  /**
   * How hard it is to interrupt with a touch, 0 to 1. RUKI at the bench looks
   * up more slowly than YOMI, who was looking for an excuse anyway. Never 1:
   * a dokkaebi that ignores the visitor entirely reads as broken, not busy.
   */
  readonly stubborn: number
  /** How often it has something to say, relative to the others. */
  readonly talkative: number
  /**
   * Where this one already is when the visitor walks in, as a waypoint or sit
   * id. Five dokkaebi appearing in the same spot and dispersing is an
   * entrance; five found in the places they belong have been here all along.
   */
  readonly home: string
}

/** What a dokkaebi is doing when it says something. */
export type ChatterMood = 'idle' | 'work' | 'sit' | 'greet' | 'touched'
