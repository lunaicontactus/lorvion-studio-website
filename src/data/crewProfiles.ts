/**
 * The crew's badge backs and detail pages (EUNGARAGE 2.0, PART 6 and 18).
 *
 * Every line here comes from the user's 2.0 brief and character sheets:
 * personality, what each one does in the room, what it carries, what it says
 * when touched. Nothing is invented beyond grouping those lines. Names, staff
 * names and roles live in src/data/characters.ts.
 */
export interface CrewProfile {
  readonly id: string
  /** Body colour name and hex, from the sheet's palette. */
  readonly colourHex: string
  /** 성격 */
  readonly personality: string
  /** 좋아하는 것 */
  readonly likes: readonly string[]
  /** 작업 습관 — the things it does in the garage. */
  readonly habits: readonly string[]
  /** What it says when touched (also in src/data/chatter.ts). */
  readonly lines: readonly string[]
  /** Pages that are about its work. */
  readonly related: readonly { readonly label: string; readonly href: string }[]
  /** Where it is usually found in the garage. */
  readonly spot: string
  /** The character sheet picture and its size. */
  readonly sheet: { readonly src: string; readonly w: number; readonly h: number }
}

const SHEET = (id: string, w = 1536, h = 1024): CrewProfile['sheet'] => ({ src: `/assets/images/crew-mochi/${id}/${id}_sheet.webp`, w, h })

export const CREW_PROFILES: readonly CrewProfile[] = [
  {
    id: 'momo', colourHex: '#FFCFE6',
    personality: '아이디어가 많고 활발하다. 새로운 게임을 떠올리면 신나서 통통 튄다. 가끔 너무 많은 아이디어 때문에 고민한다.',
    likes: ['새로운 게임 아이디어', '밤하늘 구경'],
    habits: ['노트북 작업', '기획 노트 읽기', '소파에서 생각하기', '다른 크루에게 말 걸기', '신나서 점프하기'],
    lines: ['좋은 생각 났어!', '이거 게임으로 만들면 재밌겠다!', '잠깐만, 또 아이디어가 생겼어!'],
    related: [{ label: 'GAMES — 만들고 있는 작품', href: '/works.html' }],
    spot: '중앙 라운지 · 기획 책상', sheet: SHEET('momo'),
  },
  {
    id: 'nunu', colourHex: '#FFEEB3',
    personality: '꼼꼼하고 책임감이 강하다. 코딩에 집중하면 주변을 잘 보지 못한다. 가끔 피곤해서 키보드 앞에서 졸기도 한다.',
    likes: ['버그 없는 빌드', '게임 컨트롤러'],
    habits: ['PC 작업', '게임 컨트롤러 조작', '버그 찾기', '모니터 확인', '졸기', '고글 만지기'],
    lines: ['버그만 잡으면 끝이야!', '어? 방금은 됐는데?', '이번에는 진짜 고쳤어!'],
    related: [{ label: 'GAMES — 만들고 있는 작품', href: '/works.html' }],
    spot: 'PC · 개발 책상', sheet: SHEET('nunu'),
  },
  {
    id: 'ruki', colourHex: '#C9F5E0',
    personality: '호기심이 많고 분석적이다. 새로운 자료를 발견하면 즐거워한다. 작은 오류도 놓치지 않으려 한다.',
    likes: ['새로운 자료', '꼼꼼한 메모'],
    habits: ['노트 읽기', '자료 조사', '돋보기 사용', '메모하기', '고개 갸웃하기', '책상 정리'],
    lines: ['일단 자료부터 찾아보자!', '이거 조금 더 확인해 볼게!', '오, 새로운 걸 발견했어!'],
    related: [{ label: 'ARCHIVE — 공개 기록실', href: '/archive.html' }],
    spot: '자료실 · 책장', sheet: SHEET('ruki'),
  },
  {
    id: 'poko', colourHex: '#4A4150',
    personality: '상상력이 풍부하고 장난기가 있다. 이야기와 캐릭터 설정을 좋아한다. 가끔 혼자 상상하다 멍해진다.',
    likes: ['이야기', '캐릭터 설정'],
    habits: ['이야기 쓰기', '노트 읽기', '날개 파닥이기', '생각하기', '혼자 중얼거리기', '낮잠 자기'],
    lines: ['이 장면은 조금 더 극적으로 만들까?', '잠깐, 새로운 설정이 떠올랐어.', '이야기는 아직 끝나지 않았어!'],
    related: [{ label: 'GAMES — 작품의 세계', href: '/works.html' }],
    spot: '스토리 작업대', sheet: SHEET('poko'),
  },
  {
    id: 'yomi', colourHex: '#DDEFFF',
    personality: '감성적이고 몽글몽글하다. 음악을 들으면 저절로 몸을 흔든다. 새로운 멜로디를 자주 떠올린다.',
    likes: ['음악', '새로운 멜로디'],
    habits: ['음악 듣기', '리듬 타기', '카세트 조작', '작곡하기', '음악에 맞춰 춤추기', '졸기'],
    lines: ['이 장면에는 어떤 음악이 좋을까?', '잠깐, 멜로디가 떠올랐어!', '같이 음악 들을래?'],
    related: [{ label: '차고의 라디오 켜기', href: '/#radio' }],
    spot: '음악 코너 · 라디오 옆', sheet: SHEET('yomi'),
  },
  {
    id: 'reven', colourHex: '#E8D6FF',
    personality: '느긋하고 애교가 많다. 스튜디오 안을 자유롭게 돌아다니다 다른 크루 옆에서 잠을 잔다.',
    likes: ['털실 공', '소파', '쓰다듬어 주는 손'],
    habits: ['걸어 다니기', '앉기', '꼬리 흔들기', '잠자기', '장난감 가지고 놀기', '다른 크루 따라다니기'],
    lines: ['냐옹!', '냐~♡', '골골골…'],
    related: [{ label: '차고에 놀러 가기', href: '/' }],
    spot: '소파 · 냉장고 앞 · 쿠션', sheet: SHEET('reven', 514, 512),
  },
]

export function profileOf(id: string): CrewProfile | undefined {
  return CREW_PROFILES.find((p) => p.id === id)
}
