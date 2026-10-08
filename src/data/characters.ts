/**
 * DOKKA CREW.
 *
 * Names, art and the one line the no-script fallback page shows. Who does
 * what is the crew canon (docs/CREW_REBOOT.md); how that shows in the room is
 * src/data/behaviour.ts and src/data/routines.ts. The activity weights, zones
 * and click reactions below predate both and are not read by anything.
 */
import type { CharacterConfig } from '@/types/character'

const ART = '/assets/images/dokka'

export const CHARACTERS: readonly CharacterConfig[] = [
  {
    id: 'momo',
    name: 'MOMO',
    nameKo: '모모',
    trait: 'Makes things at the bench. First to say hello.',
    traitKo: '작업대에서 무언가를 만든다. 가장 먼저 인사한다.',
    art: {
      front: `${ART}/momo_front.webp`,
      side: `${ART}/momo_side.webp`,
      back: `${ART}/momo_back.webp`,
      nativeHeight: 420,
    },
    speed: 46,
    preferredZones: ['centre', 'left', 'right'],
    idleBias: 0.34,
    activityWeights: { idle: 5, walk: 4, look: 3, interact: 3, play: 2, sit: 2 },
    clickReactions: ['question', 'heart', 'note', 'ellipsis'],
    accent: '#e0908f',
  },
  {
    id: 'ruki',
    name: 'RUKI',
    nameKo: '루키',
    trait: 'Repairs the machines. Says little; keeps noodles by the cushions.',
    traitKo: '기계를 고친다. 말수가 적고, 쿠션 옆에 컵라면을 둔다.',
    art: {
      front: `${ART}/ruki_front.webp`,
      side: `${ART}/ruki_side.webp`,
      back: `${ART}/ruki_back.webp`,
      nativeHeight: 420,
    },
    speed: 72,
    preferredZones: ['alley', 'door', 'right'],
    idleBias: 0.12,
    activityWeights: { walk: 6, run: 5, play: 4, look: 2, idle: 2, squat: 1 },
    clickReactions: ['exclaim', 'spark', 'sweat', 'anger'],
    accent: '#8fae86',
  },
  {
    id: 'yomi',
    name: 'YOMI',
    nameKo: '요미',
    trait: 'Opens the fridge, peers at the locked door. Touches first.',
    traitKo: '냉장고를 열고, 잠긴 문을 들여다본다. 먼저 만져 본다.',
    art: {
      front: `${ART}/yomi_front.webp`,
      side: `${ART}/yomi_side.webp`,
      back: `${ART}/yomi_back.webp`,
      nativeHeight: 420,
    },
    speed: 38,
    preferredZones: ['right', 'centre', 'door'],
    idleBias: 0.3,
    activityWeights: { idle: 4, walk: 3, interact: 5, sit: 3, squat: 2, play: 1 },
    clickReactions: ['heart', 'note', 'ellipsis', 'sweat'],
    accent: '#d9a95f',
  },
  {
    id: 'poko',
    name: 'POKO',
    nameKo: '포코',
    trait: 'The television is its place. Looks before it acts.',
    traitKo: '텔레비전 앞이 자리다. 움직이기 전에 먼저 본다.',
    art: {
      front: `${ART}/poko_front.webp`,
      side: `${ART}/poko_side.webp`,
      back: `${ART}/poko_back.webp`,
      nativeHeight: 420,
    },
    speed: 34,
    preferredZones: ['centre', 'left'],
    idleBias: 0.46,
    activityWeights: { work: 8, idle: 4, look: 2, walk: 1, interact: 2 },
    clickReactions: ['ellipsis', 'question', 'spark', 'anger'],
    accent: '#a08a72',
  },
  {
    id: 'nunu',
    name: 'NUNU',
    nameKo: '누누',
    trait: 'The big cushion is its place. In no hurry.',
    traitKo: '큰 쿠션이 자리다. 서두르는 법이 없다.',
    art: {
      front: `${ART}/nunu_front.webp`,
      side: `${ART}/nunu_side.webp`,
      back: `${ART}/nunu_back.webp`,
      nativeHeight: 420,
    },
    speed: 26,
    preferredZones: ['left', 'window', 'centre'],
    idleBias: 0.62,
    activityWeights: { sleep: 9, sit: 4, idle: 3, look: 1, walk: 1 },
    clickReactions: ['sleep', 'ellipsis', 'question', 'sleep'],
    accent: '#b9a6cf',
  },
] as const

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id)

export function getCharacter(id: string): CharacterConfig | undefined {
  return CHARACTERS.find((c) => c.id === id)
}

/** Keeping the room readable matters more than showing everyone at once. */
export const MAX_ACTIVE_CHARACTERS = 3
