/**
 * CREW LIFE — 오늘의 냉장고.
 *
 * What is in the fridge is decided by the date: the same visitor opening it
 * twice today finds the same shelves, and tomorrow is a different shop. The
 * pictures are the week's shopping from outside the shutter and the garage's
 * own half-finished cup.
 */
import type { DiscoveryEntry } from '@/systems/discovery'

const A = '/assets/images/alley'
const G = '/assets/images/garage'

type Item = Omit<DiscoveryEntry, 'category' | 'cooldown' | 'oncePerSession'>

const FOOD: readonly Item[] = [
  { id: 'eggs', title: '계란', description: '서른 개였는데.', asset: `${A}/alley_prop_eggs.webp`, weight: 3, rarity: 'common' },
  { id: 'cup-ramen', title: '컵라면', description: '냉장고에 왜 컵라면이 있지? 아무도 묻지 않는다.', asset: `${A}/alley_prop_cup_ramen.webp`, weight: 3, rarity: 'common' },
  { id: 'ramen-open', title: '먹던 컵라면', description: '누가 먹다 말았다. 아직 따뜻하다.', asset: `${G}/prop_cup_ramen_open.webp`, weight: 2, rarity: 'common' },
  { id: 'water', title: '생수', description: '제일 안쪽에 한 병. 제일 차갑다.', asset: `${A}/alley_prop_water_pack.webp`, weight: 2, rarity: 'common' },
  { id: 'cola', title: '제로콜라', description: '먹지 말라고 붙여놨다. 한 캔 줄었다.', asset: `${A}/alley_prop_zero_cola.webp`, weight: 2, rarity: 'common' },
  { id: 'drink', title: '음료', description: '얼음은 진작 녹았다.', asset: `${G}/prop_drink_cup.webp`, weight: 2, rarity: 'common' },
  { id: 'packet-ramen', title: '봉지라면', description: '냉동실에 들어가 있다. 이유는 모른다.', asset: `${A}/alley_prop_packet_ramen.webp`, weight: 1, rarity: 'uncommon' },
  { id: 'side-dish', title: '반찬통', description: '뚜껑에 이름이 없다. 전쟁의 시작.', asset: null, weight: 2, rarity: 'common' },
  { id: 'yogurt', title: '요거트', description: '유통기한 오늘. 용기 있는 자 먼저.', asset: null, weight: 1, rarity: 'uncommon' },
]

const MEMOS: readonly Item[] = [
  { id: 'memo-eggs', owner: 'poko', title: '메모', description: '내 계란 먹지 마시오. — POKO', asset: null, weight: 3, rarity: 'common' },
  { id: 'memo-cola', owner: 'momo', title: '메모', description: '콜라는 나눠 먹는 것. 한 모금씩. — MOMO', asset: null, weight: 2, rarity: 'common' },
  { id: 'memo-door', owner: 'ruki', title: '메모', description: '문 꼭 닫기. 어제 또 열려 있었음. — RUKI', asset: null, weight: 2, rarity: 'common' },
  { id: 'memo-tomorrow', owner: 'nunu', title: '메모', description: '내일 뭐 먹지. — NUNU', asset: null, weight: 2, rarity: 'common' },
  { id: 'memo-cheese', owner: 'yomi', title: '메모', description: '치즈는 YOMI가 먹었음. — 익명', asset: null, weight: 1, rarity: 'uncommon' },
]

export const FRIDGE_FOOD: readonly DiscoveryEntry[] = FOOD.map((i) => ({ ...i, category: 'fridge', cooldown: 0, oncePerSession: false }))
export const FRIDGE_MEMOS: readonly DiscoveryEntry[] = MEMOS.map((i) => ({ ...i, id: i.id, category: 'fridge', cooldown: 0, oncePerSession: false }))

/** How many things are on the shelves today. */
export const FRIDGE_SHOWN = 5

/** Today's key, local time. The fridge restocks at midnight. */
export function fridgeDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
