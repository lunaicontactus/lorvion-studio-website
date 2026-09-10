/**
 * What the dokkaebi say.
 *
 * Short, because a bubble is read in passing and a sentence in a bubble over a
 * 210px character is a wall. Never instructions, never navigation, never a
 * label for something clickable: the room's own objects do that job, and a
 * dokkaebi that explains the site turns into a tooltip with legs.
 *
 * Lines are Korean because the crew are Korean dokkaebi and the site's own
 * copy already switches; a bubble is flavour rather than content, so it is not
 * routed through the copy system.
 */
import type { ChatterMood } from '@/types/character'

type Lines = Partial<Record<ChatterMood, readonly string[]>>

const CHATTER: Readonly<Record<string, Lines>> = {
  momo: {
    idle: ['뭐 만들지?', '이건 뭐야?', '음…'],
    work: ['이게 맞나?', '거의 다 됐어.'],
    greet: ['어, 안녕!', '뭐 해?'],
    touched: ['안녕!', '나 불렀어?'],
  },
  nunu: {
    idle: ['배고프다…', '조금만 쉴래.'],
    sit: ['여기가 좋아.', '…'],
    greet: ['어… 안녕.', '응.'],
    touched: ['응…?', '왜?'],
  },
  ruki: {
    idle: ['다음은 뭐였지.', '음.'],
    work: ['거의 됐어.', '누가 이거 만졌어?', '하나만 더.'],
    greet: ['바빠.', '어.'],
    touched: ['잠깐만.', '어, 왜?'],
  },
  yomi: {
    idle: ['저 문 봤어?', '심심해!', '뭐 없나…'],
    greet: ['야! 이리 와봐.', '너 뭐 해?'],
    touched: ['헤헤.', '나 찾았다!'],
  },
  poko: {
    idle: ['조용하네.', '이거 재밌네.'],
    sit: ['음…', '좋다.'],
    greet: ['…안녕.'],
    touched: ['어.', '응, 봤어.'],
  },
}

/** One line, or null if this character has nothing to say in this mood. */
export function chatterFor(id: string, mood: ChatterMood, random = Math.random): string | null {
  const lines = CHATTER[id]?.[mood]
  if (!lines || lines.length === 0) return null
  return lines[Math.floor(random() * lines.length)] ?? null
}
