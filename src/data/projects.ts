/**
 * The four worlds.
 *
 * RUBATO has no key art yet, so `keyArt` is null and the hub shows an empty
 * frame marked COMING SOON. That is deliberate: a placeholder image would ship
 * art nobody approved, and removing the entry would hide a real project.
 *
 * `genre` describes each project in the plainest words its own build supports:
 * a diary that turns entries into music, an investigation told in documents, a
 * climbing runner, a visual novel. No release dates and no progress figures
 * are modelled here, because there are none to state.
 */
import type { ProjectConfig } from '@/types/project'

export const PROJECTS: readonly ProjectConfig[] = [
  {
    id: 'lunai',
    title: 'LUNAI',
    tagline: 'Feelings, turned into music.',
    taglineKo: '감정을 음악으로, 이야기를 노래로.',
    genre: 'Emotion diary',
    platforms: ['Mobile'],
    status: 'inDevelopment',
    keyArt: '/assets/images/lunai-keyart.webp',
    accent: '#8c7cff',
    links: [
      { label: 'SUPPORT', href: './support.html' },
      { label: 'PRIVACY', href: './privacy.html' },
    ],
    world: 'lunai',
  },
  {
    id: 'liminal',
    title: 'LIMINAL',
    tagline: 'A quiet office where the paperwork is wrong.',
    taglineKo: '조용한 사무실, 어딘가 어긋난 기록.',
    genre: 'Narrative mystery',
    platforms: ['PC'],
    status: 'inDevelopment',
    keyArt: '/assets/images/liminal-keyart.webp',
    accent: '#c4a36e',
    links: [],
    world: 'liminal',
  },
  {
    id: 'wormup',
    title: 'WORM UP!',
    tagline: 'Climb. Fall. Climb again.',
    taglineKo: '오르고, 떨어지고, 다시 오른다.',
    genre: 'Climbing runner',
    platforms: ['Mobile'],
    status: 'inDevelopment',
    keyArt: '/assets/images/worm-up-keyart.webp',
    accent: '#dc665f',
    links: [],
    world: 'wormup',
  },
  {
    id: 'rubato',
    title: 'RUBATO',
    tagline: 'Vienna, 1791.',
    taglineKo: '1791년, 빈.',
    genre: 'Visual novel',
    platforms: ['PC'],
    status: 'comingSoon',
    keyArt: null,
    accent: '#b49a69',
    links: [],
    world: 'rubato',
  },
] as const

export function getProject(id: string): ProjectConfig | undefined {
  return PROJECTS.find((p) => p.id === id)
}

/** Projects that can actually be shown with art today. */
export const VISIBLE_PROJECTS = PROJECTS.filter((p) => p.keyArt !== null)
