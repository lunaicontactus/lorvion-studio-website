/**
 * EUNGARAGE BROADCAST — the TV.
 *
 * Not a second PC. Five channels, each its own thing: news from the garage,
 * a camera on another corner of the room, a teaser of one work (a picture and
 * a name; the details stay on the PC), the contact card (from SITE_CONFIG, the
 * one place contact details live), and no signal.
 */
import type { DiscoveryEntry } from '@/systems/discovery'

export type ChannelId = 'news' | 'cam' | 'teaser' | 'contact' | 'nosignal'

export const CHANNELS: readonly { readonly id: ChannelId; readonly number: string; readonly name: string }[] = [
  { id: 'news', number: 'CH01', name: 'GARAGE NEWS' },
  { id: 'cam', number: 'CH02', name: 'DOKKA CAM' },
  { id: 'teaser', number: 'CH03', name: 'PROJECT TEASER' },
  { id: 'contact', number: 'CH04', name: 'CONTACT' },
  { id: 'nosignal', number: 'CH05', name: 'NO SIGNAL' },
]

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
