/**
 * EUNGARAGE BROADCAST — the TV.
 *
 * SITE UPGRADE PHASE D: the first five channels are the five works, each a
 * few of its own pictures from its page (nothing made for the TV: no trailer
 * exists, so none is pretended), its state, and the way to its page. Then the
 * garage's own channels: news, a camera on another corner, the contact card
 * (from SITE_CONFIG, the one place contact details live), and no signal.
 *
 * A programme is data. Each frame says what kind of thing it is; today every
 * frame is an `image`, and when a work has a video the frame becomes a
 * `video` with its file — the set plays either (src/ui/panels.ts).
 */
import type { DiscoveryEntry } from '@/systems/discovery'
import { PROJECTS, workPicture } from '@/data/projects'
import { artworkFor, wallSrc } from '@/data/artwork'

export type ChannelId = `work-${string}` | 'news' | 'cam' | 'contact' | 'nosignal'

export interface TvFrame {
  readonly kind: 'image' | 'video'
  readonly src: string
  /** For `video`: the still shown before it plays, and while motion is reduced. */
  readonly poster?: string
  readonly caption: string
}

export interface WorkProgramme {
  readonly work: string
  /** One to three, in order. */
  readonly frames: readonly TvFrame[]
}

const shot = (work: string, name: string): TvFrame => {
  const caption = PROJECTS.find((p) => p.id === work)?.gallery.find((g) => g.name === name)?.caption ?? ''
  return { kind: 'image', src: workPicture(work, name, 'thumb'), caption }
}
const keyart = (work: string): TvFrame => {
  const piece = artworkFor(work)
  return { kind: 'image', src: piece ? wallSrc(piece) : '', caption: '키 아트' }
}

/** What each work's channel shows: pictures already on its page, nothing else. */
export const WORK_PROGRAMMES: readonly WorkProgramme[] = [
  { work: 'lunai', frames: [shot('lunai', 'room-dal-tokki'), shot('lunai', 'album'), shot('lunai', 'room-winter')] },
  { work: 'liminal', frames: [shot('liminal', 'bureau'), shot('liminal', 'crossroads'), shot('liminal', 'approach')] },
  { work: 'wormup', frames: [shot('wormup', 'c01-why-worm'), shot('wormup', 'c05c-music-room'), shot('wormup', 'c14-same-road')] },
  // LUMIORA has one picture of its own on its page so far, and its key art.
  { work: 'lumiora', frames: [shot('lumiora', 'aquarium-concept'), keyart('lumiora')] },
  { work: 'rubato', frames: [shot('rubato', 'opera'), shot('rubato', 'cafe-scene'), shot('rubato', 'street')] },
]

const pad = (n: number): string => `CH${String(n).padStart(2, '0')}`

export const CHANNELS: readonly { readonly id: ChannelId; readonly number: string; readonly name: string }[] = [
  ...WORK_PROGRAMMES.map((w, i) => ({
    id: `work-${w.work}` as ChannelId,
    number: pad(i + 1),
    name: PROJECTS.find((p) => p.id === w.work)?.title ?? w.work,
  })),
  { id: 'news', number: pad(WORK_PROGRAMMES.length + 1), name: 'GARAGE NEWS' },
  { id: 'cam', number: pad(WORK_PROGRAMMES.length + 2), name: 'DOKKA CAM' },
  { id: 'contact', number: pad(WORK_PROGRAMMES.length + 3), name: 'CONTACT' },
  { id: 'nosignal', number: 'CH00', name: 'NO SIGNAL' },
]

/** The programme on a work's channel, if this is one. */
export function programmeOf(id: ChannelId): WorkProgramme | null {
  return id.startsWith('work-') ? WORK_PROGRAMMES.find((w) => `work-${w.work}` === id) ?? null : null
}

type Item = Omit<DiscoveryEntry, 'category' | 'cooldown' | 'oncePerSession' | 'asset'>

/** Headlines. The ones about the wall and the glasses are what actually happened this week. */
const NEWS: readonly Item[] = [
  { id: 'news-wall', title: '속보', description: '벽에 걸린 그림들, 종이를 벗다. RUBATO는 TV 위 액자로 이사.', weight: 3, rarity: 'common' },
  { id: 'news-glasses', title: '인물', description: "POKO 부장님 새 안경 착용. 본인은 '원래 이거였다'는 입장.", weight: 3, rarity: 'common' },
  { id: 'news-eggs', title: '사회', description: '차고 냉장고 계란 또 줄어… 용의자 다섯.', weight: 2, rarity: 'common' },
  { id: 'news-shutter', title: '생활', description: 'MOMO, 셔터 첫 개방 기념일 자축. 참석자 MOMO.', weight: 2, rarity: 'common' },
  { id: 'news-weather', title: '날씨', description: '오늘 밤 차고 안은 맑고, 곳에 따라 컵라면 냄새.', weight: 2, rarity: 'common' },
  { id: 'news-wrench', title: '분실', description: 'RUKI 렌치 실종 신고. 렌치는 RUKI 손에 들려 있었다.', weight: 2, rarity: 'common' },
  { id: 'news-fire', title: '제보', description: '차고 밖에서 도깨비불을 봤다는 제보가 들어오고 있습니다.', weight: 1, rarity: 'rare' },
]

export const TV_ENTRIES: readonly DiscoveryEntry[] = NEWS.map((n) => ({
  ...n, category: 'tv', asset: null, cooldown: 0, oncePerSession: false,
}))

/**
 * DOKKA CAM angles: rectangles on the room plate, per orientation, framed like
 * a corner camera. The picture is the real room; nothing is drawn for it.
 */
export const CAM_ANGLES: Readonly<Record<'landscape' | 'portrait', readonly { readonly label: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }[]>> = {
  landscape: [
    { label: 'CAM 1 · 선반', x: 40, y: 120, w: 560, h: 360 },
    { label: 'CAM 2 · 작업대', x: 1980, y: 180, w: 560, h: 360 },
    { label: 'CAM 3 · 냉장고', x: 2260, y: 420, w: 560, h: 360 },
    { label: 'CAM 4 · 문 앞', x: 3000, y: 560, w: 560, h: 360 },
  ],
  portrait: [
    { label: 'CAM 1 · 선반', x: 0, y: 60, w: 520, h: 330 },
    { label: 'CAM 2 · 작업대', x: 560, y: 1080, w: 520, h: 330 },
    { label: 'CAM 3 · 냉장고', x: 150, y: 2020, w: 520, h: 330 },
    { label: 'CAM 4 · 문 앞', x: 580, y: 2080, w: 520, h: 330 },
  ],
}
