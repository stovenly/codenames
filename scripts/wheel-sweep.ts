import {spin, type Tune} from '../src/ui/board/wheel.ts'

/**
 * Tunes the wheel by running it. What it is looking for:
 *
 *   - always lands on the answer, never leaves the strip
 *   - stops with a beat to spare inside the budget
 *   - visibly slowing: the last gap several times the first
 *   - pegs far enough apart to read as separate cards
 *   - one clean hesitation, never a ring-down
 *   - and no single favourite ending — sometimes short, sometimes past
 */
const BUDGET = 2.6
const RUNS = 400

const q = (a: number[], f: number) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * f)] ?? Infinity

type Row = {
  tune: Tune
  rest99: number
  minGap: number
  lastGap: number
  ratio: number
  revMin: number
  bounceMax: number
  past: number
  short: number
}
const rows: Row[] = []

for (const friction of [3.5, 4.5, 5.5, 7])
  for (const visc of [0.3, 0.6, 1, 1.4])
    for (const detent of [26, 40, 58])
      for (const creep of [55, 80, 110])
        for (const resting of [3, 4.5])
          for (const spread of [0.05, 0.09, 0.14]) {
            const tune: Tune = {
              friction, visc, detent, creep, resting,
              lateAt: 0.78, lateBrake: 3,
              throwLow: 1 - spread / 2,
              throwHigh: 1 + spread / 2
            }
            const rest: number[] = [], mins: number[] = [], lasts: number[] = [], revs: number[] = [], bounces: number[] = []
            let bad = 0, past = 0, short = 0
            for (let i = 0; i < RUNS; i++) {
              const o = spin(BUDGET, tune)
              if (!o.landed || o.escaped) {
                bad++
                continue
              }
              rest.push(o.restedAt); mins.push(o.minGap); lasts.push(o.lastGap); revs.push(o.reversals); bounces.push(o.bounces)
              if (o.wentPast) past++
              else if (o.creepPegs > 0) short++
            }
            if (bad) continue
            const minGap = q(mins, 0.02)
            const lastGap = q(lasts, 0.5)
            rows.push({
              tune,
              rest99: q(rest, 0.99),
              minGap,
              lastGap,
              ratio: lastGap / minGap,
              revMin: q(revs, 0.05),
              bounceMax: q(bounces, 0.98),
              past: past / RUNS,
              short: short / RUNS
            })
          }

const pass = (r: Row) =>
  r.rest99 < BUDGET * 0.92 && r.minGap >= 0.06 && r.lastGap >= 0.22 && r.ratio >= 2.5 && r.bounceMax <= 1
const varied = (r: Row) => r.past >= 0.2 && r.short >= 0.2

const ok = rows.filter(r => pass(r) && varied(r)).sort((a, b) => b.ratio - a.ratio)
console.log(`viable ${ok.length} of ${rows.length}`)

const best = (label: string, of: (r: Row) => number) => {
  const sorted = rows.slice().sort((a, b) => of(b) - of(a))
  const top = sorted[0]
  console.log(`  best ${label}: ${top ? of(top).toFixed(2) : 'n/a'}`)
}

if (!ok.length) {
  console.log('')
  console.log('reachable across the grid:')
  best('slow-down ratio', r => r.ratio)
  best('last gap', r => r.lastGap)
  best('past-the-answer share', r => r.past)
  best('short-of-the-answer share', r => r.short)

  console.log('')
  console.log('nothing met everything; nearest misses by each measure:')
  const near = rows.filter(pass).sort((a, b) => b.past + b.short - (a.past + a.short))
  console.log(`  meet the motion tests: ${near.length}`)
  for (const r of near.slice(0, 5))
    console.log(
      '   ',
      JSON.stringify({f: r.tune.friction, v: r.tune.visc, d: r.tune.detent, c: r.tune.creep, lo: +r.tune.throwLow.toFixed(2), hi: +r.tune.throwHigh.toFixed(2)}),
      `gap ${(r.minGap * 1000).toFixed(0)}→${(r.lastGap * 1000).toFixed(0)}ms x${r.ratio.toFixed(1)}`,
      `past ${(r.past * 100).toFixed(0)}% short ${(r.short * 100).toFixed(0)}%`
    )
  const spread = rows.filter(varied).sort((a, b) => b.ratio - a.ratio)
  console.log(`  give varied endings: ${spread.length}`)
  for (const r of spread.slice(0, 5))
    console.log(
      '   ',
      JSON.stringify({f: r.tune.friction, v: r.tune.visc, d: r.tune.detent, c: r.tune.creep, lo: +r.tune.throwLow.toFixed(2), hi: +r.tune.throwHigh.toFixed(2)}),
      `rest99 ${r.rest99.toFixed(2)} gap ${(r.minGap * 1000).toFixed(0)}→${(r.lastGap * 1000).toFixed(0)}ms x${r.ratio.toFixed(1)}`,
      `bounce ${r.bounceMax}`
    )
}
for (const r of ok.slice(0, 10)) {
  const {friction, visc, detent, creep, resting, throwLow, throwHigh} = r.tune
  console.log(
    JSON.stringify({friction, visc, detent, creep, resting, throwLow: +throwLow.toFixed(2), throwHigh: +throwHigh.toFixed(2)}),
    `rest99 ${r.rest99.toFixed(2)}`,
    `gap ${(r.minGap * 1000).toFixed(0)}→${(r.lastGap * 1000).toFixed(0)}ms (x${r.ratio.toFixed(1)})`,
    `past ${(r.past * 100).toFixed(0)}% short ${(r.short * 100).toFixed(0)}%`,
    `rev ${r.revMin} bounce ${r.bounceMax}`
  )
}
