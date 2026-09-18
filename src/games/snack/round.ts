/**
 * 도깨비 야식 심부름, with no pictures.
 *
 * Somebody asks for something; you hand them the right thing. Getting it right
 * is points and the next order; getting it wrong costs a second and a half and
 * you try again. Thirty seconds.
 *
 * All of it is here and none of it touches the DOM, for the same reason as the
 * boss game: the balance is a thing to measure rather than to feel out. A
 * script can play a thousand rounds of a perfect player and a careless one and
 * say whether the penalty is a penalty or a punishment.
 *
 * What is asked for is only ever something the fridge actually has
 * (src/data/fridge.ts). Nothing is invented for the game, and no shelf of
 * real-world brands appears: what is in that fridge is what this studio drew.
 */
import { FRIDGE_ITEMS, type FridgeItem } from '@/data/fridge'
import { CHARACTERS } from '@/data/characters'

/** What one order is: who is asking, and for what. */
export interface Order {
  readonly who: string
  readonly whoName: string
  readonly says: string
  readonly wants: FridgeItem
  /** What is on the shelf this time, the right one among them. */
  readonly choices: readonly FridgeItem[]
}

/** Everything that can be asked for: the fridge, minus the empty shelf. */
export const SNACKS: readonly FridgeItem[] = FRIDGE_ITEMS.filter((i) => i.art !== null)

/** How many things are on the shelf at once. */
const CHOICES = 4

/** What getting one wrong costs, in milliseconds off the clock. */
export const WRONG_MS = 1500

/** Points for a correct one, before the run multiplier. */
const PER_ORDER = 4
/** Each one in a row is worth a little more, up to this. */
const RUN_STEP = 0.15
const RUN_CAP = 2

export const STARS: readonly [number, number, number] = [70, 150, 260]

export function starsFor(score: number): number {
  return STARS.filter((s) => score >= s).length
}

const ASKS = [
  '{it} 좀!',
  '{it} 있어?',
  '{it} 하나만…',
  '야식은 {it}지.',
  '{it} 부탁해!',
] as const

export class SnackRound {
  #rng: () => number
  #score = 0
  #run = 0
  #filled = 0
  #wrong = 0
  #order: Order
  #done = false

  constructor(opts: { random?: () => number } = {}) {
    this.#rng = opts.random ?? Math.random
    this.#order = this.#next()
  }

  get order(): Order {
    return this.#order
  }

  get score(): number {
    return Math.floor(this.#score)
  }

  /** How many in a row, for the multiplier and for the display. */
  get run(): number {
    return this.#run
  }

  get filled(): number {
    return this.#filled
  }

  get wrong(): number {
    return this.#wrong
  }

  get done(): boolean {
    return this.#done
  }

  /** What the next correct one is worth. */
  get multiplier(): number {
    return Math.min(RUN_CAP, 1 + this.#run * RUN_STEP)
  }

  /** The round ran out. */
  finish(): void {
    this.#done = true
  }

  /**
   * Hand something over. Says whether it was the right thing, so the caller
   * can make the right noise; the cost of a wrong one is `WRONG_MS` off the
   * clock, which the caller spends because the clock is the shell's.
   */
  give(itemId: string): boolean {
    if (this.#done) return false
    if (itemId !== this.#order.wants.id) {
      this.#wrong += 1
      this.#run = 0
      return false
    }
    this.#score += PER_ORDER * this.multiplier
    this.#run += 1
    this.#filled += 1
    this.#order = this.#next()
    return true
  }

  #pick<T>(from: readonly T[]): T {
    return from[Math.floor(this.#rng() * from.length) % from.length]!
  }

  #next(): Order {
    const wants = this.#pick(SNACKS)
    const others = SNACKS.filter((i) => i.id !== wants.id)
    const shelf: FridgeItem[] = [wants]
    while (shelf.length < Math.min(CHOICES, SNACKS.length)) {
      const one = this.#pick(others)
      if (!shelf.some((s) => s.id === one.id)) shelf.push(one)
    }
    // Shuffled, so the right one is not always in the same place.
    for (let i = shelf.length - 1; i > 0; i--) {
      const j = Math.floor(this.#rng() * (i + 1))
      const a = shelf[i]!
      shelf[i] = shelf[j]!
      shelf[j] = a
    }
    const who = this.#pick(CHARACTERS)
    return {
      who: who.id,
      whoName: who.nameKo,
      says: this.#pick(ASKS).replace('{it}', wants.label),
      wants,
      choices: shelf,
    }
  }
}
