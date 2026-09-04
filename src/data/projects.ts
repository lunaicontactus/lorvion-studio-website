/**
 * The four worlds.
 *
 * RUBATO has no key art yet, so `keyArt` is null and the hub shows an empty
 * frame marked COMING SOON. That is deliberate: a placeholder image would ship
 * art nobody approved, and removing the entry would hide a real project.
 */
import type { ProjectConfig } from '@/types/project'

export const PROJECTS: readonly ProjectConfig[] = [
  {
    id: 'lunai',
    title: 'LUNAI',
    tagline: 'Feelings, turned into music.',
    taglineKo: '감정을 음악으로, 이야기를 노래로.',
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
