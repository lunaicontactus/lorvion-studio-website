/**
 * What the crew say.
 *
 * Short, because a bubble is read in passing and a sentence in a bubble over a
 * 210px character is a wall. Never instructions, never navigation, never a
 * label for something clickable: the room's own objects do that job, and a
 * character that explains the site turns into a tooltip with legs.
 *
 * Lines are Korean because the crew are a Korean studio's and the site's own
 * copy already switches; a bubble is flavour rather than content, so it is not
 * routed through the copy system.
 */
import type { ChatterMood } from '@/types/character'

type Lines = Partial<Record<ChatterMood, readonly string[]>>

const CHATTER: Readonly<Record<string, Lines>> = {
  momo: {
    petted: ['헤헤, 간지러워!', '기분 좋아~'],
    lifted: ['우와, 높다!', '내려 줘~ 아니, 조금만 더!'],
    idle: ['음… 뭐 만들지?', '새로운 세계 만드는 중!'],
    work: ['이거 게임으로 만들면 재밌겠다!', '기획서 거의 다 썼어.'],
    greet: ['어서 와! 여기가 우리 차고야!', '구경해도 돼! 대신 버그는 밟지 마!'],
    touched: ['좋은 생각 났어!', '이거 게임으로 만들면 재밌겠다!', '잠깐만, 또 아이디어가 생겼어!'],
  },
  nunu: {
    petted: ['…좋다.', '조금만 더…'],
    lifted: ['어어? 키보드!', '버그 밟을 뻔했어!'],
    idle: ['컴파일 기다리는 중…', '고글 어디 뒀지?'],
    work: ['하나만 더 고치고.', '어? 방금은 됐는데?'],
    sit: ['조금만… 쿨…', '…'],
    greet: ['어, 안녕! 지금 디버깅 중!'],
    touched: ['버그만 잡으면 끝이야!', '어? 방금은 됐는데?', '이번에는 진짜 고쳤어!'],
  },
  ruki: {
    petted: ['헤헤, 고마워!', '기분 좋은데?'],
    lifted: ['오, 여기서 보니까 다르다!', '자료가 다 보여!'],
    idle: ['출처부터 확인하자.', '흠…'],
    work: ['메모해 둬야지.', '이거 조금 더 확인해 볼게!'],
    greet: ['안녕! 뭐 찾으러 왔어?'],
    touched: ['일단 자료부터 찾아보자!', '이거 조금 더 확인해 볼게!', '오, 새로운 걸 발견했어!'],
  },
  poko: {
    petted: ['…나쁘지 않네.', '흐흥.'],
    lifted: ['날개 쓸 필요 없겠다.', '극적인 장면이군.'],
    idle: ['다음 장면은…', '…'],
    work: ['이 대사 어때?', '복선은 여기에.'],
    sit: ['(상상 중)', '음…'],
    greet: ['어서 와. 이야기 들으러 왔어?'],
    touched: ['이 장면은 조금 더 극적으로 만들까?', '잠깐, 새로운 설정이 떠올랐어.', '이야기는 아직 끝나지 않았어!'],
  },
  yomi: {
    petted: ['♪ 좋아~', '몽글몽글해'],
    lifted: ['둥실둥실~ ♪', '헤드폰 떨어질라!'],
    idle: ['♪ 흥얼흥얼', '이 박자 좋다.'],
    work: ['잠깐, 멜로디가 떠올랐어!'],
    sit: ['♪…', '같이 들을래?'],
    greet: ['안녕! 같이 음악 들을래?'],
    touched: ['이 장면에는 어떤 음악이 좋을까?', '잠깐, 멜로디가 떠올랐어!', '같이 음악 들을래?'],
  },
  reven: {
    petted: ['골골골…', '냐아~♡'],
    lifted: ['냐앙?!', '…냐.'],
    idle: ['냐?'],
    sit: ['골골골…', '…냐'],
    greet: ['냐옹!'],
    touched: ['냐옹!', '냐~♡', '골골골…'],
  },
}

/** One line, or null if this character has nothing to say in this mood. */
export function chatterFor(id: string, mood: ChatterMood, random = Math.random): string | null {
  const lines = CHATTER[id]?.[mood]
  if (!lines || lines.length === 0) return null
  return lines[Math.floor(random() * lines.length)] ?? null
}
