/**
 * What each of the crew does with its time, as small jobs with a reason
 * (SITE UPGRADE PHASE E).
 *
 * Before this the room picked one thing at a time — walk somewhere, stand,
 * look about, wave at nobody — and picked again, which reads as five sprites
 * showing their animations. A routine is a short chain of those same things
 * that makes sense in order and comes back to where it started: work at the
 * PC, stop, look over at the bench, go and work at the bench, back to the PC.
 * Once a routine starts it runs to the end; a touch, a hello or the visitor
 * opening something only borrows them for a moment.
 *
 * Only what the frames support: idle, walk, work, sit, a hop and a look
 * (src/data/sprites.ts). Who does what follows the 2.0 crew sheets: MOMO plans
 * in the middle of the room, NUNU codes at the PC, RUKI researches at the
 * shelf, POKO writes at the story bench, YOMI listens by the radio, and REVEN
 * the cat naps on the cushions.
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
  // MOMO plans in the middle of the room and goes to tell people about it.
  momo: [
    { id: 'plan-and-tell', weight: 4, reads: '라운지에서 생각 → 기획 책상(PC) → 크루를 봄 → 라운지로',
      steps: [{ go: ['mid-floor'] }, { search: true }, { go: ['pc-front', 'workbench-b'] }, { face: 'crew' }, { back: true }] },
    { id: 'idea-to-story', weight: 2, reads: '아이디어 → 스토리 작업대로 가서 보여줌 → 라운지로',
      steps: [{ go: ['mid-floor'] }, { pause: BEAT }, { go: ['workbench-b', 'workbench-a'] }, { pause: BEAT }, { back: true }] },
    { id: 'lounge-think', weight: 2, reads: '쿠션에 앉아 고민 → 라운지로',
      steps: [{ go: ['mid-floor'] }, { sit: ['cushions', 'by-the-bench', 'floor'] }, { pause: BEAT }, { back: true }] },
  ],
  // NUNU codes at the PC, checks the records for a bug, dozes on the cushion.
  nunu: [
    { id: 'code', weight: 5, reads: 'PC 작업 → 멈춤 → 다시 PC 작업',
      steps: [{ go: ['pc-front'] }, { pause: BEAT }, { go: ['pc-front'] }] },
    { id: 'bug-hunt', weight: 2, reads: 'PC → 두리번(버그 찾기) → 기록 서랍 확인 → PC로',
      steps: [{ go: ['pc-front'] }, { search: true }, { go: ['cabinet-front', 'radio-side'] }, { back: true }] },
    { id: 'doze', weight: 1, reads: 'PC → 쿠션에서 졸기 → PC로',
      steps: [{ go: ['pc-front'] }, { sit: ['cushions', 'by-the-bench', 'floor'] }, { back: true }] },
  ],
  // RUKI looks things up at the shelf and checks them against the records.
  ruki: [
    { id: 'research', weight: 4, reads: '책장에서 자료 찾기 → 두리번 → 기록 서랍 → 책장으로',
      steps: [{ go: ['shelf-front', 'radio-side'] }, { search: true }, { go: ['cabinet-front', 'pc-front'] }, { back: true }] },
    { id: 'review', weight: 2, reads: '자료 → PC 쪽을 봄(검토) → 책장으로',
      steps: [{ go: ['cabinet-front', 'radio-side'] }, { face: 'pc' }, { pause: BEAT }, { go: ['shelf-front', 'radio-side'] }] },
    { id: 'read-sitting', weight: 2, reads: '쿠션에 앉아 노트 읽기 → 책장으로',
      steps: [{ go: ['shelf-front', 'radio-side'] }, { sit: ['big-cushion', 'left-cushion', 'floor'] }, { pause: BEAT }, { back: true }] },
  ],
  // POKO writes at the story bench, stares into space, watches TV for ideas.
  poko: [
    { id: 'write', weight: 4, reads: '스토리 작업대에서 쓰기 → 멍하니 생각 → 다시 쓰기',
      steps: [{ go: ['workbench-a', 'workbench-b'] }, { search: true }, { go: ['workbench-a', 'workbench-b'] }] },
    { id: 'tv-for-ideas', weight: 2, reads: '작업대 → TV 보며 생각 → 작업대로',
      steps: [{ go: ['workbench-a', 'workbench-b'] }, { go: ['tv-left', 'tv-right'] }, { face: 'crew' }, { back: true }] },
    { id: 'nap', weight: 1, reads: '작업대 → 바닥에 앉아 낮잠 → 작업대로',
      steps: [{ go: ['workbench-a', 'workbench-b'] }, { sit: ['right-boards', 'rug', 'floor'] }, { pause: [1800, 3200] }, { back: true }] },
  ],
  // YOMI listens at the radio, sways, and writes melodies on the cushion.
  yomi: [
    { id: 'listen', weight: 4, reads: '라디오 옆에서 음악 듣기 → 쿠션에서 흥얼 → 라디오로',
      steps: [{ go: ['radio-side'] }, { pause: BEAT }, { sit: ['big-cushion', 'cushions', 'left-cushion'] }, { back: true }] },
    { id: 'compose', weight: 2, reads: '쿠션에 앉아 작곡 → 라디오를 봄 → 라디오로',
      steps: [{ go: ['radio-side'] }, { sit: ['cushions', 'big-cushion', 'floor'] }, { face: 'radio' }, { back: true }] },
    { id: 'score-the-scene', weight: 1, reads: '라디오 → TV 장면을 봄 → 라디오로',
      steps: [{ go: ['radio-side'] }, { go: ['tv-right', 'tv-left'] }, { back: true }] },
  ],
  // REVEN naps, visits the fridge, and follows whoever is working.
  reven: [
    { id: 'nap', weight: 4, reads: '쿠션에서 낮잠 → 기지개(일어남) → 쿠션으로',
      steps: [{ sit: ['big-cushion', 'left-cushion', 'floor'] }, { pause: [1800, 3600] }, { sit: ['big-cushion', 'cushions', 'left-cushion'] }] },
    { id: 'fridge-visit', weight: 2, reads: '냉장고 앞에서 간식 찾기 → 쿠션으로',
      steps: [{ sit: ['big-cushion', 'left-cushion', 'floor'] }, { go: ['fridge-front'] }, { search: true }, { back: true }] },
    { id: 'follow-crew', weight: 2, reads: '라운지 → 일하는 크루를 봄 → 러그에 앉음',
      steps: [{ go: ['mid-floor', 'right-floor'] }, { face: 'crew' }, { sit: ['rug', 'by-the-bench', 'floor'] }] },
  ],
}

export function routinesFor(characterId: string): readonly Routine[] {
  return ROUTINES[characterId] ?? []
}

/** Every routine, for the tests and the report. */
export function allRoutines(): Readonly<Record<string, readonly Routine[]>> {
  return ROUTINES
}
