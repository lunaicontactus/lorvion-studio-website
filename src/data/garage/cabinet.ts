/**
 * RECORDS / LORE — what is in the cabinet drawers.
 *
 * One paper comes out each time. Work logs, lost property, receipts and world
 * notes are the crew's own; the development notes are real, from this
 * repository's history, with the dates they happened (see the commit named in
 * each). The legal and support pages are not in the draw: they sit in their
 * own folder at the back of the drawer, always, because they are linked from
 * the LUNAI app and must never be a matter of luck.
 */
import type { DiscoveryEntry } from '@/systems/discovery'

export type PaperKind = 'log' | 'lost' | 'receipt' | 'dev' | 'lore' | 'sealed'

export interface CabinetPaper extends DiscoveryEntry {
  readonly kind: PaperKind
}

type Item = Omit<CabinetPaper, 'category' | 'cooldown' | 'oncePerSession' | 'asset'> & Partial<Pick<CabinetPaper, 'oncePerSession'>>

const PAPERS: readonly Item[] = [
  { id: 'log-027', kind: 'log', title: '업무일지 #027', description: 'MOMO가 오늘도 전선을 잘못 꽂았다. 모니터는 켜졌고, 냉장고가 꺼졌다.', weight: 3, rarity: 'common' },
  { id: 'log-031', kind: 'log', title: '업무일지 #031', description: 'RUKI가 작업대를 정리했다. 이제 아무도 아무것도 못 찾는다.', weight: 3, rarity: 'common' },
  { id: 'log-044', kind: 'log', title: '업무일지 #044', description: 'POKO 순찰 세 번. 딴짓 적발 0건. 딴짓이 0건이었다는 뜻은 아니다.', weight: 3, rarity: 'common' },
  { id: 'log-052', kind: 'log', title: '업무일지 #052', description: 'NUNU 근무 중 취침. 본인 주장: 눈을 감고 생각한 것.', weight: 2, rarity: 'common' },
  { id: 'lost-glasses', kind: 'lost', title: '분실물 기록', description: '안경 1개 (POKO 주장). 안경 7개 (선반 실측).', weight: 2, rarity: 'common' },
  { id: 'lost-sock', kind: 'lost', title: '분실물 기록', description: '왼쪽 양말 한 짝. NUNU 베개 안에서 발견될 예정.', weight: 2, rarity: 'common' },
  { id: 'receipt-weekly', kind: 'receipt', title: '영수증', description: '컵라면 24 · 계란 30 · 제로콜라 12 · 고무오리 1 (?)', weight: 2, rarity: 'common' },
  { id: 'receipt-shutter', kind: 'receipt', title: '영수증', description: '셔터 수리비. 사유: 너무 신나게 올림.', weight: 2, rarity: 'common' },
  { id: 'dev-0912', kind: 'dev', title: '개발 메모 · 2026.09.12', description: '다섯 명을 나란히 세워 보니 색만 다른 한 명이었다. 앞모습 실루엣이 90% 넘게 겹친다. 다시 만들기로 했다.', weight: 2, rarity: 'common' },
  { id: 'dev-0913-tail', kind: 'dev', title: '개발 메모 · 2026.09.13', description: '3D로 옮겼더니 다섯 명 모두에게 없던 꼬리가 생겼다. 다시 만들어도 계속 생겨서, 결국 깎아냈다.', weight: 2, rarity: 'common' },
  { id: 'dev-0913-neck', kind: 'dev', title: '개발 메모 · 2026.09.13', description: '턱 아래에 링 같은 이음새가 보였다. 다섯 명 모두, 동작마다 지웠다.', weight: 2, rarity: 'common' },
  { id: 'dev-0916-glasses', kind: 'dev', title: '개발 메모 · 2026.09.16', description: 'POKO 안경이 흰 판처럼 얼굴을 덮고 있었다. 프레임마다 눈 위치를 재서 작고 둥근 안경으로 바꿨다.', weight: 2, rarity: 'common' },
  { id: 'lore-fire', kind: 'lore', title: '세계관 기록', description: '도깨비불은 차고 안에서 켜지 않는다. 퓨즈가 나간다.', weight: 2, rarity: 'common' },
  { id: 'lore-night', kind: 'lore', title: '세계관 기록', description: '도깨비는 밤에 일하고 낮에는 셔터 안쪽에서 잔다. 대부분은 NUNU 이야기다.', weight: 2, rarity: 'common' },
  { id: 'sealed', kind: 'sealed', title: '봉인된 봉투', description: "겉면에 '별을 모은 이에게'라고 적혀 있다. 아직은 열리지 않는다.", weight: 1, rarity: 'rare' },
]

export const CABINET_ENTRIES: readonly CabinetPaper[] = PAPERS.map((p) => ({
  cooldown: 0, oncePerSession: false, asset: null, ...p, category: 'cabinet',
}))
