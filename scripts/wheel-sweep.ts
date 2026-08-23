import {spin, type Tune} from '../src/ui/board/wheel.ts'

/**
 * Tunes the wheel by running it. Wants a spin whose pegs are far enough apart
 * to read as separate cards, that always lands, that stops with a beat to
 * spare, and whose hesitation is a hesitation rather than a wobble.
 */
const BUDGET = 2.6
const RUNS = 250

const q = (a: number[], f: number) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * f)] ?? Infinity

type Row = {
  tune: Tune
  rest99: number
  rest50: number
  minGap: number
  lastGap: number
  revMed: number
  revMin: number
  bounceMax: number
}
const rows: Row[] = []

for (const friction of [3.2, 3.8, 4.4, 5])
  for (const visc of [0.4, 0.9, 1.6])
    for (const detent of [26, 40, 58])
      for (const creep of [40, 60, 85])
        for (const resting of [3, 4.5])
          for (const lateAt of [0.74, 0.84]) {
            const tune: Tune = {friction, visc, detent, creep, resting, lateAt, lateBrake: 3, throwLow: 0.99, throwHigh: 1.1}
            const rest: number[] = [], mins: number[] = [], lasts: number[] = [], revs: number[] = [], bounces: number[] = []
            let bad = 0
            for (let i = 0; i < RUNS; i++) {
              const o = spin(BUDGET, tune)
              if (!o.landed || o.escaped) {
                bad++
                continue
              }
              rest.push(o.restedAt); mins.push(o.minGap); lasts.push(o.lastGap); revs.push(o.reversals); bounces.push(o.bounces)
            }
            if (bad) continue
            rows.push({
              tune,
              rest99: q(rest, 0.99),
              rest50: q(rest, 0.5),
              minGap: q(mins, 0.02),
              lastGap: q(lasts, 0.5),
              revMed: q(revs, 0.5),
              revMin: q(revs, 0.05),
              bounceMax: q(bounces, 0.98)
            })
          }

const ok = rows
  .filter(r => r.rest99 < BUDGET * 0.9 && r.minGap >= 0.1 && r.revMin >= 1 && r.bounceMax <= 1)
  .sort((a, b) => b.minGap - a.minGap || a.bounceMax - b.bounceMax)

console.log(`viable ${ok.length} of ${rows.length}`)
for (const r of ok.slice(0, 10)) {
  const {friction, visc, detent, creep, resting, lateAt} = r.tune
  console.log(
    JSON.stringify({friction, visc, detent, creep, resting, lateAt}),
    `rest p50 ${r.rest50.toFixed(2)} p99 ${r.rest99.toFixed(2)}`,
    `gap min ${(r.minGap * 1000).toFixed(0)}ms last ${(r.lastGap * 1000).toFixed(0)}ms`,
    `rev ${r.revMin}/${r.revMed} bounce ${r.bounceMax}`
  )
}
