/**
 * Every mini-game the room can open, by id.
 *
 * The PC lists these; the fridge, the radio and the television will each
 * point at one of them. A game is added by being listed here and nowhere else.
 */
import { BUILD_GAME } from '@/games/build/game'
import type { GameDef } from '@/games/types'

export const GAMES: readonly GameDef[] = [BUILD_GAME]

export function gameById(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id)
}
