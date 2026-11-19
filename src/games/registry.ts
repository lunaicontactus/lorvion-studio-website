/**
 * Every mini-game the room can open, by id.
 *
 * The PC lists these; the fridge, the radio and the television will each
 * point at one of them. A game is added by being listed here and nowhere else.
 */
import { SNEAK_GAME } from '@/games/sneak/game'
import { SNACK_GAME } from '@/games/snack/game'
import { DELIVERY_GAME } from '@/games/delivery/game'
import { STARFALL_GAME } from '@/games/starfall/game'
import { BUGS_GAME } from '@/games/bugs/game'
import { MOCK_GAME } from '@/games/mock'
import type { GameDef } from '@/games/types'

/** Every mini-game, each played in its building in the playground (WORLD 2.1). */
export const GAMES: readonly GameDef[] = [SNEAK_GAME, SNACK_GAME, DELIVERY_GAME]

/**
 * The arcade's own games (EUNGARAGE 2.0, PART 14): not in a playground
 * building, played from the ARCADE page and the garage's arcade. They do not
 * count towards the secret door, which is the three above (src/systems/secret.ts).
 */
export const ARCADE_GAMES: readonly GameDef[] = [STARFALL_GAME, BUGS_GAME]

/**
 * The shell is walked end to end against a game that is barely a game
 * (src/games/mock.ts). It is not listed, and this is behind `import.meta.env.DEV`
 * so a built bundle does not contain it at all — a mock game somebody can get
 * to is a mock game somebody eventually plays.
 */
const HIDDEN: readonly GameDef[] = import.meta.env.DEV ? [MOCK_GAME] : []

export function gameById(id: string): GameDef | undefined {
  return [...GAMES, ...ARCADE_GAMES, ...HIDDEN].find((g) => g.id === id)
}
