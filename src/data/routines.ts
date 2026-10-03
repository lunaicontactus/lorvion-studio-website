/**
 * What each dokkaebi does with its time, as small jobs with a reason
 * (SITE UPGRADE PHASE E).
 *
 * Before this the room picked one thing at a time — walk somewhere, stand,
 * look about, wave at nobody — and picked again, which reads as five sprites
 * showing their animations. A routine is a short chain of those same things
 * that makes sense in order and comes back to where it started: work at the
 * PC, stop, look over at the bench, go and work at the bench, back to the PC.
 * Once a routine starts it runs to the end; a touch, a hello or the visitor
 * opening something only borrows the dokkaebi for a moment.
 *
 * Only what the frames support. There is no sleep, carry, eat, drink or clean
 * frame for anybody (src/data/sprites.ts), so nobody naps, carries a box or
 * drinks here: going to the fridge is standing at its open door, which is
 * what the frames can show. Who does what follows the crew canon
 * (docs/CREW_REBOOT.md): MOMO makes things, RUKI repairs and keeps a cup of
 * noodles by the cushions, YOMI opens the fridge and peers at the locked
 * door, POKO's place is in front of the television, NUNU's is a cushion.
 *
 * Places are named by the navigation graph's own ids (src/data/navigation.ts).
 * A step may list several; the first one that exists in this room and is free
 * is used, so the same routine works in the smaller phone room or is skipped
 * there when it cannot.
 */

/** A thing in the room to face, or the nearest of the crew at work. */
export type LookTarget = 'pc' | 'workbench' | 'fridge' | 'tv' | 'shelf' | 'cabinet' | 'radio' | 'outside-door' | 'crew'

export type RoutineStep =
  /** Walk to a standing place and do what that place is for (work, use, watch). */
  | { readonly go: readonly string[] }
  /** Walk to a seat and sit. */
  | { readonly sit: readonly string[] }
  /** Stop for a beat where it is: standing up, deciding. */
  | { readonly pause: readonly [number, number] }
  /** Look round for something (the front-facing look cycle). */
  | { readonly search: true }
  /** Stand and face a thing, or whoever of the crew is working. */
  | { readonly face: LookTarget }
  /** Back to the place the routine started from. */
  | { readonly back: true }

export interface Routine {
  readonly id: string
  /** Relative pull among this character's routines. */
  readonly weight: number
  /** What the visitor would say it is doing. For the report and the tests. */
  readonly reads: string
  readonly steps: readonly RoutineStep[]
}

const BEAT: readonly [number, number] = [900, 2200]

const ROUTINES: Readonly<Record<string, readonly Routine[]>> = {
  // The maker. Does not drop what she is doing for long.
  momo: [
    { id: 'pc-to-bench', weight: 4, reads: 'PC에서 작업 → 멈춤 → 작업대를 봄 → 작업대에서 작업 → PC로 돌아옴',
      steps: [{ go: ['pc-front'] }, { pause: BEAT }, { face: 'workbench' }, { go: ['workbench-b', 'workbench-a'] }, { back: true }] },
    { id: 'fetch-from-shelf', weight: 2, reads: '작업 → 선반에 가서 찾음 → 두리번 → 작업 자리로',
      steps: [{ go: ['pc-front', 'workbench-b'] }, { go: ['shelf-front', 'radio-side'] }, { search: true }, { back: true }] },
    { id: 'fridge-break', weight: 1, reads: '작업 → 냉장고 → 작업 자리로',
      steps: [{ go: ['workbench-b', 'pc-front'] }, { pause: BEAT }, { go: ['fridge-front'] }, { back: true }] },
  ],
  // Repairs things. Quiet. A cup of noodles by the cushions.
  ruki: [
    { id: 'repair', weight: 4, reads: '작업대 수리 → 떨어진 부품 확인 → 다시 수리',
      steps: [{ go: ['workbench-a', 'workbench-b'] }, { search: true }, { pause: BEAT }, { go: ['workbench-a', 'workbench-b'] }] },
    { id: 'noodle-break', weight: 2, reads: '작업 → 컵라면 있는 쿠션에 앉음 → 작업대로',
      steps: [{ go: ['workbench-a', 'workbench-b'] }, { pause: BEAT }, { sit: ['cushions', 'by-the-bench', 'floor'] }, { back: true }] },
    { id: 'radio-check', weight: 1, reads: '작업 → 라디오 상태 봄 → 작업대로',
      steps: [{ go: ['workbench-a', 'pc-front'] }, { go: ['radio-side'] }, { back: true }] },
  ],
  // Opens the fridge, peers at the locked door. Touches first, thinks later.
  yomi: [
    { id: 'fridge-and-door', weight: 4, reads: '냉장고 → 잠긴 문을 봄 → 문 앞에서 두리번 → 냉장고로',
      steps: [{ go: ['fridge-front'] }, { face: 'outside-door' }, { go: ['secret-front'] }, { search: true }, { go: ['fridge-front', 'mid-floor'] }] },
    { id: 'shelf-round', weight: 2, reads: '선반 구경 → 두리번 → 서랍 → 냉장고',
      steps: [{ go: ['shelf-front', 'radio-side'] }, { search: true }, { go: ['cabinet-front', 'pc-front'] }, { go: ['fridge-front', 'mid-floor'] }] },
  ],
  // The television is POKO's place. Watches the room before acting.
  poko: [
    { id: 'watch-and-check', weight: 4, reads: 'TV 보기 → 일하는 크루 쪽을 봄 → 다시 TV',
      steps: [{ go: ['tv-left', 'tv-right'] }, { face: 'crew' }, { go: ['tv-left', 'tv-right'] }] },
    { id: 'look-in-on-bench', weight: 2, reads: 'TV → 작업대 쪽으로 가서 봄 → TV로',
      steps: [{ go: ['tv-right', 'tv-left'] }, { go: ['right-floor', 'mid-floor'] }, { face: 'workbench' }, { back: true }] },
    { id: 'sit-by-tv', weight: 2, reads: 'TV 옆 바닥에 앉음 → TV를 봄 → TV 앞으로',
      steps: [{ sit: ['right-boards'] }, { face: 'tv' }, { go: ['tv-left', 'tv-right'] }] },
  ],
  // The cushion is NUNU's. In no hurry.
  nunu: [
    { id: 'cushion-and-fridge', weight: 3, reads: '쿠션에 앉아 있다 → 일어나 냉장고 → 쿠션으로',
      steps: [{ sit: ['big-cushion', 'left-cushion'] }, { pause: [1800, 3200] }, { go: ['fridge-front', 'radio-side'] }, { back: true }] },
    { id: 'rug-watch', weight: 2, reads: '러그에 앉음 → 일하는 크루를 봄 → 계속 앉아 있음',
      steps: [{ sit: ['rug', 'floor'] }, { face: 'crew' }, { sit: ['rug', 'floor'] }] },
    { id: 'radio-listen', weight: 1, reads: '쿠션 → 라디오 옆에서 들음 → 쿠션으로',
      steps: [{ sit: ['big-cushion', 'left-cushion'] }, { go: ['radio-side'] }, { back: true }] },
  ],
}

export function routinesFor(characterId: string): readonly Routine[] {
  return ROUTINES[characterId] ?? []
}

/** Every routine, for the tests and the report. */
export function allRoutines(): Readonly<Record<string, readonly Routine[]>> {
  return ROUTINES
}
