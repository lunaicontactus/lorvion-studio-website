/**
 * The five worlds.
 *
 * Every one of them now has a real picture behind it — a key visual or, for
 * RUBATO, one of the game's own backgrounds — so nothing here is a frame
 * marked COMING SOON any more. `keyArt` is not typed out: it is read from
 * src/data/artwork.ts, which is where the sizes of the real files live, so the
 * picture a poster hangs and the picture the PC shows cannot drift apart.
 *
 * RUBATO is still `comingSoon` and says so in its facts. Having a picture of
 * the game and having a release are different things, and only one of them is
 * true.
 *
 * `genre` describes each project in the plainest words its own build supports:
 * a diary that turns entries into music, an investigation told in documents, a
 * climbing runner, a music storybook for children, a visual novel. No release
 * dates and no progress figures are modelled here, because there are none to
 * state.
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
    tagline: 'Feelings, turned into music.',
    taglineKo: '감정을 음악으로, 이야기를 노래로.',
    genre: 'Emotion diary',
    platforms: ['Mobile'],
    status: 'inDevelopment',
    keyArt: art('lunai'),
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
    keyArt: art('liminal'),
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
    keyArt: art('wormup'),
    accent: '#dc665f',
    links: [],
    world: 'wormup',
  },
  {
    id: 'lumiora',
    title: 'LUMIORA',
    tagline: 'Listen, notice, and tell it back in your own sound.',
    taglineKo: '듣고, 발견하고, 나만의 소리로 이야기하다.',
    genre: 'Music storybook',
    platforms: ['Mobile'],
    status: 'inDevelopment',
    keyArt: art('lumiora'),
    accent: '#6fb6a8',
    links: [],
    world: 'lumiora',
  },
  {
    id: 'rubato',
    title: 'RUBATO',
    tagline: 'Vienna, 1791.',
    taglineKo: '1791년, 빈.',
    genre: 'Visual novel',
    platforms: ['PC'],
    status: 'comingSoon',
    keyArt: art('rubato'),
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
