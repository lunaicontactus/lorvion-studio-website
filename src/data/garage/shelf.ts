/**
 * DOKKA CREW COLLECTION — what is on the shelf.
 *
 * Not a game list. The shelf is where the five of them keep their own small
 * things, and each thing belongs to someone. Pictures only where a real
 * cut-out of that exact object exists in the repository; everything else is
 * shown with its owner, which is what a shelf of someone's stuff looks like.
 */
import type { DiscoveryEntry } from '@/systems/discovery'

const G = '/assets/images/garage'

type Item = Omit<DiscoveryEntry, 'category' | 'cooldown' | 'oncePerSession'> & Partial<Pick<DiscoveryEntry, 'cooldown' | 'oncePerSession'>>

const ITEMS: readonly Item[] = [
  { id: 'poko-spare-glasses', owner: 'poko', title: 'POKO의 예비 안경', description: '본인은 세 개밖에 없다고 주장하지만, 선반에는 일곱 개가 있다.', asset: null, weight: 3, rarity: 'common' },
  { id: 'nunu-pillow', owner: 'nunu', title: 'NUNU의 작은 베개', description: '선반 위에서도 잘 수 있다는 걸 증명하려고 올려뒀다. 증명됐다.', asset: null, weight: 3, rarity: 'common' },
  { id: 'ruki-wrench', owner: 'ruki', title: 'RUKI의 낡은 렌치', description: '고친 것보다 망가뜨린 게 많은 렌치. 그래도 제일 아낀다.', asset: null, weight: 3, rarity: 'common' },
  { id: 'momo-invention', owner: 'momo', title: 'MOMO의 실패한 발명품', description: '자동 컵라면 뚜껑 닫개. 뚜껑은 닫았고, 컵은 날아갔다.', asset: null, weight: 3, rarity: 'common' },
  { id: 'yomi-stone', owner: 'yomi', title: 'YOMI가 주워온 돌', description: '골목에서 주웠다. YOMI 말로는 가끔 따뜻해진다고 한다.', asset: null, weight: 3, rarity: 'common' },
  { id: 'broken-gamepad', owner: 'momo', title: '깨진 게임패드', description: '보스전에서 너무 세게 눌렀다. 누가 그랬는지는 다들 안다.', asset: null, weight: 2, rarity: 'common' },
  { id: 'old-cassette', owner: 'nunu', title: '오래된 카세트', description: "라벨에는 '자장가 3'. 1과 2는 아무도 못 찾았다.", asset: null, weight: 2, rarity: 'common' },
  { id: 'mystery-key', owner: 'yomi', title: '정체불명 열쇠', description: '어느 문에도 맞지 않는다. 아직까지는.', asset: null, weight: 2, rarity: 'uncommon' },
  { id: 'dokkaebi-club', owner: 'poko', title: '작은 도깨비 방망이', description: "'금 나와라 뚝딱' 해봤더니 영수증이 나왔다.", asset: null, weight: 2, rarity: 'common' },
  { id: 'odd-screw', owner: 'ruki', title: '이상한 나사', description: '어디서 빠졌는지 모른다. 차고는 아직 멀쩡하다. 아마도.', asset: null, weight: 2, rarity: 'common' },
  { id: 'old-photo', owner: 'momo', title: '옛날 사진', description: '처음 셔터를 올린 날. 다들 먼지투성이다.', asset: null, weight: 2, rarity: 'uncommon' },
  { id: 'doodle', owner: 'nunu', title: '회의록 뒷면 낙서', description: '회의록 뒤에 그린 POKO. 본인은 아직 못 봤다.', asset: null, weight: 2, rarity: 'common' },
  { id: 'toy-car', owner: 'ruki', title: '태엽 자동차', description: '태엽은 감기는데 앞으로는 안 간다. 뒤로는 아주 잘 간다.', asset: `${G}/prop_toycar_closed.webp`, weight: 3, rarity: 'common' },
  { id: 'spare-gear', owner: 'ruki', title: '기어 하나', description: "남는 부품이 아니다. '예비' 부품이다.", asset: `${G}/prop_gear.webp`, weight: 2, rarity: 'common' },
  { id: 'clover-bookmark', owner: 'yomi', title: '클로버 책갈피', description: '선반에 새겨진 무늬를 보고 따라 만들었다.', asset: null, weight: 2, rarity: 'common' },
  { id: 'approval-stamp', owner: 'poko', title: '결재 도장', description: '찍을 서류는 없는데, 찍는 연습은 매일 한다.', asset: null, weight: 2, rarity: 'common' },
  { id: 'star-sticker', owner: 'momo', title: '별 스티커 한 장', description: 'MOMO가 제일 아끼는 것. 선반에 있다는 건 비밀이다.', asset: null, weight: 1, rarity: 'rare' },
  { id: 'moon-bottle', owner: 'yomi', title: '달빛 병', description: '창문 앞에 두면 조금 빛난다고 한다. 확인한 사람은 없다.', asset: null, weight: 1, rarity: 'rare' },
]

export const SHELF_ENTRIES: readonly DiscoveryEntry[] = ITEMS.map((i) => ({
  cooldown: 0, oncePerSession: false, ...i, category: 'shelf',
}))

/** How many things come forward each time the shelf is opened. */
export const SHELF_SHOWN = 3
