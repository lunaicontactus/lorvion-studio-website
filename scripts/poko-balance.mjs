// What the game is actually like to play, before anybody draws it.
//
//   npx tsx scripts/poko-balance.mjs      (or: node --experimental-strip-types)
//
// Four players, a thousand rounds each, and the numbers that say whether
// there is a decision in this game:
//
//   honest    never slacks. Survives everything, earns almost nothing.
//   cautious  slacks while the boss is away, lets go the moment it warns.
//   greedy    slacks through the warning and lets go halfway through it.
//   reckless  never lets go at all.
//
// If honest and cautious score the same, the game has no reward. If cautious
// is ever caught, the game is unfair. If greedy is not caught sometimes, the
// risk is not real.
import { PokoRound, starsFor, STARS } from '../src/games/poko/round.ts'

const SECONDS = 45
const DT = 16

/** A little deterministic noise, so a thousand rounds are a thousand rounds. */
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** How each of them decides, given what they can see. */
const through = (r) => r.boss.look.through
const PLAYERS = {
  // Never slacks. Safe, and earns almost nothing: the game must not reward
  // this, or there is no game.
  honest: () => false,
  // Only while the boss is right out of the picture. The obvious window.
  cautious: (r) => r.bossState === 'AWAY',
  // Uses the whole quiet stretch and lets go when the warning starts. The
  // way somebody plays this after one round.
  normal: (r) => r.bossState === 'AWAY' || r.bossState === 'PATROLLING',
  // Pushes halfway into the warning. Should be safe: a warning that punished
  // this would be punishing somebody who reacted.
  greedy: (r) => {
    const s = r.bossState
    if (s === 'WATCHING' || s === 'RECOVER') return false
    if (s === 'WARNING') return through(r) < 0.5
    return true
  },
  // Holds until the warning is nearly over. There is less left of it than a
  // hand takes, so this is where the risk is supposed to become real.
  bold: (r) => {
    const s = r.bossState
    if (s === 'WATCHING' || s === 'RECOVER') return false
    if (s === 'WARNING') return through(r) < 0.92
    return true
  },
  // Never lets go. Caught every time, and that is correct.
  reckless: () => true,
}

/** A human hand is not instant. Everybody reacts this long after deciding. */
const LAG = 180

function play(decide, seed) {
  const r = new PokoRound({ random: seeded(seed), seconds: SECONDS })
  const queue = []
  for (let t = 0; t < SECONDS * 1000; t += DT) {
    queue.push({ at: t + LAG, want: decide(r) })
    while (queue.length && queue[0].at <= t) r.setSlacking(queue.shift().want)
    r.step(DT)
    if (r.verdict !== 'PLAYING') break
  }
  r.clear()
  return r
}

const N = 1000
console.log(`${N} rounds each, ${SECONDS}s, ${DT}ms frames, ${LAG}ms of hand\n`)
console.log('player     caught   mean   p10    p50    p90    max   stars(mean)')
for (const [name, decide] of Object.entries(PLAYERS)) {
  const scores = []
  let caught = 0
  for (let i = 0; i < N; i++) {
    const r = play(decide, 1000 + i)
    if (r.verdict === 'CAUGHT') caught += 1
    scores.push(r.score)
  }
  scores.sort((a, b) => a - b)
  const at = (p) => scores[Math.min(scores.length - 1, Math.floor(scores.length * p))]
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const stars = scores.reduce((a, s) => a + starsFor(s), 0) / scores.length
  console.log(
    `${name.padEnd(10)} ${String(Math.round(100 * caught / N)).padStart(4)}%  `
    + `${mean.toFixed(0).padStart(5)}  ${String(at(0.1)).padStart(5)}  ${String(at(0.5)).padStart(5)}  `
    + `${String(at(0.9)).padStart(5)}  ${String(at(1)).padStart(5)}   ${stars.toFixed(2)}`)
}

// And the shape of a round, which is what the player has to read.
const probe = new PokoRound({ random: seeded(7), seconds: SECONDS })
const spans = []
let last = probe.bossState
let since = 0
for (let t = 0; t < SECONDS * 1000; t += DT) {
  probe.step(DT)
  since += DT
  if (probe.bossState !== last) {
    spans.push([last, since])
    last = probe.bossState
    since = 0
  }
}
const warns = spans.filter(([s]) => s === 'WARNING').map(([, ms]) => ms)
const aways = spans.filter(([s]) => s === 'AWAY' || s === 'PATROLLING').map(([, ms]) => ms)
const watches = spans.filter(([s]) => s === 'WATCHING').map(([, ms]) => ms)
console.log(`\none round (seed 7): ${spans.length} states`)
console.log(`  looks            ${watches.length}`)
console.log(`  warning  min ${Math.min(...warns)}ms  mean ${Math.round(warns.reduce((a, b) => a + b, 0) / warns.length)}ms`)
console.log(`  quiet    min ${Math.min(...aways)}ms  mean ${Math.round(aways.reduce((a, b) => a + b, 0) / aways.length)}ms  total ${aways.reduce((a, b) => a + b, 0)}ms`)
console.log(`  watching mean ${Math.round(watches.reduce((a, b) => a + b, 0) / watches.length)}ms`)
console.log(`\nstars at ${STARS.join(' / ')}`)
