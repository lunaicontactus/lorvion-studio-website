/**
 * LIMINAL's case file, in the garage's records drawer (SITE UPGRADE PHASE D).
 *
 * A teaser, not the world: one case, set up in a line, and the way to the
 * work's page. The case is LIMINAL's own (season 1, 「두 개의 이름표」); the
 * line is how the game's own cast sheet opens it
 * (~/Desktop/리미널_게임기획/game/src/data/characters.ts, the guest's role),
 * and says nothing of how it ends. No case number: the game's two scripts
 * number their cases differently. The picture is the bureau from the work's
 * page. The secret door stays the secret storage's (DECISIONS #4).
 */
import { workPicture, workHref } from '@/data/projects'

export interface CaseFile {
  readonly work: string
  readonly office: string
  readonly title: string
  readonly line: string
  readonly picture: string
  readonly caption: string
  readonly href: string
}

export const LIMINAL_CASE_FILE: CaseFile = {
  work: 'liminal',
  office: '경계관리국 · 사건 기록',
  title: '두 개의 이름표',
  line: '공영 장례가 끝났다고 기록됐다. 그런데 유골함에는 다른 이름표가 붙어 있다.',
  picture: workPicture('liminal', 'bureau', 'thumb'),
  caption: '경계관리국 앞',
  href: workHref('liminal'),
}
