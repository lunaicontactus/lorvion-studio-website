/**
 * DIARY — the studio's development log (EUNGARAGE 2.0, PART 11).
 *
 * Every entry is something that happened, on the day it happened: dates are
 * this repository's own release tags and merges (git tag / git log), numbers
 * are the ones measured in the reports under docs/. No entry promises a date
 * or a feature that is not out. New entries go at the top.
 *
 * Static on purpose (PART 25): the log changes when the site does, through a
 * commit, so it needs no editor. An admin-edited log can come with the
 * server (docs/EUNGARAGE_2_0.md) if posting without a deploy is wanted.
 */
export type DiaryKind = '개발 진행' | '캐릭터 제작' | '게임 세계관' | '업데이트' | '버그 수정' | '제작 비하인드' | '공지사항'

export interface DiaryEntry {
  /** Stable anchor: diary.html#<id>. */
  readonly id: string
  /** YYYY-MM-DD, the day it shipped or happened. */
  readonly date: string
  readonly title: string
  /** The site itself, or a work id from src/data/projects.ts. */
  readonly tag: 'EUNGARAGE' | 'lunai' | 'liminal' | 'wormup' | 'lumiora' | 'rubato'
  readonly kind: DiaryKind
  /** Who on the crew writes it up (src/data/characters.ts). */
  readonly by: string
  readonly body: readonly string[]
  readonly image?: { readonly src: string; readonly w: number; readonly h: number; readonly alt: string }
  /** Where it stands now. */
  readonly status: '완료' | '진행 중'
  readonly link?: { readonly label: string; readonly href: string }
}

export const DIARY: readonly DiaryEntry[] = [
  {
    id: '2026-11-19-new-crew', date: '2026-11-19', tag: 'EUNGARAGE', kind: '캐릭터 제작', by: 'momo', status: '진행 중',
    title: '새 크루 여섯이 차고에 왔어요',
    body: [
      '모모 · 누누 · 루키 · 포코 · 요미, 그리고 스튜디오 고양이 임레븐. 은가라지의 크루가 새 모습으로 바뀌었어요.',
      '그림을 새로 그리지 않고, 원화 그대로를 말랑하게 휘어서 걷기 · 숨쉬기 · 점프 · 갸웃 프레임을 만들었어요. 한 명에 84장, 모두 504장이에요.',
      '차고 안에서 크루를 누르면 말 걸기 · 쓰다듬기 · 들어 올리기 · 사원증 보기를 할 수 있어요.',
    ],
    image: { src: '/assets/images/crew-mochi/crew_overview.webp', w: 1536, h: 1024, alt: '크루 여섯의 종합 캐릭터 시트' },
    link: { label: 'CREW — 사원증 보러 가기', href: '/crew.html' },
  },
  {
    id: '2026-10-12-final-qa', date: '2026-10-12', tag: 'EUNGARAGE', kind: '업데이트', by: 'nunu', status: '완료',
    title: '사이트 대정리 끝: 검색, 속도, 최종 점검',
    body: [
      '작품 페이지가 훨씬 가벼워졌어요. WORKS 페이지가 받는 양이 1.1MB에서 0.32MB로 줄었어요.',
      '링크를 공유하면 작품마다 자기 그림이 미리보기로 나와요.',
      '세 가지 브라우저에서 여섯 가지 방문 경로를 처음부터 끝까지 확인했어요.',
    ],
  },
  {
    id: '2026-10-10-mobile', date: '2026-10-10', tag: 'EUNGARAGE', kind: '업데이트', by: 'ruki', status: '완료',
    title: '휴대폰에서도 편하게',
    body: [
      '누를 수 있는 것은 모두 손가락 크기(44px) 이상으로, 글자는 모두 10px 이상으로 맞췄어요.',
      '키보드만으로도 차고를 돌아다닐 수 있어요. 자동 접근성 검사에서 문제 0건이 나왔어요.',
    ],
  },
  {
    id: '2026-10-08-archive', date: '2026-10-08', tag: 'EUNGARAGE', kind: '공지사항', by: 'ruki', status: '완료',
    title: '공개 기록실이 열렸어요',
    body: [
      '콘셉트 그림, 캐릭터, 개발 과정, 스크린샷, 예전 디자인, 소리를 한곳에 모았어요.',
      '비밀 창고에 있는 것과는 겹치지 않아요. 비밀 창고는 여전히 별 세 개가 있어야 열려요.',
    ],
    link: { label: 'ARCHIVE — 기록실', href: '/archive.html' },
  },
  {
    id: '2026-10-03-wormup-steam', date: '2026-10-03', tag: 'wormup', kind: '개발 진행', by: 'poko', status: '완료',
    title: 'WORM UP! — Steam 판을 처음부터 끝까지',
    body: [
      'WORM UP!의 Steam 판을 처음부터 끝까지 플레이하며 찍은 장면으로 작품 페이지 갤러리를 채웠어요.',
      '장면 설명은 게임 속 챕터 제목 그대로예요.',
    ],
    link: { label: 'WORM UP! 작품 페이지', href: '/works/wormup.html' },
  },
  {
    id: '2026-09-25-telescope', date: '2026-09-25', tag: 'EUNGARAGE', kind: '업데이트', by: 'yomi', status: '완료',
    title: '망원경으로 보는 밤하늘',
    body: [
      '비밀 창고의 망원경을 들여다보면 별 1,146개가 있는 밤하늘이 나와요. 운이 좋으면 별똥별도 지나가요.',
      '라디오는 한 번에 한 곡만 흐르도록 정리했어요.',
    ],
  },
  {
    id: '2026-09-19-playground', date: '2026-09-19', tag: 'EUNGARAGE', kind: '업데이트', by: 'momo', status: '완료',
    title: '차고 뒤 놀이터와 미니게임 세 개',
    body: [
      '차고 바깥문을 열면 놀이터가 있어요. 요미의 과자 몰래 먹기, 야식 심부름, 모모의 택배 배달을 할 수 있어요.',
      '게임에서 별을 모으면 어딘가의 문이 열린다는 소문이 있어요.',
    ],
  },
  {
    id: '2026-09-18-world-2', date: '2026-09-18', tag: 'EUNGARAGE', kind: '공지사항', by: 'momo', status: '완료',
    title: '차고 문을 열었어요',
    body: [
      '골목에서 셔터를 올리면 차고 안으로 들어올 수 있어요. PC, TV, 냉장고, 라디오, 서랍 — 대부분 눌러 볼 수 있어요.',
    ],
  },
]

export const DIARY_KINDS: readonly DiaryKind[] = ['개발 진행', '캐릭터 제작', '게임 세계관', '업데이트', '버그 수정', '제작 비하인드', '공지사항']
