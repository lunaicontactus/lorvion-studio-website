/**
 * The ARCADE page's list (EUNGARAGE 2.0, PART 14), as plain data so the page
 * does not have to load the games to describe them. test/arcade.test.ts keeps
 * it in step with the real registry (src/games/registry.ts): same ids, same
 * titles, same hints.
 *
 * `play` opens the game straight from the menu: into the garage without the
 * door (#garage), out to the playground, and the game opens.
 */
export interface ArcadeEntry {
  readonly id: string
  readonly title: string
  readonly hint: string
  readonly who: string
  readonly where: 'arcade' | 'playground'
  readonly seconds: number
  /** Counts towards the three stars that open the secret door. */
  readonly secret: boolean
}

export const ARCADE: readonly ArcadeEntry[] = [
  { id: 'starfall', title: '별똥별 받기', who: 'momo', where: 'arcade', seconds: 60, secret: false,
    hint: '하늘에서 별이 떨어져요! 모모를 움직여 받아요. 분홍 소원별은 50점.' },
  { id: 'bugs', title: '김로드의 버그 잡기', who: 'nunu', where: 'arcade', seconds: 45, secret: false,
    hint: '화면에 나타난 버그를 눌러 잡아요. 초록 정상 코드와 노란 빌드 배지는 누르면 안 돼요!' },
  { id: 'mugunghwa', title: '요미의 과자 몰래 먹기', who: 'yomi', where: 'playground', seconds: 45, secret: true,
    hint: '누르고 있으면 요미가 몰래 과자를 먹어요. 포코가 고개를 들면(?) 바로 손을 떼세요!' },
  { id: 'snack', title: '크루 야식 심부름', who: 'ruki', where: 'playground', seconds: 30, secret: true,
    hint: '말풍선 속 야식을 골라 건네주세요. 틀리면 시간이 깎여요.' },
  { id: 'parcel', title: '모모의 택배 배달', who: 'momo', where: 'playground', seconds: 60, secret: true,
    hint: '모모가 택배를 들고 불 켜진 문까지! 도깨비불 유령에 닿으면 택배를 놓쳐요.' },
]

export const playHref = (id: string): string => `/?play=${encodeURIComponent(id)}#garage`
