/**
 * The crew (EUNGARAGE 2.0).
 *
 * Six mochi: five studio staff and the studio cat. Names, roles and looks
 * are the user's character sheets (assets/crew-mochi/source/), which replace
 * the dokkaebi crew of 2026-09 — the old crew's pictures stay on disk and
 * `?mochiCrew=off` brings them back in the room without a deploy.
 *
 * `staff` is the person each one stands for in the studio (직원명), `role`
 * what they do there, `line` the one thing they say on their sheet. How each
 * shows in the room is src/data/behaviour.ts and src/data/routines.ts; the
 * activity weights, zones and click reactions below predate both and are
 * not read by anything.
 */
import type { CharacterConfig } from '@/types/character'

const ART = '/assets/images/crew-mochi'
const still = (id: string, view: 'front' | 'left' | 'back'): string =>
  `${ART}/${id}/idle/${view}/${id}_idle_${view}_01.webp`
const art = (id: string): CharacterConfig['art'] => ({
  front: still(id, 'front'), side: still(id, 'left'), back: still(id, 'back'), nativeHeight: 420,
  portrait: `${ART}/${id}/${id}_portrait.webp`,
})

export const CHARACTERS: readonly CharacterConfig[] = [
  {
    id: 'momo', name: 'MOMO', nameKo: '모모', staff: '응가', colour: '핑크',
    role: 'Studio lead · planning', roleKo: '대표 · 기획 · 총괄',
    trait: 'Full of ideas. Bounces when a new game comes to mind.',
    traitKo: '아이디어가 많고 활발하다. 새로운 게임을 떠올리면 신나서 통통 튄다.',
    line: '좋은 생각 났어!', prop: '핑크 노트북',
    art: art('momo'),
    speed: 46, preferredZones: ['centre', 'left', 'right'], idleBias: 0.34,
    activityWeights: { idle: 5, walk: 4, look: 3, interact: 3, play: 2, sit: 2 },
    clickReactions: ['spark', 'heart', 'note', 'exclaim'], accent: '#ff91c8',
  },
  {
    id: 'nunu', name: 'NUNU', nameKo: '누누', staff: '김로드', colour: '노랑',
    role: 'Development · code · systems', roleKo: '개발 · 코딩 · 시스템',
    trait: 'Careful and responsible. Sometimes dozes off at the keyboard.',
    traitKo: '꼼꼼하고 책임감이 강하다. 가끔 피곤해서 키보드 앞에서 존다.',
    line: '버그만 잡으면 끝이야!', prop: '핑크 게임 컨트롤러',
    art: art('nunu'),
    speed: 40, preferredZones: ['centre', 'left'], idleBias: 0.4,
    activityWeights: { work: 8, idle: 3, sit: 2, walk: 1 },
    clickReactions: ['sweat', 'ellipsis', 'exclaim', 'sleep'], accent: '#ffe99a',
  },
  {
    id: 'ruki', name: 'RUKI', nameKo: '루키', staff: '최미나이', colour: '민트',
    role: 'Research · review', roleKo: '리서치 · 자료 조사 · 검토',
    trait: 'Curious and analytical. Does not let a small mistake slip.',
    traitKo: '호기심이 많고 분석적이다. 작은 오류도 놓치지 않으려 한다.',
    line: '일단 자료부터 찾아보자!', prop: '보라색 별 노트',
    art: art('ruki'),
    speed: 46, preferredZones: ['left', 'centre'], idleBias: 0.3,
    activityWeights: { work: 6, look: 4, walk: 3, idle: 2 },
    clickReactions: ['question', 'spark', 'note', 'exclaim'], accent: '#c9f5e0',
  },
  {
    id: 'poko', name: 'POKO', nameKo: '포코', staff: '조피티', colour: '검정',
    role: 'Story · worldbuilding', roleKo: '스토리 · 세계관 · 기획 보조',
    trait: 'Imaginative and a little mischievous. Drifts off into stories.',
    traitKo: '상상력이 풍부하고 장난기가 있다. 가끔 혼자 상상하다 멍해진다.',
    line: '이야기, 더 재밌게 해볼까?', prop: '보라색 스토리 노트',
    art: art('poko'),
    speed: 38, preferredZones: ['right', 'centre'], idleBias: 0.42,
    activityWeights: { work: 6, idle: 4, look: 2, sit: 2, walk: 1 },
    clickReactions: ['ellipsis', 'question', 'spark', 'heart'], accent: '#d7b7ff',
  },
  {
    id: 'yomi', name: 'YOMI', nameKo: '요미', staff: '이수노', colour: '하늘',
    role: 'Music · sound · mood', roleKo: '음악 · 사운드 · 분위기',
    trait: 'Dreamy and soft. Sways when music plays.',
    traitKo: '감성적이고 몽글몽글하다. 음악을 들으면 저절로 몸을 흔든다.',
    line: '이 장면에 음악, 한번 들어볼래?', prop: '핑크 카세트 플레이어',
    art: art('yomi'),
    speed: 42, preferredZones: ['left', 'centre'], idleBias: 0.36,
    activityWeights: { idle: 4, sit: 3, work: 3, walk: 2 },
    clickReactions: ['note', 'heart', 'note', 'sleep'], accent: '#ddefff',
  },
  {
    id: 'reven', name: 'REVEN', nameKo: '임레븐', staff: '임레븐', colour: '크림 · 연보라',
    role: 'Studio cat', roleKo: '스튜디오 고양이 · 모두의 힐링 담당',
    trait: 'Easy-going and affectionate. Naps beside whoever is working.',
    traitKo: '느긋하고 애교가 많다. 차고를 자유롭게 돌아다니다 누군가의 옆에서 잔다.',
    line: '냐~♡', prop: '털실 공',
    art: art('reven'),
    speed: 50, preferredZones: ['left', 'centre', 'right'], idleBias: 0.5,
    activityWeights: { sit: 5, walk: 4, idle: 3 },
    clickReactions: ['heart', 'heart', 'sleep', 'note'], accent: '#e8d6ff',
  },
] as const

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id)

export function getCharacter(id: string): CharacterConfig | undefined {
  return CHARACTERS.find((c) => c.id === id)
}

/** Keeping the room readable matters more than showing everyone at once. */
export const MAX_ACTIVE_CHARACTERS = 3
