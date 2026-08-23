import {describe, expect, it} from 'vitest'
import {FACES, LAND, START, TUNE, buildStrip, spin, type Slot} from './wheel'

/** Deterministic, so a failure is a failure and not a roll of the dice. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0x100000000
}

const colourAt = (strip: Slot[], i: number) => {
  const slot = strip[i]!
  return slot.kind === 'card' ? slot.colour : `joke:${slot.text}`
}

describe('the strip', () => {
  it('puts the answer under the window and nothing like it beside it', () => {
    for (let n = 0; n < 300; n++) {
      const strip = buildStrip('red', 'blue', seeded(n))
      expect(colourAt(strip, LAND)).toBe('red')
      expect(colourAt(strip, LAND - 1)).not.toBe('red')
      expect(colourAt(strip, LAND + 1)).not.toBe('red')
    }
  })

  it('never shows the same face twice running', () => {
    for (let n = 0; n < 300; n++) {
      const strip = buildStrip('neutral', 'red', seeded(1000 + n))
      for (let i = 1; i < FACES; i++) {
        expect(colourAt(strip, i)).not.toBe(colourAt(strip, i - 1))
      }
    }
  })

  it('keeps the joke in the fast part of the run, and never where the wheel stops', () => {
    let jokes = 0
    for (let n = 0; n < 600; n++) {
      const strip = buildStrip('blue', 'blue', seeded(5000 + n))
      const at = strip.findIndex(s => s.kind === 'joke')
      if (at < 0) continue
      jokes++
      expect(strip.filter(s => s.kind === 'joke').length).toBe(1)
      expect(at).toBeGreaterThanOrEqual(LAND + 2)
      expect(at).toBeLessThan(START - 1)
    }
    // Roughly half, with room for the dice.
    expect(jokes).toBeGreaterThan(240)
    expect(jokes).toBeLessThan(360)
  })

  it('leans on the bad outcomes in the last stretch', () => {
    let bad = 0
    let total = 0
    for (let n = 0; n < 400; n++) {
      const strip = buildStrip('neutral', 'red', seeded(9000 + n))
      for (let i = LAND + 1; i <= LAND + 4; i++) {
        const c = colourAt(strip, i)
        total++
        if (c === 'assassin' || c === 'blue') bad++
      }
    }
    expect(bad / total).toBeGreaterThan(0.6)
  })
})

describe('the wheel', () => {
  it('always rests on the answer, and never past the budget', () => {
    const budget = 2.8
    const rests: number[] = []
    for (let n = 0; n < 400; n++) {
      const out = spin(budget, TUNE, seeded(n))
      expect(out.escaped).toBe(false)
      expect(out.landed).toBe(true)
      // The card turns over on the budget whatever the wheel is doing, so this
      // is the one bound that has to hold every single time.
      expect(out.restedAt).toBeLessThanOrEqual(budget + 0.02)
      rests.push(out.restedAt)
    }

    // And usually well before it, so the answer sits there a moment first.
    const p90 = rests.sort((a, b) => a - b)[Math.floor(rests.length * 0.9)]!
    expect(p90).toBeLessThan(budget * 0.92)
  })

  it('has no favourite ending', () => {
    let past = 0
    let inched = 0
    for (let n = 0; n < 400; n++) {
      const out = spin(2.8, TUNE, seeded(600 + n))
      if (out.wentPast) past++
      else if (out.creepPegs > 0) inched++
    }
    // Sails past and gets pulled back, or runs out short and is inched in —
    // both often enough that neither is the one you always see.
    expect(past).toBeGreaterThan(80)
    expect(inched).toBeGreaterThan(80)
  })

  it('passes every face on the way, once each, plus whatever it rocks back over', () => {
    for (let n = 0; n < 100; n++) {
      const out = spin(2.8, TUNE, seeded(200 + n))
      expect(out.pegs).toBeGreaterThanOrEqual(START - LAND)
      expect(out.pegs).toBeLessThanOrEqual(START - LAND + 6)
    }
  })

  it('spaces the pegs like a wheel, not a buzz', () => {
    for (let n = 0; n < 100; n++) {
      const out = spin(2.8, TUNE, seeded(300 + n))
      expect(out.firstGap).toBeGreaterThan(0.04)
      expect(out.lastGap).toBeGreaterThan(out.firstGap)
    }
  })

  it('hesitates on the way in', () => {
    for (let n = 0; n < 100; n++) {
      expect(spin(2.8, TUNE, seeded(400 + n)).reversals).toBeGreaterThanOrEqual(1)
    }
  })
})
