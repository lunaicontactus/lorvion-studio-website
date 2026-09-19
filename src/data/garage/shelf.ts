/**
 * THE ARCHIVE CABINET — what is on the shelf, and what is in its drawers.
 *
 * Not a cabinet of pretty things. Everything on it came out of the studio's
 * own work: the top shelf is WORM UP!, the middle is LIMINAL and LUNAI, the
 * bottom is RUBATO and LUMIORA, and the two drawers are the working records —
 * the tools and drafts, and the printed photos of the work. The cabinet is the
 * studio's own painting of it (garage/archive_cabinet.webp, cut out of the
 * reference delivered 2026-09-19), so every object is already drawn; this file
 * says where each one is and what it is.
 *
 * `box` is where the object is drawn, as a fraction of the cut-out — measured
 * off the reference with a 50 px grid. What each note says is what the
 * project itself says (src/data/projects.ts) or what can be seen in the room;
 * nothing is invented about a project.
 */
import type { Frac } from '@/data/props'

export type CabinetShelf = 'top' | 'middle' | 'bottom' | 'drawer'

export interface CabinetItem {
  readonly id: string
  readonly shelf: CabinetShelf
  /** The work it came from. Drawers belong to the studio, not one work. */
  readonly projectId?: string
  readonly box: Frac
  readonly title: string
  readonly note: string
}

export const CABINET_ITEMS: readonly CabinetItem[] = [
  // The top shelf: WORM UP!, the climb.
  {
    id: 'wormup-plush', shelf: 'top', projectId: 'wormup',
    box: { x: 0.259, y: 0.192, w: 0.17, h: 0.137 },
    title: '두건 쓴 지렁이',
    note: 'WORM UP!의 주인공, 게임 속 꾸미기에 있는 닌자 두건 차림. 제일 높은 칸은 오르는 게임의 자리다.',
  },
  {
    id: 'wormup-crown', shelf: 'top', projectId: 'wormup',
    box: { x: 0.443, y: 0.255, w: 0.121, h: 0.076 },
    title: '아주 작은 왕관',
    note: 'WORM UP! 꾸미기 상점에 있는 왕관. 끝까지 올라간 날을 위해 올려 두었다.',
  },
  {
    id: 'wormup-gear', shelf: 'top', projectId: 'wormup',
    box: { x: 0.569, y: 0.181, w: 0.219, h: 0.15 },
    title: '산길 팻말과 등반 장비',
    note: '배낭, 곡괭이, 위를 가리키는 팻말. 오르고, 떨어지고, 다시 오른다 — 모바일 클라이밍 러너 WORM UP!.',
  },
  // The middle shelf: LIMINAL, and LUNAI.
  {
    id: 'liminal-book', shelf: 'middle', projectId: 'liminal',
    box: { x: 0.265, y: 0.368, w: 0.163, h: 0.163 },
    title: '밤의 기록부',
    note: '문 앞에 선 사람이 그려진 표지. 조용한 사무실, 어딘가 어긋난 기록 — LIMINAL.',
  },
  {
    id: 'liminal-notes', shelf: 'middle', projectId: 'liminal',
    box: { x: 0.43, y: 0.376, w: 0.065, h: 0.155 },
    title: '어긋난 서류',
    note: 'LIMINAL은 서류가 틀린 조용한 사무실의 이야기다. 맞지 않는 곳마다 표시를 해 둔 사본.',
  },
  {
    id: 'liminal-lantern', shelf: 'middle', projectId: 'liminal',
    box: { x: 0.497, y: 0.39, w: 0.088, h: 0.142 },
    title: '다리의 등불',
    note: 'LIMINAL 포스터 속 다리 난간에 켜져 있던 등불. PC로 만드는 서사 미스터리.',
  },
  {
    id: 'lunai-diary', shelf: 'middle', projectId: 'lunai',
    box: { x: 0.588, y: 0.378, w: 0.134, h: 0.152 },
    title: '달 표지 일기장',
    note: 'LUNAI는 감정 일기다. 감정을 음악으로, 이야기를 노래로.',
  },
  {
    id: 'lunai-jar', shelf: 'middle', projectId: 'lunai',
    box: { x: 0.724, y: 0.419, w: 0.071, h: 0.112 },
    title: '별을 담은 병',
    note: 'LUNAI 포스터의 밤하늘에서 떨어진 별을 모아 둔 병.',
  },
  // The bottom shelf: RUBATO, and LUMIORA.
  {
    id: 'rubato-score', shelf: 'bottom', projectId: 'rubato',
    box: { x: 0.193, y: 0.568, w: 0.153, h: 0.16 },
    title: 'RUBATO 악보',
    note: '1791년, 빈. 비주얼 노벨 RUBATO의 악보. 아직 출시 전이다.',
  },
  {
    id: 'rubato-metronome', shelf: 'bottom', projectId: 'rubato',
    box: { x: 0.346, y: 0.593, w: 0.103, h: 0.134 },
    title: '메트로놈',
    note: 'RUBATO — 박자를 잠깐 늦췄다가 당기는 연주를 이르는 말. 이 메트로놈은 모른 척한다.',
  },
  {
    id: 'lumiora-musicbox', shelf: 'bottom', projectId: 'lumiora',
    box: { x: 0.449, y: 0.578, w: 0.187, h: 0.089 },
    title: '작은 피아노 오르골',
    note: '듣고, 발견하고, 나만의 소리로 이야기하다 — 음악 동화 LUMIORA.',
  },
  {
    id: 'rubato-ticket', shelf: 'bottom', projectId: 'rubato',
    box: { x: 0.527, y: 0.667, w: 0.156, h: 0.061 },
    title: '오페라 입장권',
    note: 'RUBATO의 오페라 극장. 텔레비전 위 액자에 걸린 그림이 그 극장이다.',
  },
  // The drawers: the studio's working records.
  {
    id: 'drawer-tools', shelf: 'drawer',
    box: { x: 0.153, y: 0.759, w: 0.327, h: 0.195 },
    title: '초안과 도구',
    note: '두루마리 초안, 렌치, 실타래, 스케치. 작업대에 오르기 전의 것들.',
  },
  {
    id: 'drawer-records', shelf: 'drawer',
    box: { x: 0.501, y: 0.759, w: 0.349, h: 0.195 },
    title: '인화한 작업 사진',
    note: '작업대에서 찍은 기록을 인화해 둔 서랍. 날짜와 커밋이 뒤에 적혀 있다.',
  },
]
