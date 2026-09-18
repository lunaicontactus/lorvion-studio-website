// What the errand game is like to play, before anybody draws it.
//
//   npx tsx scripts/snack-balance.mjs
//
// Four players, a thousand rounds each. A round is thirty seconds and the
// only thing that varies is how fast somebody reads and how often they get it
// wrong, so what this is really measuring is whether the wrong-answer penalty
// is a cost or a punishment.
import { SnackRound, starsFor, STARS, WRONG_MS } from '../src/games/snack/round.ts'

const SECONDS = 30
const DT = 16

function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// How long somebody takes to read the order, find the thing and press it, and
// how often they press the wrong one.
const PLAYERS = {
  'quick, sure':   { ms: 700,  wrong: 0.02 },
  'steady':        { ms: 1100, wrong: 0.06 },
  'slow, careful': { ms: 1800, wrong: 0.04 },
  'fast, sloppy':  { ms: 550,  wrong: 0.28 },
}

function play({ ms, wrong }, seed) {
  const rng = seeded(seed)
  const round = new SnackRound({ random: seeded(seed * 7 + 1) })
  let left = SECONDS * 1000
  let next = ms
  while (left > 0 && !round.done) {
    left -= DT
    next -= DT
    if (next <= 0) {
      const order = round.order
      const pick = rng() < wrong
        ? order.choices.find((c) => c.id !== order.wants.id).id
        : order.wants.id
      const right = round.give(pick)
      if (!right) left -= WRONG_MS
      next = ms
    }
  }
  round.finish()
  return round
}

const N = 1000
console.log(`${N} rounds each, ${SECONDS}s, ${WRONG_MS}ms per mistake\n`)
console.log('player          filled  wrong   mean   p10    p90   stars(mean)')
for (const [name, how] of Object.entries(PLAYERS)) {
  const scores = []
  let filled = 0
  let wrong = 0
  for (let i = 0; i < N; i++) {
    const r = play(how, 100 + i)
    scores.push(r.score)
    filled += r.filled
    wrong += r.wrong
  }
  scores.sort((a, b) => a - b)
  const at = (p) => scores[Math.min(scores.length - 1, Math.floor(scores.length * p))]
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const stars = scores.reduce((a, s) => a + starsFor(s), 0) / scores.length
  console.log(
    `${name.padEnd(15)} ${(filled / N).toFixed(1).padStart(5)}  ${(wrong / N).toFixed(1).padStart(5)}  `
    + `${mean.toFixed(0).padStart(5)}  ${String(at(0.1)).padStart(5)}  ${String(at(0.9)).padStart(5)}   ${stars.toFixed(2)}`)
}
console.log(`\nstars at ${STARS.join(' / ')}`)
