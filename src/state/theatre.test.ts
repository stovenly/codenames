import {beforeEach, describe, expect, it, vi} from 'vitest'
import {defaultSettings} from '../game/settings'
import type {Step} from '../game/steps'
import type {Shared} from '../game/types'

const listeners = new Set<() => void>()
let shared: Shared | null = null

vi.mock('./room', () => ({
  getRoom: () => ({shared}),
  subscribeRoom: (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
}))
vi.mock('../ui/sound/audio', () => ({sfx: new Proxy({}, {get: () => () => {}})}))
vi.mock('./words', () => ({
  get: () => Array.from({length: 64}, (_, i) => `W${i}`),
  have: () => true
}))

const {getTheatre, previewGuess, resetTheatre} = await import('./theatre')

const room = (steps: Step[]): Shared => ({
  version: 1,
  hostId: 'h',
  hostEpoch: 1,
  hostHidden: false,
  hostDegraded: false,
  roster: ['h'],
  sentAt: 0,
  players: [],
  settings: defaultSettings('hash'),
  steps,
  cursor: steps.length,
  deadline: null
})

/** One publish carrying every step the host appended, which is what a client gets. */
const deliver = (steps: Step[]) => {
  shared = room(steps)
  listeners.forEach(l => l())
}

const START: Step = {t: 'start', seed: 'seed', startTeam: 'red'}
const CLUE: Step = {t: 'clue', by: 'p', team: 'red', word: 'ORBIT', count: 1}
const GUESS: Step = {t: 'guess', by: 'p', team: 'red', card: 0}
const END_TURN: Step = {t: 'endTurn', team: 'red', reason: 'wrong'}

const settle = (ms: number) => vi.advanceTimersByTimeAsync(ms)

describe('theatre', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    shared = null
    resetTheatre()
  })

  it('winds up a guess that arrives on its own', async () => {
    deliver([START])
    await settle(3200)
    deliver([START, CLUE])
    await settle(5000)
    deliver([START, CLUE, GUESS])
    await settle(10)
    expect(getTheatre().stage.kind).toBe('windup')
  })

  it('winds up a guess that arrives batched with its follow-up', async () => {
    deliver([START])
    await settle(3200)
    deliver([START, CLUE])
    await settle(5000)
    deliver([START, CLUE, GUESS, END_TURN])
    await settle(10)
    expect(getTheatre().stage.kind).toBe('windup')
  })

  it('winds up when the clue and the guess arrive together', async () => {
    deliver([START])
    await settle(3200)
    deliver([START, CLUE, GUESS, END_TURN])
    await settle(4000)
    expect(getTheatre().stage.kind).toBe('windup')
  })

  it('skips the show for someone arriving mid-game', async () => {
    deliver([START, CLUE, GUESS, END_TURN])
    await settle(10)
    expect(getTheatre().stage.kind).toBe('idle')
    expect(getTheatre().shownCursor).toBe(4)
  })
})

describe('a guess of my own', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    shared = null
    resetTheatre()
  })

  it('holds briefly for the host, then starts without it', async () => {
    deliver([START])
    await settle(3200)
    deliver([START, CLUE])
    await settle(5000)

    previewGuess(0)
    await settle(10)
    expect(getTheatre().stage.kind).toBe('idle')

    // Nothing ever comes back, and the reveal still happens.
    await settle(200)
    expect(getTheatre().stage.kind).toBe('windup')
  })

  it('starts the moment the host confirms it, without waiting out the grace', async () => {
    deliver([START])
    await settle(3200)
    deliver([START, CLUE])
    await settle(5000)

    previewGuess(0)
    deliver([START, CLUE, GUESS])
    await settle(100)
    expect(getTheatre().stage.kind).toBe('windup')
  })

  it('never plays the same guess twice', async () => {
    deliver([START])
    await settle(3200)
    deliver([START, CLUE])
    await settle(5000)

    previewGuess(0)
    deliver([START, CLUE, GUESS])
    await settle(30_000)

    expect(getTheatre().stage.kind).toBe('idle')
    expect(getTheatre().shownCursor).toBe(3)
  })
})
