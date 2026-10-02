/**
 * The five works — the one record the garage PC, the WORKS index and each
 * work's own page read.
 *
 * Public only: what each work is, what a player does in it, what it already
 * promises, and its pictures. How far the build has got, what is being
 * implemented this week, commits, test numbers and QA builds are not here and
 * are not shown to visitors — the making is kept in the archive's polaroids
 * (src/data/polaroids.ts), and what changes for players after a release is
 * kept in `updates`, written by hand.
 *
 * Every line was checked against the work's own material (docs/WORKS.md lists
 * the sources). Nothing is `released`: none of the five is out, so none of
 * them shows update notes.
 */
import { artworkFor, fullSrc } from '@/data/artwork'
import type { ProjectConfig, UpdateNote } from '@/types/project'

function art(projectId: string): string | null {
  const piece = artworkFor(projectId)
  return piece ? fullSrc(piece) : null
}

export const PROJECTS: readonly ProjectConfig[] = [
  {
    id: 'lunai',
    title: 'LUNAI',
    tagline: 'A quiet diary where feelings become music.',
    taglineKo: '오늘의 감정을 적으면, 음악과 캐릭터가 조용히 답합니다.',
    kind: 'Emotion Diary / Music App',
    genre: '감정 기록 · 음악 앱',
    platforms: ['iOS'],
    releaseState: 'inDevelopment',
    keyArt: art('lunai'),
    accent: '#8c7cff',
    links: [
      { label: 'SUPPORT', href: '/support.html' },
      { label: 'PRIVACY', href: '/privacy.html' },
    ],
    world: 'lunai',
    about: [
      '오늘의 감정을 고르고, 그 세기를 정하고, 있었던 일을 적습니다.',
      '그 기록이 30초짜리 노래와 앨범 표지가 되어, 앨범처럼 한 장씩 쌓입니다.',
      '열 명의 캐릭터가 저마다의 방에서 그날의 마음에 답을 건넵니다.',
      '친구방에서는 만든 노래를 나누고, 서로의 노래에 반응을 남깁니다.',
    ],
    core: [
      { title: '감정 체크인', text: '감정을 고르고 세기를 정하는 짧은 기록, 30초 체크인.' },
      { title: '캐릭터의 답', text: '캐릭터가 자기 방에서 답하고, 이야기를 이어 갈 수 있습니다.' },
      { title: '30초 노래', text: '기록으로 가사를 쓰거나 직접 적어, 노래와 표지를 만듭니다.' },
    ],
    features: [
      '열 명의 캐릭터와 각자의 방',
      '감정 기록과 30초 노래, 앨범 표지',
      '만든 노래가 쌓이는 앨범',
      '주간 · 월간 · 연간 기록',
      '초대 코드로 여는 친구방',
    ],
    gallery: [
      { name: 'icon', w: 1024, h: 1024, caption: '앱 아이콘 · 달 위의 토끼' },
      { name: 'album', w: 739, h: 1600, caption: '감정 음악 앨범 화면 (웹 미리보기)' },
      { name: 'room-chat', w: 739, h: 1600, caption: '캐릭터의 방 · 펭귄과의 대화 (웹 미리보기)' },
      { name: 'room-dal-tokki', w: 900, h: 1600, caption: '달토끼의 방' },
      { name: 'room-winter', w: 900, h: 1600, caption: '계절에 따라 바뀌는 방 · 겨울' },
      { name: 'cover-village', w: 1254, h: 1254, caption: '기본 앨범 표지' },
    ],
  },
  {
    id: 'liminal',
    title: 'LIMINAL',
    tagline: 'A narrative adventure between life and the afterlife.',
    taglineKo: '죽음과 삶의 경계에서, 남겨진 진실을 조사한다.',
    kind: 'Narrative Mystery / Investigation',
    genre: '이승과 저승 사이의 상담소 어드벤처',
    platforms: ['PC', 'Mobile'],
    releaseState: 'inDevelopment',
    perspective: '1인칭',
    keyArt: art('liminal'),
    accent: '#c4a36e',
    links: [],
    world: 'liminal',
    about: [
      '2036년 겨울, 사고로 의식을 잃은 ‘나’는 이승과 저승 사이의 경계관리국에서 눈을 뜹니다.',
      '아직 죽은 것은 아닙니다. 돌아갈 수 있을 때까지, 임시 상담 직원으로 일하게 됩니다.',
      '해령, 발쇠, 야연, 담비, 설매, 비향 — 여섯 직원과 함께 경계에 선 사람들의 사건을 조사하고,',
      '그 1년 동안 돌아갈 길을 찾습니다.',
    ],
    core: [
      { title: '상담', text: '경계에 선 손님의 이야기를 듣는 데서 사건이 시작됩니다.' },
      { title: '기억과 현장 조사', text: '손님의 기억과 현장을 걸으며 증거를 모읍니다.' },
      { title: '추론과 판단', text: '모은 증거로 무엇이 어긋났는지 짚고, 판단을 내립니다.' },
    ],
    features: [
      '시즌 1 · 일곱 개의 사건',
      '여섯 직원과 그들의 과거',
      '경계관리국을 걸어 다니는 허브',
      '기억과 현장을 오가는 조사',
      '1인칭 시점',
    ],
    gallery: [
      { name: 'bureau', w: 1600, h: 893, caption: '경계관리국 앞' },
      { name: 'crossroads', w: 1600, h: 893, caption: '시대가 섞인 경계의 거리' },
      { name: 'approach', w: 1600, h: 893, caption: '관리국으로 가는 밤길' },
      { name: 'hub-backyard', w: 1600, h: 900, caption: '관리국 뒤뜰 · 게임 화면' },
    ],
  },
  {
    id: 'wormup',
    title: 'WORM UP!',
    // The game's own subtitles, from its title screen.
    tagline: 'Not Every Spring Arrives at Once',
    taglineKo: '봄은 모두에게 같은 날 오지 않았다',
    line: '지렁이는 계속 앞으로 간다.',
    kind: 'Narrative Adventure',
    genre: '내러티브 어드벤처',
    platforms: ['PC (Steam)'],
    releaseState: 'inDevelopment',
    statusNote: '이야기는 처음부터 끝까지 만들어져 있습니다. 음성과 음악은 아직 넣지 않았습니다.',
    keyArt: art('wormup'),
    accent: '#c98b4a',
    links: [],
    world: 'wormup',
    about: [
      '작은 지렁이가 자랍니다. 학교에 가고, 음악을 하고, 시험을 보고, 회사에 다닙니다.',
      '늘 최선을 다하고 꽤 잘하지만, 1등은 거의 언제나 다른 누군가입니다.',
      '한 발 떨어진 목소리가 그 삶을 지켜보며, 가끔 당신에게 말을 겁니다.',
    ],
    core: [
      { title: '앞으로', text: '움직임은 하나, 앞으로 가기. 어릴 땐 궁금해서, 학생 땐 따라잡으려고, 회사에선 밀려서 갑니다.' },
      { title: '삶과 이어진 놀이', text: '연주, 시험, 수업, 회의. 놀이는 모두 지렁이가 살아온 방식과 이어져 있습니다.' },
      { title: '살지 않은 인생', text: '고르지 않았던 길로 굴이 열리고, 끝에서 여러 갈래의 엔딩을 만납니다.' },
    ],
    features: [
      '어린 시절부터 어른이 될 때까지 이어지는 이야기',
      '한 발 떨어져 지켜보는 내레이터',
      '이야기와 이어진 놀이: 연주 · 시험 · 수업 · 회의',
      '살지 않은 인생의 굴과 여러 엔딩',
      '손으로 그린 동물들의 마을',
    ],
    characters: [
      { name: '지렁이', role: '어린 시절', picture: 'char-worm-child', w: 364, h: 310 },
      { name: '지렁이', role: '학생', picture: 'char-worm-teen', w: 365, h: 301 },
      { name: '지렁이', role: '어른', picture: 'char-worm-office', w: 365, h: 360 },
      { name: '엄마', role: '', picture: 'char-mom', w: 459, h: 345 },
    ],
    // Frames of the Steam build, played start to finish (2026-10-03); the
    // captions are the chapters' own titles.
    gallery: [
      { name: 'c01-why-worm', w: 1600, h: 900, caption: '왜 나는 지렁이일까' },
      { name: 'c05b-nobody-came', w: 1600, h: 900, caption: '아무도 먼저 안 왔다' },
      { name: 'c05c-music-room', w: 1600, h: 900, caption: '음악실' },
      { name: 'c05n-dawn', w: 1600, h: 900, caption: '새벽 다섯 시의 음악실' },
      { name: 'c05o-univ', w: 1600, h: 900, caption: '대학은 음악으로' },
      { name: 'c14-same-road', w: 1600, h: 900, caption: '우리는 같은 길을 걷는 줄 알았다' },
      { name: 'c17-bridge', w: 1600, h: 900, caption: '제가 부장님 찔러드릴까요?' },
      { name: 'c26-student', w: 1600, h: 900, caption: '다시 학생' },
    ],
  },
  {
    id: 'lumiora',
    title: 'LUMIORA',
    tagline: 'A musical action-adventure where sound shapes the world.',
    taglineKo: '클래식이 배경음악이 아니라, 세계의 물리법칙이 되는 곳.',
    kind: 'Stylized 3D Musical Action-Adventure',
    genre: '3D 음악 내러티브 어드벤처',
    platforms: ['PC'],
    releaseState: 'inDevelopment',
    keyArt: art('lumiora'),
    accent: '#6fb6a8',
    links: [{ label: 'STEAM · 준비 중' }],
    world: 'lumiora',
    about: [
      '음 하나가 사라진 현실에서, ‘들려?’ 하는 목소리를 따라 LUMIORA에 닿습니다.',
      '여섯 작곡가의 Score World를 지나며, 깨진 Grand Score를 복원합니다.',
      '셈여림은 물살이 되고, 음높이는 기둥의 높이가 되고, 음색은 갈 길을 고릅니다.',
      '고요(Silence)는 없애야 할 적이 아니라 음악의 일부입니다. 마지막 빈 페이지에는 플레이어가 직접 악보를 남깁니다.',
    ],
    core: [
      { title: '음악이 움직이는 세계', text: '셈여림이 물살을 밀고, 레가토와 스타카토가 다리를 잇고 끊습니다.' },
      { title: 'Resonance', text: '보이는 것은 지금, 들리는 것은 다음. 귀 기울이면 길이 먼저 들립니다.' },
      { title: 'YOUR SCORE', text: '마지막 장, 플레이어가 직접 짧은 음악을 만듭니다.' },
    ],
    lists: [
      {
        title: 'SCORE WORLDS',
        rows: [
          { name: 'Vivaldi', text: '몸과 호흡 · 들이쉬면 공간이 넓어지고, 내쉬면 좁아진다' },
          { name: 'Saint-Saëns', text: '상실과 빈자리 · 고쳐지지 않는 자리' },
          { name: 'Beethoven', text: '고요와 고립 · 소리가 한 겹씩 사라진다' },
          { name: 'Tchaikovsky', text: '자아와 가면 · 보이는 나와 숨긴 나' },
          { name: 'Rimsky-Korsakov', text: '권력과 검열' },
          { name: 'Debussy', text: '유한함과 시간 · 되돌릴 수 없는 시간' },
          { name: 'Your Score', text: '마지막 빈 페이지' },
        ],
      },
    ],
    features: [
      '여섯 작곡가의 Score World, 그리고 Your Score',
      '셈여림 · 음색 · 음높이가 세계를 바꾸는 규칙',
      '귀 기울이면 먼저 들리는 길',
      '박자 위의 가벼운 전투',
      '소리를 잃은 세계의 복원',
    ],
    gallery: [
      { name: 'aquarium-concept', w: 1600, h: 900, caption: 'Aquarium · 컨셉 아트' },
    ],
  },
  {
    id: 'rubato',
    title: 'RUBATO',
    tagline: 'A time-slip music mystery romance, Vienna 1791.',
    taglineKo: '빼앗긴 시간에서, 당신을 만났다.',
    kind: 'Time-slip Music Romance / Visual Novel',
    genre: '타임슬립 음악 미스터리 로맨스',
    platforms: ['PC'],
    releaseState: 'inDevelopment',
    keyArt: art('rubato'),
    accent: '#b49a69',
    links: [{ label: 'STEAM · 준비 중' }],
    world: 'rubato',
    about: [
      '2026년 서울. 박물관의 자동인형 시계가 열세 번째 시각을 치던 날,',
      '윤서아는 1791년 11월의 빈에서 눈을 뜹니다.',
      '서로 다른 시대에서 불려 온 작곡가들이 같은 도시에 모여 있습니다.',
      '함께 사건을 풀고, 한 사람을 선택합니다.',
    ],
    core: [
      { title: '다섯 사람', text: '베토벤, 모차르트, 슈베르트, 브람스, 말러 — 다섯 개의 루트.' },
      { title: '단서와 추리', text: '74개의 단서를 모아 사건을 풉니다.' },
      { title: '휴대폰과 되감기', text: '2026년에서 가져온 휴대폰, 그리고 되감을 수 있는 선택.' },
    ],
    lists: [
      {
        title: '1791, VIENNA',
        rows: [
          { name: '윤서아', text: '2026년 서울에서 온 주인공' },
          { name: '베토벤', text: '1800년에서 · 반존대' },
          { name: '모차르트', text: '1781년에서 · 빠른 반말' },
          { name: '슈베르트', text: '1825년에서 · 부드러운 존댓말' },
          { name: '브람스', text: '1868년에서 · 낮고 건조한 존댓말' },
          { name: '말러', text: '정확한 업무형 존댓말' },
          { name: '살리에리', text: '조사를 짝지어 맡기는 사람 · 정돈된 반말' },
          { name: '클라라 · 펠릭스 · 파니', text: '같은 도시의 음악가들' },
        ],
      },
    ],
    features: [
      '다섯 사람의 루트',
      '서른 날, 여섯 개의 사건',
      '74개의 단서와 추리',
      '56곳의 선택',
      '여섯 개의 엔딩',
    ],
    gallery: [
      { name: 'title', w: 1600, h: 900, caption: '타이틀 화면 · v0.1.0' },
      { name: 'cafe-scene', w: 1600, h: 900, caption: '빈의 카페 · 게임 화면' },
      { name: 'opera', w: 1600, h: 900, caption: '궁정 오페라 극장' },
      { name: 'stage', w: 1600, h: 900, caption: '오페라 무대' },
      { name: 'street', w: 1600, h: 900, caption: '1791년 빈의 골목' },
      { name: 'xiii', w: 1600, h: 900, caption: '열세 번째 시각의 시계가 있던 전시실' },
    ],
  },
] as const

export function getProject(id: string): ProjectConfig | undefined {
  return PROJECTS.find((p) => p.id === id)
}

/** The page a work has of its own. */
export function workHref(id: string): string {
  return `/works/${id}.html`
}

/** A work's picture, by its stem and size. */
export function workPicture(id: string, name: string, size: 'thumb' | 'full'): string {
  return `/assets/images/works/${id}/${name}-${size}.webp`
}

/** What the page and the PC open on: the key art, or the work's own hero picture. */
export function coverOf(p: ProjectConfig): string | null {
  return p.hero ? workPicture(p.id, p.hero.name, 'full') : p.keyArt
}

/** The only place a release state is turned into words a visitor reads. */
export const STATE_LABEL: Record<string, string> = {
  concept: 'CONCEPT',
  inDevelopment: 'IN DEVELOPMENT',
  comingSoon: 'COMING SOON',
  testing: 'TESTING',
  available: 'AVAILABLE',
  released: 'RELEASED',
}

/** Update notes belong to a work that is out, and only if there are any. */
export function updatesOf(p: ProjectConfig): readonly UpdateNote[] {
  const out = p.updates ?? []
  return p.releaseState === 'released' || p.releaseState === 'available' ? out : []
}
