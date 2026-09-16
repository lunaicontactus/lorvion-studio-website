/**
 * WORK IN PROGRESS — what is out on the workbench.
 *
 * Not the list of games (that is the PC). The bench has the studio's real
 * working material: test captures and comparison sheets from this site's own
 * crew rebuild and the fixes that followed, each with the date and the commit
 * it came from. One piece is out at a time; opening the bench again puts a
 * different one on top.
 */
import type { DiscoveryEntry } from '@/systems/discovery'

const W = '/assets/images/wip'

export interface WipPiece extends DiscoveryEntry {
  readonly kind: 'test capture' | 'sheet' | 'fix' | 'note'
  readonly date: string
  readonly commit: string
}

type Item = Omit<WipPiece, 'category' | 'cooldown' | 'oncePerSession'>

const PIECES: readonly Item[] = [
  { id: 'wip-comparison', kind: 'sheet', date: '2026.09.13', commit: '0d558fb', title: '다섯 명, 앞 · 옆 · 뒤', description: '새로 만든 다섯 명을 같은 자세로 세운 비교 시트. 이제 색이 아니라 모양으로 구분된다.', asset: `${W}/crew_comparison_sheet.webp`, weight: 3, rarity: 'common' },
  { id: 'wip-tail', kind: 'fix', date: '2026.09.13', commit: '9ab9821', title: '없던 꼬리 지우기', description: 'YOMI 뒤에 생긴 꼬리. 원래 그림에는 없다. 왼쪽이 전, 오른쪽이 후.', asset: `${W}/yomi_tail_closeup.webp`, weight: 3, rarity: 'common' },
  { id: 'wip-ring', kind: 'test capture', date: '2026.09.13', commit: '7cf9ea4', title: '턱 아래 링 지우기', description: '다섯 명 네 방향. 턱 아래 이음새가 사라졌는지 한 장에 모아 확인했다.', asset: `${W}/crew_ring_removed.webp`, weight: 3, rarity: 'common' },
  { id: 'wip-states', kind: 'sheet', date: '2026.09.13', commit: '0a1579e', title: '동작 여섯 가지', description: 'idle · walk · work · sit · wave · look. 차고에서 쓰는 동작 전부.', asset: `${W}/states_grid.webp`, weight: 3, rarity: 'common' },
  { id: 'wip-glasses', kind: 'fix', date: '2026.09.16', commit: '0d2633b', title: 'POKO 안경, 프레임마다', description: '고개를 돌리면 눈도 움직인다. 프레임마다 눈 위치를 재서 안경을 맞췄다.', asset: `${W}/poko_glasses_frames.webp`, weight: 3, rarity: 'common' },
  { id: 'wip-wall', kind: 'test capture', date: '2026.09.16', commit: '5170ded', title: '벽 그림에서 종이 떼기', description: '위가 전, 아래가 후. 그림마다 제 모양 액자.', asset: `${W}/wall_before_after.webp`, weight: 2, rarity: 'common' },
]

export const WORKBENCH_ENTRIES: readonly WipPiece[] = PIECES.map((p) => ({
  ...p, category: 'workbench', cooldown: 0, oncePerSession: false,
}))
