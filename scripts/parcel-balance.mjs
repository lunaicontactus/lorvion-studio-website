// What the sorting game is like to play.
//
//   npx tsx scripts/parcel-balance.mjs
//
// The thing being measured is whether the difficulty ramp — three piles at the
// start, five by the end — actually makes the second half harder without
// making it unfair, and whether accuracy is worth more than speed.
import { ParcelRound, starsFor, STARS, WRONG_MS } from '../src/games/parcel/round.ts'

const SECONDS = 30
const DT = 16

function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const PLAYERS = {
  'quick, sure':   { ms: 650,  wrong: 0.02 },
  'steady':        { ms: 1000, wrong: 0.06 },
  'slow, careful': { ms: 1700, wrong: 0.03 },
  'fast, sloppy':  { ms: 500,  wrong: 0.3 },
}

function play({ ms, wrong }, seed) {
  const rng = seeded(seed)
  const round = new ParcelRound({ random: seeded(seed * 7 + 1) })
  let left = SECONDS * 1000
  let next = ms
  let earlyRight = 0, earlyTotal = 0, lateRight = 0, lateTotal = 0
  while (left > 0 && !round.done) {
    left -= DT
    next -= DT
    round.setProgress(1 - left / (SECONDS * 1000))
    if (next <= 0) {
      const p = round.parcel
      const late = left < SECONDS * 500
      const pick = rng() < wrong
        ? p.piles.find((q) => q.id !== p.project.id).id
        : p.project.id
      const right = round.sort(pick)
      if (late) { lateTotal += 1; if (right) lateRight += 1 }
      else { earlyTotal += 1; if (right) earlyRight += 1 }
      if (!right) left -= WRONG_MS
      next = ms
    }
  }
  round.finish()
  return { round, earlyRight, earlyTotal, lateRight, lateTotal }
}

const N = 1000
console.log(`${N} rounds each, ${SECONDS}s, ${WRONG_MS}ms per mistake\n`)
console.log('player          sorted  wrong   mean   p10    p90   stars   piles(early→late)')
for (const [name, how] of Object.entries(PLAYERS)) {
  const scores = []
  let sorted = 0, wrong = 0
  for (let i = 0; i < N; i++) {
    const r = play(how, 200 + i)
    scores.push(r.round.score)
    sorted += r.round.sorted
    wrong += r.round.wrong
  }
  scores.sort((a, b) => a - b)
  const at = (p) => scores[Math.min(scores.length - 1, Math.floor(scores.length * p))]
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const stars = scores.reduce((a, s) => a + starsFor(s), 0) / scores.length
  console.log(
    `${name.padEnd(15)} ${(sorted / N).toFixed(1).padStart(5)}  ${(wrong / N).toFixed(1).padStart(5)}  `
    + `${mean.toFixed(0).padStart(5)}  ${String(at(0.1)).padStart(5)}  ${String(at(0.9)).padStart(5)}   ${stars.toFixed(2)}`)
}

// The ramp itself: how many piles are out at each point in the round.
const probe = new ParcelRound({ random: seeded(3) })
const counts = []
for (const t of [0, 0.25, 0.5, 0.75, 1]) {
  probe.setProgress(t)
  probe.sort(probe.parcel.project.id)
  counts.push(`${Math.round(t * 100)}%:${probe.parcel.piles.length}`)
}
console.log(`\npiles out across a round — ${counts.join('  ')}`)
console.log(`stars at ${STARS.join(' / ')}`)
