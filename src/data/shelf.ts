/**
 * What is on the shelf.
 *
 * The PC is where the games are; this is where the studio keeps the small
 * things left over from making them. Kept as data so a new game means one
 * entry here, not a new block of markup, and so the shelf can point at the
 * PC's page for a project rather than repeating it.
 *
 * `art` is null wherever no picture of the object exists yet. Nothing is
 * stood in for: the slot renders as a label plate, which is what a shelf in a
 * workshop mostly is anyway.
 */
import { CHARACTERS } from '@/data/characters'
import type { CharacterConfig } from '@/types/character'

export interface ShelfItem {
  readonly id: string
  /** The project it came from, if it came from one. */
  readonly projectId?: string
  readonly label: string
  /** One line. This is a shelf tag, not a description. */
  readonly note: string
  readonly art?: string | null
}

export const SHELF_ITEMS: readonly ShelfItem[] = [
  {
    id: 'lunai-cassette',
    projectId: 'lunai',
    label: 'A tape with no label',
    note: '누군가의 하루가 노래로 바뀐 자리.',
    art: null, // shelf_item_cassette.webp
  },
  {
    id: 'liminal-file',
    projectId: 'liminal',
    label: 'A file that came back',
    note: '어느 창구에서 한 번 돌려보낸 서류.',
    art: null, // shelf_item_file.webp
  },
  {
    id: 'wormup-crown',
    projectId: 'wormup',
    label: 'A very small crown',
    note: '끝까지 올라간 날 하나를 위해.',
    art: null, // shelf_item_crown.webp
  },
  {
    id: 'rubato-metronome',
    projectId: 'rubato',
    label: 'A metronome, stopped',
    note: '박자를 세다 만 채로 놓여 있다.',
    art: null, // shelf_item_metronome.webp
  },
]

/** The crew, as the figures standing along the same shelf. */
export function shelfCrew(): readonly CharacterConfig[] {
  return CHARACTERS
}
