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
export type SpriteAction = 'idle' | 'walk'

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
