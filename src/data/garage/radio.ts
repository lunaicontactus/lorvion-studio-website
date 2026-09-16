/**
 * NIGHT RADIO — the garage's audio hub.
 *
 * Four stations, each tuned to something that really exists:
 *   88.1 GARAGE     the garage's own music (the user's Garage track)
 *   91.7 NIGHT      the room at night (the existing room tone)
 *   96.4 DOKKA NEWS headlines, read off the dial, over a quiet static bed
 *   103.2 STATIC    static
 * No station plays anything that was not delivered. The mute switch on the
 * radio is the site's mute switch.
 */
import type { DiscoveryEntry } from '@/systems/discovery'

export type StationId = 'garage' | 'night' | 'news' | 'static'

export interface Station {
  readonly id: StationId
  readonly freq: string
  readonly name: string
  /** A looping track, or null for a talk station. */
  readonly track: string | null
  readonly volume: number
}

export const STATIONS: readonly Station[] = [
  { id: 'garage', freq: '88.1', name: 'GARAGE', track: '/assets/audio/music/garage.m4a', volume: 0.34 },
  { id: 'night', freq: '91.7', name: 'NIGHT', track: '/assets/audio/ambient.m4a', volume: 0.38 },
  { id: 'news', freq: '96.4', name: 'DOKKA NEWS', track: '/assets/audio/sfx/radio_static.m4a', volume: 0.08 },
  { id: 'static', freq: '103.2', name: 'STATIC', track: '/assets/audio/sfx/radio_static.m4a', volume: 0.2 },
]

type Item = Omit<DiscoveryEntry, 'category' | 'cooldown' | 'oncePerSession' | 'asset'>

const SEGMENTS: readonly Item[] = [
  { id: 'radio-letter', title: '사연', description: "RUKI 님이 보낸 사연입니다. '제 렌치를 찾습니다. 지금 손에 들고 있습니다.'", weight: 3, rarity: 'common' },
  { id: 'radio-request', title: '신청곡', description: '오늘 신청곡은 없습니다. 다들 자고 있습니다.', weight: 2, rarity: 'common' },
  { id: 'radio-traffic', title: '교통', description: '골목 셔터 앞, 택배 상자로 약간의 정체가 있습니다.', weight: 2, rarity: 'common' },
  { id: 'radio-weather', title: '날씨', description: '창밖은 맑음. 달이 밝아서 NUNU가 커튼을 쳤습니다.', weight: 2, rarity: 'common' },
  { id: 'radio-ad', title: '광고', description: '안경닦이 열두 장 한 세트. POKO 부장님도 쓰는 그 제품.', weight: 2, rarity: 'common' },
  { id: 'radio-outside', title: '속보', description: '차고 밖 오솔길에서 작은 불빛이 움직였다는 소식입니다.', weight: 1, rarity: 'rare' },
]

export const RADIO_ENTRIES: readonly DiscoveryEntry[] = SEGMENTS.map((n) => ({
  ...n, category: 'radio', asset: null, cooldown: 0, oncePerSession: false,
}))
