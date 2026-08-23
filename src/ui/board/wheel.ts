import type {Colour} from '../../game/board'
import type {Team} from '../../game/types'

/**
 * The Big Wheel, as a model: a strip of card faces falling past a window, a
 * flapper at the top that every face's leading edge has to push past, and a
 * wheel heavy enough that the last few pegs are a real question.
 *
 * Everything here is pure so the whole thing can be run thousands of times in
 * a test — which is how the constants were chosen, and how "always lands on
 * the answer, never leaves the strip, stops inside the budget" is known rather
 * than hoped.
 */

export type Slot = {kind: 'card'; colour: Colour} | {kind: 'joke'; text: string}

export const FACES = 18
/**
 * Faces fall, so the reel runs from the far end of the strip back toward the
 * top. Ten of them pass, not sixteen: under constant deceleration the time a
 * spin takes is set by how far it travels, so a shorter run is a slower one —
 * and every peg has to be far enough from the last to read as its own card.
 */
export const START = 13
/** Where it comes to rest. The faces either side exist to be overshot into. */
export const LAND = 3

/**
 * What might come up while the wheel is still turning. A reel that is mostly
 * neutral cards is a reel nobody is worried about, so the bad outcomes are
 * over-represented, and more so in the last stretch before the window stops.
 *
 * "Enemy" depends on who is guessing; the weights are resolved per spin.
 */
const WEIGHTS = {
  far: {assassin: 3, enemy: 3, own: 2, neutral: 1.5},
  near: {assassin: 5, enemy: 4, own: 1.5, neutral: 0.5}
}
/** The last faces to pass the window before it stops. */
const NEAR = 4

/** One in this many spins shows a joke card somewhere in the fast part of the run. */
const JOKE_ONE_IN = 3
export const JOKES = ['🍆💦', '💀🔥', '🤡', '🫠', '💩', '🐍', '🎰', '🙈', '👀', '🧨']

const pickWeighted = <T extends string>(weights: Record<T, number>, rand: () => number): T => {
  const entries = Object.entries(weights) as Array<[T, number]>
  let n = rand() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [key, w] of entries) {
    n -= w
    if (n <= 0) return key
  }
  return entries[entries.length - 1]![0]
}

/**
 * A different run-up every time, with the answer dropped into the resting slot.
 *
 * No two adjacent faces are ever the same — a wheel that shows red, red reads
 * as having skipped a peg — and nothing adjacent to the answer is the answer,
 * so neither an overshoot nor the approach can show it one notch early.
 */
export const buildStrip = (target: Colour, team: Team, rand: () => number = Math.random): Slot[] => {
  const enemy: Colour = team === 'red' ? 'blue' : 'red'
  const own: Colour = team
  const resolve = (k: 'assassin' | 'enemy' | 'own' | 'neutral'): Colour =>
    k === 'enemy' ? enemy : k === 'own' ? own : k

  const strip: Slot[] = []
  let prev: Colour | null = null

  // Built from the far end toward the window, so "near" means near the stop.
  for (let i = FACES - 1; i >= 0; i--) {
    const near = i > LAND && i <= LAND + NEAR
    const weights = {...(near ? WEIGHTS.near : WEIGHTS.far)}
    let colour: Colour

    if (i === LAND) {
      colour = target
    } else {
      // Never the answer beside the answer; never the same face twice running.
      const banned = new Set<Colour>([prev ?? 'neutral'].filter(Boolean) as Colour[])
      if (prev === null) banned.clear()
      if (Math.abs(i - LAND) === 1) banned.add(target)
      for (let tries = 0; tries < 12; tries++) {
        colour = resolve(pickWeighted(weights, rand))
        if (!banned.has(colour)) break
      }
      // Twelve misses means the weights only offered banned faces; take anything legal.
      if (banned.has(colour!)) {
        colour = (['assassin', enemy, own, 'neutral'] as Colour[]).find(c => !banned.has(c))!
      }
    }

    strip[i] = {kind: 'card', colour: colour!}
    prev = colour!
  }

  // A joke face, occasionally, somewhere it is seen at speed and never where the
  // wheel might come to rest. It replaces a face, so neighbours stay distinct
  // from each other around it.
  if (rand() < 1 / JOKE_ONE_IN) {
    const lo = LAND + NEAR + 2
    const hi = START - 2
    const at = lo + Math.floor(rand() * (hi - lo + 1))
    strip[at] = {kind: 'joke', text: JOKES[Math.floor(rand() * JOKES.length)]!}
  }

  return strip
}

export const TAU = Math.PI * 2

/**
 * The physics, in notch units — one notch is one card face.
 *
 *   a = -FRICTION·sign(v)   a brake that does not care how fast: constant
 *                           deceleration, so the pegs come evenly rather than
 *                           blurring past at first and then crawling
 *       -VISC·v             a little air, so it never quite rings
 *       -DETENT·sin(2πp)    the flapper: zero on a notch, restoring around it
 *       +creep              a hand's weight, only on a wheel already resting on
 *                           the wrong notch — applied while turning it would
 *                           push the whole run and throw it off the strip
 *
 * Constant deceleration is what a wheel on a bearing actually does, and it is
 * the difference between "thock... thock.... thock" and a buzz that turns
 * into a crawl.
 */
export type Tune = {
  friction: number
  visc: number
  detent: number
  creep: number
  resting: number
  /** Past this fraction of the budget the brake comes on hard. */
  lateAt: number
  lateBrake: number
  /** Launch speed, as a multiple of what would carry it exactly to the answer. */
  throwLow: number
  throwHigh: number
}

/**
 * Swept, not guessed. Every spin lands on the answer and none leaves the strip;
 * no two pegs are closer than 150ms, so each one reads as its own card rather
 * than as a rattle; it rests by 2.33s; and it turns back exactly once, with no
 * pair of turns inside 220ms of each other — one deliberate near-miss rather
 * than a wobble.
 */
export const TUNE: Tune = {
  friction: 4.4,
  visc: 1.6,
  detent: 40,
  creep: 40,
  resting: 4.5,
  lateAt: 0.74,
  lateBrake: 3,
  throwLow: 0.99,
  throwHigh: 1.1
}

export type Sim = {
  p: number
  v: number
  launch: number
  elapsed: number
  /** Which notch the window is on; changes exactly once per face that passes. */
  notch: number
  done: boolean
}

/** Under constant deceleration, v0²/2a is the distance a throw carries. */
export const launch = (tune: Tune, rand: () => number = Math.random): Sim => {
  const distance = (START - LAND) * (tune.throwLow + rand() * (tune.throwHigh - tune.throwLow))
  const v = -Math.sqrt(2 * tune.friction * distance)
  return {p: START, v, launch: Math.abs(v), elapsed: 0, notch: START, done: false}
}

export type Tick = {
  /** A face's leading edge pushed past the flapper this frame. */
  peg: boolean
  /** Which way it went: -1 is the normal fall, +1 is rocking back off an overshoot. */
  dir: -1 | 1
  /** 0 at launch speed, 1 at rest — for anything that wants to get heavier as it slows. */
  progress: number
}

/** One frame. Mutates `sim`; returns what happened so the caller can make noise about it. */
export const step = (sim: Sim, dt: number, budgetS: number, tune: Tune = TUNE): Tick => {
  const none: Tick = {peg: false, dir: -1, progress: 1}
  if (sim.done) return none

  sim.elapsed += dt
  const late = sim.elapsed > budgetS * tune.lateAt
  const friction = late ? tune.friction * tune.lateBrake : tune.friction

  const at = sim.p
  const notch = Math.round(at)
  const resting = Math.abs(sim.v) < tune.resting
  const pull = resting && notch !== LAND ? Math.sign(LAND - at) * (late ? tune.creep * 2 : tune.creep) : 0

  // Coulomb friction must not reverse a wheel on its own: clamp the brake so it
  // can only bring v to zero within the frame, never through it.
  const brake = Math.min(Math.abs(sim.v) / dt, friction) * -Math.sign(sim.v)
  const a = brake - tune.visc * sim.v - tune.detent * Math.sin(TAU * at) + pull
  sim.v += a * dt
  const next = at + sim.v * dt
  sim.p = next

  const arrived = Math.round(next)
  const peg = arrived !== sim.notch
  const dir: -1 | 1 = arrived < sim.notch ? -1 : 1
  sim.notch = arrived

  if (notch === LAND && Math.abs(sim.v) < 0.8 && Math.abs(next - LAND) < 0.12) {
    sim.p = LAND
    sim.done = true
  }

  return {peg, dir, progress: Math.min(1, 1 - Math.abs(sim.v) / sim.launch)}
}

export type Outcome = {
  landed: boolean
  escaped: boolean
  restedAt: number
  pegs: number
  reversals: number
  /** Time between the first two pegs, and between the last two. */
  firstGap: number
  lastGap: number
  /** The tightest gap anywhere in the run: the fastest the ticks ever come. */
  minGap: number
  /** Reversals that arrive on top of one another — ringing rather than hesitating. */
  bounces: number
}

/** A whole spin at 60fps, for tests and for tuning. */
export const spin = (budgetS: number, tune: Tune = TUNE, rand: () => number = Math.random): Outcome => {
  const sim = launch(tune, rand)
  const dt = 1 / 60
  const pegTimes: number[] = []
  const turnTimes: number[] = []
  let reversals = 0
  let lastSign = Math.sign(sim.v)

  for (let i = 0; i < 60 * 12 && !sim.done; i++) {
    const tick = step(sim, dt, budgetS, tune)
    if (tick.peg) pegTimes.push(sim.elapsed)
    const sign = Math.sign(sim.v)
    if (sign !== 0 && sign !== lastSign) {
      reversals++
      turnTimes.push(sim.elapsed)
      lastSign = sign
    }
    if (sim.p < -2 || sim.p > FACES + 2) {
      return {
        landed: false,
        escaped: true,
        restedAt: sim.elapsed,
        pegs: pegTimes.length,
        reversals,
        firstGap: 0,
        lastGap: 0,
        minGap: 0,
        bounces: 0
      }
    }
  }

  const gaps = pegTimes.slice(1).map((t, i) => t - pegTimes[i]!)
  const bounces = turnTimes.slice(1).filter((t, i) => t - turnTimes[i]! < 0.22).length

  return {
    landed: sim.done && sim.p === LAND,
    escaped: false,
    restedAt: sim.elapsed,
    pegs: pegTimes.length,
    reversals,
    firstGap: gaps[0] ?? 0,
    lastGap: gaps[gaps.length - 1] ?? 0,
    minGap: gaps.length ? Math.min(...gaps) : 0,
    bounces
  }
}
