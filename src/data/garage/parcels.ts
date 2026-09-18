/**
 * RANDOM DELIVERY — what came in the box by the door.
 *
 * Not the parcel mini-game (that sorts parcels, outside). This is one box,
 * opened, with one thing in it. Pictures are the real cut-outs of the same
 * week's shopping that is stacked outside the shutter, or of the garage's own
 * props, where the content is that thing.
 */
import type { DiscoveryEntry } from '@/systems/discovery'

const A = '/assets/images/alley'
const G = '/assets/images/garage'

type Item = Omit<DiscoveryEntry, 'category' | 'cooldown' | 'oncePerSession'> & Partial<Pick<DiscoveryEntry, 'cooldown' | 'oncePerSession'>>

const ITEMS: readonly Item[] = [
  { id: 'cup-ramen-bundle', title: '컵라면 묶음', description: '스물네 개. 다음 주까지 버틸 계획이었다.', asset: `${A}/alley_prop_cup_ramen.webp`, weight: 3, rarity: 'common' },
  { id: 'eggs', title: '계란 한 판', description: '서른 개. 상자를 열었는데 벌써 스물아홉 개다.', asset: `${A}/alley_prop_eggs.webp`, weight: 3, rarity: 'common' },
  { id: 'packet-ramen', title: '봉지라면', description: '컵라면이 떨어질 때를 대비한 비상식량.', asset: `${A}/alley_prop_packet_ramen.webp`, weight: 2, rarity: 'common' },
  { id: 'water-pack', title: '생수 한 묶음', description: '누가 또 시켰다. 냉장고 옆에 벌써 두 묶음 있다.', asset: `${A}/alley_prop_water_pack.webp`, weight: 2, rarity: 'common' },
  { id: 'zero-cola', title: '제로콜라', description: '박스에 이름이 적혀 있다. 이름이 다섯 개다.', asset: `${A}/alley_prop_zero_cola.webp`, weight: 2, rarity: 'common' },
  { id: 'ruki-parts', owner: 'ruki', title: 'RUKI 공구 부품', description: '주문한 적 없는데 딱 필요한 만큼 왔다.', asset: `${G}/prop_parts_tray.webp`, weight: 2, rarity: 'common' },
  { id: 'gear', owner: 'ruki', title: '기어 한 개', description: '상자에 기어 하나만 들어 있다. 포장은 아주 튼튼하다.', asset: `${G}/prop_gear.webp`, weight: 2, rarity: 'common' },
  { id: 'market-bag', title: '장바구니', description: '시장에서 온 것 같다. 파가 삐져나와 있다.', asset: `${A}/alley_prop_bag.webp`, weight: 2, rarity: 'common' },
  { id: 'rubber-duck', title: '고무오리', description: '누가 시켰는지 아무도 모른다. 이름은 벌써 정해졌다.', asset: null, weight: 2, rarity: 'common' },
  { id: 'lens-cloth', owner: 'poko', title: '안경닦이', description: 'POKO 앞으로 온 택배. 열두 장이다.', asset: null, weight: 2, rarity: 'common' },
  { id: 'empty-box', owner: 'nunu', title: '빈 상자', description: '진짜 비어 있다. NUNU가 벌써 들어가 앉았다.', asset: `${G}/prop_parcel_open.webp`, weight: 2, rarity: 'common' },
  { id: 'usb', owner: 'momo', title: 'USB 하나', description: "라벨: '진짜_최종_최종2'.", asset: null, weight: 2, rarity: 'uncommon' },
  { id: 'odd-memo', title: '이상한 메모', description: "'문 옆을 잘 볼 것.' 보낸 사람 칸은 비어 있다.", asset: null, weight: 1, rarity: 'uncommon' },
  { id: 'stardust', title: '반짝이는 봉투', description: '열자마자 뭔가 반짝이고 사라졌다. 상자만 조금 따뜻하다.', asset: null, weight: 1, rarity: 'rare', oncePerSession: true },
]

export const PARCEL_ENTRIES: readonly DiscoveryEntry[] = ITEMS.map((i) => ({
  cooldown: 0, oncePerSession: false, ...i, category: 'parcel',
}))
