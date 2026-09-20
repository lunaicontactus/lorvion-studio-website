/**
 * The five works — the one source the garage PC, the WORKS index and each
 * work's own page read.
 *
 * Every line here was checked against the project's own repository on
 * 2026-09-19 (docs/WORKS.md lists the files each fact came from). Where the
 * repository and an older description disagreed, the newer record won; where
 * something could not be confirmed it is not said. Nothing is `released`:
 * none of the five has a store page. The development log is real commits,
 * with their dates and hashes; the build lists are what the project's own
 * status documents mark done, in progress, or not started.
 *
 * `keyArt` is read from src/data/artwork.ts (the wall print's full copy), so
 * the picture on the wall and the picture on the page cannot drift apart.
 */
import { artworkFor, fullSrc } from '@/data/artwork'
import type { ProjectConfig } from '@/types/project'

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
    status: 'testflight',
    engine: 'Expo · React Native',
    milestone: 'iOS 1.1.0 QA 빌드 · 노래 품질 다듬는 중',
    keyArt: art('lunai'),
    accent: '#8c7cff',
    links: [
      { label: 'TESTFLIGHT · 비공개 테스트' },
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
      { title: '일기', text: '그날 있었던 일을 적으면, 그 기록이 노래의 바탕이 됩니다.' },
      { title: '캐릭터의 답', text: '캐릭터가 자기 방에서 답하고, 이야기를 이어 갈 수 있습니다.' },
      { title: '30초 노래', text: '기록으로 가사를 쓰거나 직접 적어, 노래와 표지를 만듭니다.' },
      { title: '앨범', text: '만든 노래가 앨범에 모이고, 주간·월간 리포트로 돌아봅니다.' },
      { title: '친구방', text: '초대 코드로 방을 만들어 노래를 나누고 반응을 남깁니다.' },
    ],
    build: [
      { label: '감정 체크인 → 일기 → 노래로 이어지는 기록 흐름', state: 'done' },
      { label: '캐릭터 10명의 방과 대화', state: 'done' },
      { label: '노래 생성과 재생 · 실기기에서 확인 (테스트 서버)', state: 'done' },
      { label: '앨범 표지와 앨범 저장', state: 'done' },
      { label: '친구방 · 노래 공유 · 반응', state: 'done' },
      { label: '가사를 또렷하게 부르는 보컬 품질', state: 'doing' },
      { label: 'TestFlight 실기기 QA', state: 'doing' },
      { label: '결제 연결', state: 'todo' },
      { label: 'App Store 출시', state: 'todo' },
    ],
    asOf: '2026.09.19',
    devLog: [
      { date: '2026.09.19', ref: 'fa9816c', text: '루나아이만의 한국어 노래 목소리를 위한 녹음 팩 1,558개를 구성했다.' },
      { date: '2026.09.14', ref: '4441f27', text: '자체 가창 모델로 첫 한국어 보컬을 만들었다. 결과는 부분 성공.' },
      { date: '2026.09.13', ref: 'e87ee5b', text: '외부 API 없이 자체 엔진만으로 30초 반주 10곡을 만들었다.' },
      { date: '2026.09.13', ref: 'faad9c7', text: '첫 실기기 테스트 뒤, 캐릭터 이름·리포트·생성 화면을 고쳤다.' },
      { date: '2026.09.12', ref: 'dba6d41', text: '노래가 완성되면 홈이 스스로 갱신된다.' },
      { date: '2026.09.11', ref: '10f5d51', text: '자체 음악 모델을 연결하고 처음부터 끝까지 확인했다.' },
    ],
    gallery: [
      { name: 'icon', w: 1024, h: 1024, caption: '앱 아이콘 · 달 위의 토끼', kind: 'art' },
      { name: 'album', w: 739, h: 1600, caption: '감정 음악 앨범 화면 (웹 미리보기)', kind: 'screen' },
      { name: 'room-chat', w: 739, h: 1600, caption: '캐릭터의 방 · 펭귄과의 대화 (웹 미리보기)', kind: 'screen' },
      { name: 'room-dal-tokki', w: 900, h: 1600, caption: '달토끼의 방', kind: 'art' },
      { name: 'room-winter', w: 900, h: 1600, caption: '계절에 따라 바뀌는 방 · 겨울', kind: 'art' },
      { name: 'cover-village', w: 1254, h: 1254, caption: '기본 앨범 표지', kind: 'art' },
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
    status: 'inDevelopment',
    engine: 'React · three.js',
    milestone: 'CASE04 3D 프로토타입 · 사람 플레이테스트 준비',
    keyArt: art('liminal'),
    accent: '#c4a36e',
    links: [{ label: 'COMING SOON' }],
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
      { title: '직원들의 과거', text: '여섯 직원이 살았던 시대의 기억을 직접 플레이합니다.' },
      { title: '경계관리국', text: '사건과 사건 사이, 관리국 곳곳을 걸으며 직원들과 지냅니다.' },
      { title: '1인칭', text: '몸도 얼굴도 보이지 않는 ‘나’의 눈으로 봅니다.' },
    ],
    build: [
      { label: '시즌 1 이야기 전체 · 프롤로그, 사건 7개, 최종장과 에필로그', state: 'done' },
      { label: '경계관리국 자유 이동 (8곳)', state: 'done' },
      { label: '직원 과거 기억 3편 · 36장면', state: 'done' },
      { label: 'CASE04 3D 그레이박스 에피소드 · 기술 검증 통과', state: 'done' },
      { label: '해령의 기억 챕터 · 3D 수직 슬라이스 (프로토타입)', state: 'doing' },
      { label: 'CASE04 사람 플레이테스트', state: 'todo' },
      { label: '새 7사건 구조 처음부터 끝까지 플레이 검수', state: 'todo' },
      { label: '직원 일러스트 새로 그리기', state: 'todo' },
    ],
    asOf: '2026.09.19',
    devLog: [
      { date: '2026.09.19', ref: 'bc5ca5e', text: '해령의 기억을 걷는 3D 챕터를 수직 슬라이스로 만들었다 (프로토타입).' },
      { date: '2026.09.19', ref: '2ddfdaf', text: 'CASE04 사람 플레이테스트 절차를 정리했다.' },
      { date: '2026.09.18', ref: 'af5f976', text: '3D CASE04에 조명, 물, 비를 입혔다.' },
      { date: '2026.09.17', ref: 'd0bd415', text: '첫 3D 그레이박스 에피소드 — 물에 잠긴 반지하 집, 해령이 동행한다.' },
      { date: '2026.09.17', ref: 'ff30fc1', text: 'three.js로 3D 조사 트랙을 시작했다.' },
    ],
    gallery: [
      { name: 'bureau', w: 1600, h: 893, caption: '경계관리국 앞', kind: 'art' },
      { name: 'crossroads', w: 1600, h: 893, caption: '시대가 섞인 경계의 거리', kind: 'art' },
      { name: 'approach', w: 1600, h: 893, caption: '관리국으로 가는 밤길', kind: 'art' },
      { name: 'hub-backyard', w: 1600, h: 900, caption: '관리국 뒤뜰 · 게임 화면', kind: 'screen' },
      { name: 'case04-3d-landing', w: 1600, h: 900, caption: 'CASE04 3D · 그레이박스', kind: 'greybox' },
      { name: 'case04-3d-window', w: 1600, h: 900, caption: 'CASE04 3D · 기억의 층 · 그레이박스', kind: 'greybox' },
    ],
  },
  {
    id: 'wormup',
    title: 'WORM UP!',
    tagline: 'A little worm, two hundred stages uphill.',
    taglineKo: '작은 몸으로 200개의 스테이지를 오른다.',
    kind: 'Mobile Runner / Action',
    genre: '횡스크롤 등산 러너',
    platforms: ['iOS'],
    status: 'testflight',
    engine: 'Expo · React Native',
    milestone: 'Build 21 출시 후보 · 실기기 QA 대기',
    keyArt: art('wormup'),
    accent: '#dc665f',
    links: [{ label: 'COMING SOON' }],
    world: 'wormup',
    about: [
      '새에게 납치된 여자친구를 찾아, 작은 지렁이가 산꼭대기를 향해 달립니다.',
      '달리고, 뛰고, 숙이고, 대시하며 20개 지역, 200개 스테이지를 오릅니다.',
      '길에서 구한 동물 친구들이 함께 달리고, 열세 마리의 보스가 길을 막습니다.',
    ],
    core: [
      { title: '탭 러너', text: '점프, 대시, 숙이기. 손가락 하나로 산을 오릅니다.' },
      { title: '200 스테이지', text: '햇살 산기슭에서 하늘 둥지까지, 20개 지역.' },
      { title: '보스 13', text: '바위게 두목부터 새들의 왕까지. 이기면 트로피와 꾸미기 보상.' },
      { title: '동료 9', text: '거북이, 곰, 작은 새, 두더지… 구한 친구가 함께 달립니다.' },
      { title: '꾸미기', text: '스킨 6, 액세서리 24, 대시 트레일 12.' },
      { title: '주간 도전', text: '매주 바뀌는 도전으로 정상 스탬프를 모읍니다.' },
    ],
    build: [
      { label: '200 스테이지 · 20개 지역', state: 'done' },
      { label: '보스 13 · 트로피와 보상', state: 'done' },
      { label: '동료 9마리 구조와 동행', state: 'done' },
      { label: '스킨 · 액세서리 · 대시 트레일', state: 'done' },
      { label: '자동 검증 · 테스트 92개 묶음, 보스 공정성 봇', state: 'done' },
      { label: 'Build 21 출시 후보 검수', state: 'doing' },
      { label: '실기기 QA 체크리스트', state: 'todo' },
      { label: '보스 연출 영상 일부', state: 'todo' },
      { label: '스토어 출시', state: 'todo' },
    ],
    asOf: '2026.09.19',
    devLog: [
      { date: '2026.09.19', ref: 'd4fed636', text: 'iOS 빌드 번호를 21로 올렸다.' },
      { date: '2026.09.19', ref: '01e86f81', text: '트로피 13개를 모으면 받는 ‘수집가의 왕관’에 전용 그림을 붙였다.' },
      { date: '2026.09.19', ref: 'e3439432', text: '액세서리가 달리는 자리를 한 곳에서 정하는 리그 시스템을 만들었다.' },
      { date: '2026.09.18', ref: '2d23d506', text: 'Build 21 게임플레이를 동결했다. 피할 수 없던 보스 피해를 없앴다.' },
      { date: '2026.09.18', ref: '1cf66f0b', text: '보스전 연출, 동료의 행동, 보스 이름패를 더했다.' },
      { date: '2026.09.18', ref: 'e2ffbdaf', text: 'Build 20 — 액세서리 그리기와 보스 등장 만화를 고쳤다.' },
    ],
    gallery: [
      { name: 'climb', w: 893, h: 1600, caption: '산꼭대기를 올려다보는 지렁이', kind: 'art' },
      { name: 'couple', w: 893, h: 1600, caption: '이야기의 시작', kind: 'art' },
      { name: 'kidnap', w: 893, h: 1600, caption: '납치', kind: 'art' },
      { name: 'crow-boss', w: 768, h: 1344, caption: '50번째 스테이지의 보스, 까악이', kind: 'art' },
      { name: 'icon', w: 1024, h: 1024, caption: '앱 아이콘', kind: 'art' },
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
    status: 'prototype',
    engine: 'Unity 6 · URP',
    milestone: 'Aquarium 그레이박스 · 사람 플레이 검증 대기',
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
      { title: '음색과 음높이', text: '한 악기의 소리를 골라 길을 찾고, 선율의 높낮이가 기둥이 됩니다.' },
      { title: '박자 위의 전투', text: '박자에 맞춘 한 번이 더 깊게 들어가는, 가벼운 전투.' },
      { title: '복원', text: '구역을 지나면 소리를 잃은 세계에 음악이 돌아옵니다.' },
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
    build: [
      { label: 'Aquarium 그레이박스 · 7구역 (Crystal Shore → Restoration)', state: 'done' },
      { label: '이동 · 점프 · 박자 회피 · 귀 기울이기', state: 'done' },
      { label: '한 박자 시계 위에 겹치는 음악', state: 'done' },
      { label: '음악 물리 4가지 · 셈여림, 아티큘레이션, 음색, 음높이', state: 'done' },
      { label: '가벼운 전투 · 25초 복원 연출', state: 'done' },
      { label: '자동 검증 · EditMode 61, PlayMode 43', state: 'done' },
      { label: '사람 플레이 검증 (GATE 1)', state: 'doing' },
      { label: 'Crystal Heart 피날레', state: 'todo' },
      { label: '아트 패스 (GATE 2)', state: 'todo' },
      { label: '프롤로그와 Mew Palace (GATE 3)', state: 'todo' },
    ],
    asOf: '2026.09.19',
    devLog: [
      { date: '2026.09.17', ref: '00b3306', text: '그레이박스 중간 검증. 카메라와 HUD를 고치고 QA 보고서를 남겼다.' },
      { date: '2026.09.17', ref: '42a1cae', text: '봇이 끝까지 달리며 찾은 버그를 고치고 회귀 테스트를 더했다.' },
      { date: '2026.09.16', ref: 'a3a628d', text: 'Aquarium 그레이박스 — 7개 구역, 음악 물리 4가지, 가벼운 전투, 복원.' },
      { date: '2026.09.16', ref: 'dcef7cc', text: 'Aquarium 설계 — 참고 게임 연구, 설계 계약, 피날레 상태표.' },
      { date: '2026.09.14', ref: 'a07b9ee', text: '첫 증명 방이 사람 플레이에서 떨어진 뒤, Flow Room으로 다시 지었다.' },
      { date: '2026.09.14', ref: '6820bbc', text: '첫 커밋 — 기반 공사와 음악 물리 증명 방.' },
    ],
    gallery: [
      { name: 'aquarium-concept', w: 1600, h: 900, caption: 'Aquarium · 컨셉 아트', kind: 'concept' },
      { name: 'flow-garden', w: 1280, h: 720, caption: 'Flow Garden · 셈여림이 물살이 된다 · 그레이박스', kind: 'greybox' },
      { name: 'glass-weave', w: 1280, h: 720, caption: 'Glass Weave · 이어지고 끊기는 다리 · 그레이박스', kind: 'greybox' },
      { name: 'echo-grotto', w: 1280, h: 720, caption: 'Echo Grotto · 음색으로 길을 고른다 · 그레이박스', kind: 'greybox' },
      { name: 'pitch-cathedral', w: 1280, h: 720, caption: 'Pitch Cathedral · 선율의 높이 · 그레이박스', kind: 'greybox' },
      { name: 'restoration', w: 1280, h: 720, caption: 'Restoration · 그레이박스', kind: 'greybox' },
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
    status: 'inDevelopment',
    engine: "Ren'Py 8.3",
    milestone: 'v0.1.0 · 이야기 전체 연결, 최종 그림·소리 제작 전',
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
      { title: '여섯 개의 사건', text: '프롤로그에서 FINAL CASE까지 이어지는 서른 날의 이야기.' },
      { title: '단서와 추리', text: '74개의 단서를 모아 사건을 풉니다.' },
      { title: '선택', text: '56곳의 선택지가 관계와 루트를 정합니다.' },
      { title: '휴대폰과 되감기', text: '2026년에서 가져온 휴대폰, 그리고 되감을 수 있는 선택.' },
      { title: '재회', text: '모든 루트는 현대에서 다시 만나는 장면으로 끝납니다.' },
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
    build: [
      { label: '대본 전체 · 232장면, DAY 0–30과 에필로그', state: 'done' },
      { label: '엔딩 6종 모두 도달 (자동 플레이)', state: 'done' },
      { label: '관계 · 단서 · 휴대폰 · 저장과 되감기 · 접근성', state: 'done' },
      { label: '직접 조작 장면 27개 중 26개', state: 'doing' },
      { label: '사람 플레이테스트', state: 'todo' },
      { label: 'CG 39장', state: 'todo' },
      { label: '효과음과 환경음', state: 'todo' },
      { label: 'Steam 연결', state: 'todo' },
    ],
    asOf: '2026.09.19',
    devLog: [
      { date: '2026.09.17', ref: '1651f05', text: '관계와 선택에 따라 나와야 할 장면만 나오게 했다.' },
      { date: '2026.09.16', ref: 'c1d6222', text: '참고 게임을 연구하고, 가져올 것과 안 가져올 것을 정했다.' },
      { date: '2026.08.30', ref: 'dc46e7b', text: '관계 수치가 실제로 움직이고, 엔딩 여섯 개에 모두 닿는다.' },
      { date: '2026.08.30', ref: '5f30e3d', text: '루트 선택을 연결했다. 한 번의 플레이에 한 루트.' },
      { date: '2026.08.30', ref: 'a2250ee', text: '엔딩, 접근성 설정, Steam 어댑터, 출시 점검표.' },
      { date: '2026.08.27', ref: '260c6f6', text: '대본을 데이터로 — 게임이 대본을 그대로 따라 걷는다.' },
    ],
    gallery: [
      { name: 'title', w: 1600, h: 900, caption: '타이틀 화면 · v0.1.0', kind: 'screen' },
      { name: 'cafe-scene', w: 1600, h: 900, caption: '빈의 카페 · 게임 화면', kind: 'screen' },
      { name: 'opera', w: 1600, h: 900, caption: '궁정 오페라 극장', kind: 'art' },
      { name: 'stage', w: 1600, h: 900, caption: '오페라 무대', kind: 'art' },
      { name: 'street', w: 1600, h: 900, caption: '1791년 빈의 골목', kind: 'art' },
      { name: 'xiii', w: 1600, h: 900, caption: '열세 번째 시각의 시계가 있던 전시실', kind: 'art' },
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

export const STATUS_LABEL = {
  released: 'RELEASED',
  testflight: 'TESTFLIGHT QA',
  inDevelopment: 'IN DEVELOPMENT',
  prototype: 'PROTOTYPE',
  comingSoon: 'COMING SOON',
} as const
