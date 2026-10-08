/**
 * The crew's notes, kept in the memory box of the secret storage (SITE UPGRADE
 * PHASE G). One is on top each time the box is opened.
 *
 * Every note is about something that really happened while the garage was
 * being made (the comment above each says what, and the commit is beside it),
 * but written the way the crew would scribble it on a scrap of paper — like
 * the fridge's own notes, not like a changelog. Each in its owner's voice
 * (docs/CREW_REBOOT.md): MOMO bright and busy, NUNU sleepy and slow, RUKI
 * short and practical, YOMI loud and curious, POKO calm, the one who keeps
 * the room in order. Nothing here is on the public archive.
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
  // The redesign that was given up: MOMO's head was made smaller and the ears went with it.
  { id: 'memo-momo-ears', by: 'momo', date: '2026.09.12', commit: '73324c3', text: '내 머리 작게 하지 마! 귀까지 쪼그라들었잖아. 원래 머리가 제일 좋아.' },
  // Long fur came apart in 3D; all five went to short, dense pile.
  { id: 'memo-short-fur', by: 'nunu', date: '2026.09.13', commit: '4e8aa66', text: '다 같이 털 짧게 깎은 날… 이제 방석에 털이 안 날린다. 좋다.' },
  // The fridge doors were redrawn to swing outward, clear of what is inside.
  { id: 'memo-fridge-doors', by: 'yomi', date: '2026.10.04', commit: '2dfabb2', text: '냉장고 문이 안쪽을 다 가렸었어! 이제 활짝 열린다. 요거트 누구 거야?' },
  // Two of the four wisps outside were hidden under the foreground; brought out.
  { id: 'memo-wisps', by: 'nunu', date: '2026.10.04', commit: '2dfabb2', text: '도깨비불 둘이 가로등 뒤에서 자고 있었다… 깨워서 데려왔다. 나도 자고 싶은데.' },
  // At most two of the crew walking at once.
  { id: 'memo-two-walking', by: 'poko', date: '2026.10.05', commit: 'e135f69', text: '돌아다니는 건 한 번에 둘까지. 셋이 지나가면 텔레비전이 안 보인다.' },
  // A touch on RUKI, standing at the fridge, opened the fridge instead.
  { id: 'memo-fridge-touch', by: 'ruki', date: '2026.10.05', commit: 'a203193', text: '냉장고 앞에 서 있으면 다들 나 대신 냉장고를 연다. 고쳤다. 이제 부르면 내가 돌아본다.' },
]
