/**
 * 택배 정리, with no pictures.
 *
 * A parcel arrives with a project's name and colour on it and has to go to
 * that project's pile. It is the studio's own internal sorting — what came in
 * this week, split between the five things being made — and not a game about
 * a delivery company.
 *
 * The difficulty is the one thing worth thinking about here, because the easy
 * way to make this harder is to make the label smaller, and a game you lose
 * because you could not read something is not a game. So what grows is how
 * many piles there are to choose between: three at the start, five by the end.
 * Every target stays the same size and every label stays the same size.
 */
import { PROJECTS } from '@/data/projects'
import type { ProjectConfig } from '@/types/project'

export interface Parcel {
  /** Which project it is for. */
  readonly project: ProjectConfig
  /** The piles that are out at the moment, its own among them. */
  readonly piles: readonly ProjectConfig[]
}

/** How many piles are out at the start, and by the end. */
const PILES = { first: 3, last: PROJECTS.length } as const

/** What getting one wrong costs, in milliseconds off the clock. */
export const WRONG_MS = 1500

const PER_PARCEL = 4
const RUN_STEP = 0.15
const RUN_CAP = 2

export const STARS: readonly [number, number, number] = [60, 130, 230]

export function starsFor(score: number): number {
  return STARS.filter((s) => score >= s).length
}

export class ParcelRound {
  #rng: () => number
  #score = 0
  #run = 0
  #sorted = 0
  #wrong = 0
  #progress = 0
  #parcel: Parcel
  #done = false

  constructor(opts: { random?: () => number } = {}) {
    this.#rng = opts.random ?? Math.random
    this.#parcel = this.#next()
  }

  get parcel(): Parcel {
    return this.#parcel
  }

  get score(): number {
    return Math.floor(this.#score)
  }

  get run(): number {
    return this.#run
  }

  get sorted(): number {
    return this.#sorted
  }

  get wrong(): number {
    return this.#wrong
  }

  get done(): boolean {
    return this.#done
  }

  get multiplier(): number {
    return Math.min(RUN_CAP, 1 + this.#run * RUN_STEP)
  }

  /** How far through the round, 0 to 1. More piles come out as this rises. */
  setProgress(t: number): void {
    this.#progress = Math.max(0, Math.min(1, t))
  }

  finish(): void {
    this.#done = true
  }

  /** Put it on a pile. Says whether that was the right one. */
  sort(projectId: string): boolean {
    if (this.#done) return false
    if (projectId !== this.#parcel.project.id) {
      this.#wrong += 1
      this.#run = 0
      return false
    }
    this.#score += PER_PARCEL * this.multiplier
    this.#run += 1
    this.#sorted += 1
    this.#parcel = this.#next()
    return true
  }

  #pick<T>(from: readonly T[]): T {
    return from[Math.floor(this.#rng() * from.length) % from.length]!
  }

  #next(): Parcel {
    // Three piles at the start, all five by the end. The labels never shrink.
    const want = Math.round(PILES.first + (PILES.last - PILES.first) * this.#progress)
    const project = this.#pick(PROJECTS)
    const piles: ProjectConfig[] = [project]
    const others = PROJECTS.filter((p) => p.id !== project.id)
    while (piles.length < Math.min(want, PROJECTS.length)) {
      const one = this.#pick(others)
      if (!piles.some((p) => p.id === one.id)) piles.push(one)
    }
    // In the registry's own order, so the piles do not jump about between
    // parcels — a row that reshuffles every time is a row nobody can learn.
    piles.sort((a, b) => PROJECTS.indexOf(a) - PROJECTS.indexOf(b))
    return { project, piles }
  }
}
