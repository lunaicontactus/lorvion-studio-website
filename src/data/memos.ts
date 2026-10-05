/**
 * The crew's notes, kept in the memory box of the secret storage (SITE UPGRADE
 * PHASE G). One is on top each time the box is opened.
 *
 * Every note is about something that really happened while the garage was
 * being made, on the day it happened (the commit is beside it), in the voice
 * of whoever in the crew it belongs to (docs/CREW_REBOOT.md: MOMO makes,
 * RUKI repairs, YOMI opens the fridge and peers at doors, POKO watches the
 * television, NUNU keeps the cushions). Nothing here is on the public archive.
 */
export type MemoAuthor = 'momo' | 'nunu' | 'ruki' | 'yomi' | 'poko'

export interface Memo {
  readonly id: string
  readonly by: MemoAuthor
  readonly text: string
  /** `2026.09.12` */
  readonly date: string
  readonly commit: string
}

export const MEMO_AUTHOR: Readonly<Record<MemoAuthor, string>> = {
  momo: 'MOMO', nunu: 'NUNU', ruki: 'RUKI', yomi: 'YOMI', poko: 'POKO',
}

export const MEMOS: readonly Memo[] = [
  { id: 'memo-momo-ears', by: 'ruki', date: '2026.09.12', commit: '73324c3', text: '모모 머리 줄이지 말 것. 줄였더니 귀까지 작아졌다. 원래 그림대로 간다.' },
  { id: 'memo-short-fur', by: 'momo', date: '2026.09.13', commit: '4e8aa66', text: '긴 털은 입체로 옮기면 조각조각 떠다닌다. 다섯 다 짧고 촘촘하게.' },
  { id: 'memo-fridge-doors', by: 'yomi', date: '2026.10.04', commit: '2dfabb2', text: '냉장고 문은 바깥으로 연다. 안에 든 게 가려지면 열어 본 보람이 없으니까.' },
  { id: 'memo-wisps', by: 'nunu', date: '2026.10.04', commit: '2dfabb2', text: '도깨비불은 넷. 가로등 뒤에 숨어 있던 둘을 앞으로 데려왔다.' },
  { id: 'memo-two-walking', by: 'poko', date: '2026.10.05', commit: 'e135f69', text: '한 번에 걷는 건 둘까지. 셋이 걸으면 텔레비전이 안 보인다.' },
  { id: 'memo-fridge-touch', by: 'ruki', date: '2026.10.05', commit: 'a203193', text: '냉장고 앞 도깨비를 눌렀는데 냉장고가 열렸다. 고쳤다. 이제 도깨비가 돌아본다.' },
]
