import {useSyncExternalStore} from 'react'
import type {Colour} from '../game/board'
import {derive, type Clue} from '../game/reducer'
import type {Team} from '../game/types'
import {reducedMotion} from '../ui/motion'
import {sfx} from '../ui/sound/audio'
import {getRoom, subscribeRoom} from './room'
import * as words from './words'

/**
 * The visual cursor lags the authoritative one. The host decides the outcome
 * instantly; this decides how long everyone sweats before seeing it. Nothing
 * here can change what happened — it only withholds it.
 */
export type Stage =
  | {kind: 'idle'}
  | {kind: 'clue'; clue: Clue}
  | {kind: 'windup'; card: number; team: Team; colour: Colour; until: number; from: number}
  | {kind: 'landing'; card: number; colour: Colour; team: Team}
  | {kind: 'aftermath'; card: number; colour: Colour; team: Team; correct: boolean}
  | {kind: 'turn'; team: Team}
  | {kind: 'finish'; winner: Team; reason: 'cards' | 'assassin'}

const FULL = {
  /** Symbols churning on the card, decelerating into the flip. */
  windup: 1900,
  landing: 520,
  correct: 700,
  wrong: 950,
  assassin: 2300,
  clue: 1900,
  turn: 750
}

const QUICK = {windup: 90, landing: 120, correct: 120, wrong: 120, assassin: 400, clue: 260, turn: 160}

/**
 * How far behind we are willing to catch up by playing, once we are following
 * along. Generous, because a client is fed whatever one broadcast coalesced —
 * the host's own theatre is fed a step at a time, so a tight limit here is the
 * difference between the host seeing the show and nobody else seeing it.
 */
const CATCH_UP_LIMIT = 8

const listeners = new Set<() => void>()

let shownCursor = 0
let stage: Stage = {kind: 'idle'} as Stage
let playing = false
let timers: ReturnType<typeof setTimeout>[] = []
let snapshot: {shownCursor: number; stage: Stage} = {shownCursor, stage}

const publish = () => {
  snapshot = {shownCursor, stage}
  listeners.forEach(l => l())
}

const clearTimers = () => {
  timers.forEach(clearTimeout)
  timers = []
}

const at = (ms: number, fn: () => void) => {
  timers.push(setTimeout(fn, ms))
}

const timings = () => (reducedMotion() ? QUICK : FULL)

const colourAt = (cursorAfterGuess: number): {colour: Colour} | null => {
  const {shared} = getRoom()
  if (!shared) return null
  const view = derive(
    shared.settings,
    words.get(shared.settings.wordListHash),
    shared.steps,
    cursorAfterGuess
  )
  return view.lastGuess ? {colour: view.lastGuess.colour} : null
}

const finishStep = () => {
  shownCursor++
  stage = {kind: 'idle'}
  playing = false
  publish()
  queueMicrotask(pump)
}

const playGuess = (card: number, team: Team) => {
  const t = timings()
  const outcome = colourAt(shownCursor + 1)
  const colour: Colour = outcome?.colour ?? 'neutral'
  const correct = colour === team

  stage = {kind: 'windup', card, team, colour, until: Date.now() + t.windup, from: Date.now()}
  publish()
  sfx.confirm()
  if (!reducedMotion()) sfx.riser(t.windup / 1000)

  at(t.windup, () => {
    // The card flips here: the authoritative reveal becomes visible.
    shownCursor++
    stage = {kind: 'landing', card, colour, team}
    publish()
    sfx.land()

    at(t.landing, () => {
      stage = {kind: 'aftermath', card, colour, team, correct}
      publish()
      if (colour === 'assassin') sfx.assassin()
      else if (correct) sfx.correct(team)
      else sfx.wrong()

      const hold = colour === 'assassin' ? t.assassin : correct ? t.correct : t.wrong
      at(hold, () => {
        stage = {kind: 'idle'}
        playing = false
        publish()
        pump()
      })
    })
  })
}

const pump = () => {
  if (playing) return
  const {shared} = getRoom()
  if (!shared) return

  if (shownCursor > shared.cursor) {
    shownCursor = shared.cursor
    stage = {kind: 'idle'}
    clearTimers()
    publish()
    return
  }

  if (shownCursor === shared.cursor) return

  // Arriving at a game already in progress is not something to replay.
  const joining = shownCursor === 0 && shared.cursor > 1
  if (joining || shared.cursor - shownCursor > CATCH_UP_LIMIT) {
    shownCursor = shared.cursor
    stage = {kind: 'idle'}
    publish()
    return
  }

  const step = shared.steps[shownCursor]
  if (!step) return

  playing = true
  const t = timings()

  switch (step.t) {
    case 'start':
      finishStep()
      return

    case 'clue':
      stage = {
        kind: 'clue',
        clue: {word: step.word, count: step.count, by: step.by, team: step.team}
      }
      publish()
      sfx.clueDrop()
      at(t.clue, finishStep)
      return

    case 'guess':
      playGuess(step.card, step.team)
      return

    case 'endTurn':
      stage = {kind: 'turn', team: step.team === 'red' ? 'blue' : 'red'}
      publish()
      sfx.turn(step.team === 'red' ? 'blue' : 'red')
      at(t.turn, finishStep)
      return

    case 'end':
      shownCursor++
      stage = {kind: 'finish', winner: step.winner, reason: step.reason}
      playing = false
      publish()
      return
  }
}

/**
 * The theatre lives in the lazily-loaded Game chunk, so by the time it is
 * imported the room may already hold every step and have nothing further to
 * publish. Without this the visual cursor sits at zero forever: an empty board,
 * and no clue composer for the spymaster.
 */
export const syncTheatre = () => pump()

export const getTheatre = () => snapshot

export const resetTheatre = () => {
  clearTimers()
  shownCursor = 0
  stage = {kind: 'idle'}
  playing = false
  publish()
}

subscribeRoom(() => {
  const {shared} = getRoom()
  if (!shared) return
  if (shared.steps.length === 0 && shownCursor !== 0) resetTheatre()
  pump()
})

export const useTheatre = () =>
  useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
    () => snapshot
  )
