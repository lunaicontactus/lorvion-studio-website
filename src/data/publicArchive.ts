/**
 * PUBLIC ARCHIVE — the studio's official record room (SITE UPGRADE PHASE G),
 * `/archive.html`. Anyone can come in.
 *
 * Only material that exists and can be shown: every entry names where it came
 * from (a commit, a day, a file of the work itself). A category with nothing
 * in it is not shown at all — no placeholder, no "coming soon".
 *
 * SECRET STORAGE (the star-lit room behind the garage, src/data/polaroids.ts)
 * keeps what is not shown here: the drafts given up, the tries, the crew's
 * notes. The two never hold the same picture (test/archive-g.test.ts).
 *
 * Screenshots are not copied: each work's gallery stays on its own page, and
 * the archive points to it.
 */
import { PROJECTS, workPicture } from '@/data/projects'
import { WORKBENCH_ENTRIES } from '@/data/garage/workbench'

export type ArchiveCategoryId = 'concept' | 'characters' | 'development' | 'screenshots' | 'old' | 'sound'

export interface ArchiveCategory {
  readonly id: ArchiveCategoryId
  readonly label: string
  readonly ko: string
  /** One line under the heading: what this shelf is. */
  readonly line: string
}

export const ARCHIVE_CATEGORIES: readonly ArchiveCategory[] = [
  { id: 'concept', label: 'CONCEPT ART', ko: '콘셉트 아트', line: '세계가 처음 한 장의 그림이 된 모습.' },
  { id: 'characters', label: 'CHARACTERS', ko: '캐릭터', line: '차고 크루 다섯, 앞 · 옆 · 뒤. 지금의 도깨비는 이 그림에서 만들어졌다.' },
  { id: 'development', label: 'DEVELOPMENT', ko: '개발 기록', line: '만드는 중에 남은 것. 날짜와 커밋을 함께 적어 둔다.' },
  { id: 'screenshots', label: 'SCREENSHOTS', ko: '스크린샷', line: '실제 게임 화면은 각 작품 페이지에 모여 있다.' },
  { id: 'old', label: 'OLD DESIGNS', ko: '예전 디자인', line: '지금은 쓰지 않지만 지나온 모양들.' },
  { id: 'sound', label: 'SOUND', ko: '사운드', line: '차고와 바깥에서 실제로 흐르는 곡들.' },
]

export interface ArchivePicture {
  readonly kind: 'picture'
  readonly id: string
  readonly category: Exclude<ArchiveCategoryId, 'screenshots' | 'sound'>
  readonly title: string
  readonly note?: string
  /** As on the back of a print: `2026.09.12`. */
  readonly date?: string
  /** Where it came from: a commit, or the work's own file. */
  readonly source?: string
  readonly thumb: string
  readonly full: string
  readonly w: number
  readonly h: number
  /** The work it belongs to, if one: that work's page can show it too. */
  readonly projectId?: string
}

/** A work's gallery, pointed at rather than copied. */
export interface ArchiveGallery {
  readonly kind: 'gallery'
  readonly id: string
  readonly category: 'screenshots'
  readonly title: string
  readonly note: string
  readonly thumb: string
  readonly href: string
  readonly projectId: string
}

export interface ArchiveTrack {
  readonly kind: 'track'
  readonly id: string
  readonly category: 'sound'
  readonly title: string
  readonly note: string
  readonly src: string
  /** Seconds. */
  readonly length: number
}

export type ArchiveEntry = ArchivePicture | ArchiveGallery | ArchiveTrack

const P = '/assets/images/public-archive'
const ART = '/assets/images/artwork'
const own = (name: string): { thumb: string; full: string } => ({ thumb: `${P}/${name}-thumb.webp`, full: `${P}/${name}-full.webp` })

/** The works' key art, at full size. The line under each is the work's own. */
const CONCEPT: readonly ArchivePicture[] = ([
  ['lunai', 'lunai-keyart', '2026.09.14', 'e13b7eb', 1024, 1536],
  ['liminal', 'liminal-keyart', '2026.09.14', 'e13b7eb', 1024, 1536],
  ['wormup', 'wormup-keyart', '2026.10.03', '25d9015', 529, 941],
  ['lumiora', 'lumiora-keyart', '2026.09.24', '36bdf81', 941, 1672],
  ['rubato', 'rubato-opera', '2026.09.14', 'e13b7eb', 1600, 900],
] as const).map(([projectId, file, date, source, w, h]) => {
  const p = PROJECTS.find((x) => x.id === projectId)
  return {
    kind: 'picture' as const, id: `concept-${projectId}`, category: 'concept' as const, projectId,
    title: p?.title ?? projectId, ...(p ? { note: p.taglineKo } : {}), date, source, w, h,
    thumb: `${ART}/${file}-wall.webp`, full: `${ART}/${file}-full.webp`,
  }
})

const CHARACTERS: readonly ArchivePicture[] = ([
  ['momo', 'MOMO', '무언가를 만드는 쪽.', 1448, 1086],
  ['nunu', 'NUNU', '방석이 자기 자리.', 1448, 1086],
  ['ruki', 'RUKI', '고치는 쪽. 컵라면은 쿠션 옆에.', 1536, 1024],
  ['yomi', 'YOMI', '냉장고를 열고, 잠긴 문을 들여다본다.', 1536, 1024],
  ['poko', 'POKO', '텔레비전 앞이 자리.', 1536, 1024],
] as const).map(([id, name, note, w, h]) => ({
  kind: 'picture' as const, id: `crew-${id}`, category: 'characters' as const,
  title: `${name} · 앞 옆 뒤`, note, date: '2026.09.12', source: '8c44174', w, h, ...own(`crew-${id}`),
}))

/** The workbench's own record: test captures and sheets, each with its commit. */
const WIP_SIZE: Readonly<Record<string, readonly [number, number]>> = {
  'wip-comparison': [662, 1340], 'wip-tail': [1100, 520], 'wip-ring': [1335, 1348],
  'wip-states': [1400, 1096], 'wip-glasses': [1400, 228], 'wip-wall': [1400, 1170],
}

/** The card's picture for a workbench sheet (scripts/archive_images.py). */
const wipThumb = (asset: string): string =>
  `${P}/wip-${(asset.split('/').pop() ?? '').replace(/\.webp$/, '').replace(/_/g, '-')}-thumb.webp`

/** Builds still being blocked out: not in any work's gallery. */
const GREYBOX: readonly ArchivePicture[] = ([
  ['liminal', 'case04-3d-landing', '3D 조사 · 그레이박스', 1600, 900],
  ['liminal', 'case04-3d-window', '기억의 층 · 그레이박스', 1600, 900],
  ['lumiora', 'flow-garden', '물살이 되는 셈여림 · 그레이박스', 1280, 720],
  ['lumiora', 'glass-weave', '이어지고 끊기는 다리 · 그레이박스', 1280, 720],
  ['lumiora', 'pitch-cathedral', '선율의 높이 · 그레이박스', 1280, 720],
] as const).map(([projectId, name, title, w, h]) => ({
  kind: 'picture' as const, id: `dev-${projectId}-${name}`, category: 'development' as const, projectId, title,
  note: PROJECTS.find((p) => p.id === projectId)?.title ?? '', date: '2026.09.19', source: '65252f4',
  thumb: workPicture(projectId, name, 'thumb'), full: workPicture(projectId, name, 'full'), w, h,
}))

const DEVELOPMENT: readonly ArchivePicture[] = [
  ...WORKBENCH_ENTRIES.flatMap((e) => {
    const size = WIP_SIZE[e.id]
    return e.asset && size
      ? [{ kind: 'picture' as const, id: e.id, category: 'development' as const, title: e.title, note: e.description,
          date: e.date, source: e.commit, thumb: wipThumb(e.asset), full: e.asset, w: size[0], h: size[1] }]
      : []
  }),
  ...GREYBOX,
]

const OLD: readonly ArchivePicture[] = [
  { id: 'crew-first-3d', title: '처음 만든 3D 크루', note: '지금의 크루 이전, 처음 움직여 본 다섯. 털과 얼굴을 다시 만들었다.', date: '2026.09.09', source: '96665cb', w: 1600, h: 419 },
  { id: 'wormup-runner-keyart', projectId: 'wormup', title: 'WORM UP! · 모바일 러너 키아트', note: 'Steam 내러티브판 이전, 산을 오르던 러너 시절.', date: '2026.10.03', source: '25d9015', w: 900, h: 1600 },
  { id: 'wormup-runner-icon', projectId: 'wormup', title: 'WORM UP! · 러너 앱 아이콘', date: '2026.10.03', source: '25d9015', w: 1024, h: 1024 },
  { id: 'wormup-runner-couple', projectId: 'wormup', title: 'WORM UP! · 러너 이야기 컷 · 시작', date: '2026.10.03', source: '25d9015', w: 893, h: 1600 },
  { id: 'wormup-runner-kidnap', projectId: 'wormup', title: 'WORM UP! · 러너 이야기 컷', date: '2026.10.03', source: '25d9015', w: 893, h: 1600 },
  { id: 'wormup-runner-climb', projectId: 'wormup', title: 'WORM UP! · 러너 이야기 컷 · 산 아래', date: '2026.10.03', source: '25d9015', w: 893, h: 1600 },
  { id: 'wormup-runner-crow', projectId: 'wormup', title: 'WORM UP! · 50번째 스테이지의 까마귀', date: '2026.10.03', source: '25d9015', w: 768, h: 1344 },
  { id: 'mark-symbol-v01', title: 'EUNGARAGE 예전 심볼', note: '차고 문 로고 이전의 별자리 행성.', date: '2026.07.25', source: 'd21112f', w: 420, h: 312 },
  { id: 'mark-saturn', title: 'EUNGARAGE 예전 마크', note: '고리 달린 행성.', date: '2026.07.25', source: 'd21112f', w: 514, h: 295 },
].map((o) => ({ ...o, kind: 'picture' as const, category: 'old' as const, ...own(o.id) }))

/** Each work's gallery, by its first picture and the way to it. */
const SCREENSHOTS: readonly ArchiveGallery[] = PROJECTS.flatMap((p) => {
  const first = p.gallery[0]
  return first
    ? [{
        kind: 'gallery' as const, id: `gallery-${p.id}`, category: 'screenshots' as const, projectId: p.id,
        title: p.title, note: `게임 화면 ${p.gallery.length}장`, thumb: workPicture(p.id, first.name, 'thumb'),
        href: `/works/${p.id}.html#gallery-h`,
      }]
    : []
})

/**
 * The songs the site plays, as they are. The secret storage's own two (its
 * song and the music box) stay in the secret storage.
 */
const M = '/assets/audio/music'
const SOUND: readonly ArchiveTrack[] = [
  { id: 'track-garage', title: '차고', note: '차고 안에서 흐르는 곡. 라디오 GARAGE 88.1.', src: `${M}/garage.m4a`, length: 133 },
  { id: 'track-night', title: 'NIGHT', note: '라디오 NIGHT 91.7.', src: '/assets/audio/ambient.m4a', length: 122 },
  { id: 'track-playground', title: '바깥', note: '차고 문 밖 놀이터.', src: `${M}/playground.m4a`, length: 113 },
  { id: 'track-poko', title: '무궁화', note: 'POKO의 놀이.', src: `${M}/poko.m4a`, length: 115 },
  { id: 'track-snack', title: '간식 가게', note: '간식 가게 놀이.', src: `${M}/snack.m4a`, length: 30 },
  { id: 'track-parcel', title: '택배', note: '택배 정리 놀이.', src: `${M}/parcel.m4a`, length: 114 },
].map((t) => ({ ...t, kind: 'track' as const, category: 'sound' as const }))

export const PUBLIC_ARCHIVE: readonly ArchiveEntry[] = [...CONCEPT, ...CHARACTERS, ...DEVELOPMENT, ...SCREENSHOTS, ...OLD, ...SOUND]

/** The shelves that have something on them, in order. */
export function shelves(entries: readonly ArchiveEntry[] = PUBLIC_ARCHIVE): readonly { category: ArchiveCategory; entries: readonly ArchiveEntry[] }[] {
  return ARCHIVE_CATEGORIES
    .map((category) => ({ category, entries: entries.filter((e) => e.category === category.id) }))
    .filter((s) => s.entries.length > 0)
}

/** A work's development pictures, for its own page ("작업 흔적"). */
export function developmentOf(projectId: string): readonly ArchivePicture[] {
  return PUBLIC_ARCHIVE.filter((e): e is ArchivePicture => e.kind === 'picture' && e.category === 'development' && e.projectId === projectId)
}
