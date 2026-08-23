import {spin, type Tune} from '../src/ui/board/wheel.ts'

/**
 * Tunes the wheel by running it. Prints the constants that always land, never
 * leave the strip, stop inside the budget with a beat to spare, and space the
 * pegs like a wheel rather than a buzz.
 */
const BUDGET = 2.6
const RUNS = 250

const q = (a: number[], f: number) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * f)] ?? Infinity

type Row = {tune: Tune; rest99: number; rest50: number; first: number; last: number; revMin: number; revMed: number; pegs: number}
const rows: Row[] = []

for (const friction of [7, 8.5, 10, 12, 14])
  for (const detent of [50, 70, 95])
    for (const creep of [60, 90, 130])
      for (const resting of [3, 4.5, 6])
        for (const lateAt of [0.7, 0.78])
          for (const throwHigh of [1.08, 1.15, 1.22]) {
            const tune: Tune = {friction, visc: 0.35, detent, creep, resting, lateAt, lateBrake: 4, throwLow: 0.98, throwHigh}
            const rest: number[] = [], first: number[] = [], last: number[] = [], revs: number[] = [], pegs: number[] = []
            let bad = 0
            for (let i = 0; i < RUNS; i++) {
              const o = spin(BUDGET, tune)
              if (!o.landed || o.escaped) {
                bad++
                continue
              }
              rest.push(o.restedAt); first.push(o.firstGap); last.push(o.lastGap); revs.push(o.reversals); pegs.push(o.pegs)
            }
            if (bad) continue
            rows.push({tune, rest99: q(rest, 0.99), rest50: q(rest, 0.5), first: q(first, 0.5), last: q(last, 0.5), revMin: q(revs, 0.05), revMed: q(revs, 0.5), pegs: q(pegs, 0.5)})
          }

// Stops with a beat to spare, first pegs slow enough to hear as pegs, hesitates.
const ok = rows
  .filter(r => r.rest99 < BUDGET * 0.88 && r.rest99 > BUDGET * 0.6 && r.first >= 0.045 && r.revMin >= 1)
  .sort((a, b) => b.first - a.first || b.revMed - a.revMed)

console.log(`viable ${ok.length} of ${rows.length}`)
for (const r of ok.slice(0, 10)) {
  const {friction, detent, creep, resting, lateAt, throwHigh} = r.tune
  console.log(
    JSON.stringify({friction, detent, creep, resting, lateAt, throwHigh}),
    `rest p50 ${r.rest50.toFixed(2)} p99 ${r.rest99.toFixed(2)}`,
    `first gap ${(r.first * 1000).toFixed(0)}ms last ${(r.last * 1000).toFixed(0)}ms`,
    `pegs ${r.pegs} rev min ${r.revMin} med ${r.revMed}`
  )
}
