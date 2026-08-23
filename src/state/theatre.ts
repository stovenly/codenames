import {useSyncExternalStore} from 'react'
import type {Colour} from '../game/board'
import {derive, type Clue} from '../game/reducer'
import type {Team} from '../game/types'
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
  | {kind: 'deal'; team: Team}
  | {kind: 'clue'; clue: Clue}
  | {kind: 'windup'; card: number; team: Team; colour: Colour; until: number; from: number}
  | {kind: 'landing'; card: number; colour: Colour; team: Team}
  | {kind: 'aftermath'; card: number; colour: Colour; team: Team; correct: boolean}
  | {kind: 'turn'; team: Team}
  | {kind: 'finish'; winner: Team; reason: 'cards' | 'assassin'}

/**
 * Milliseconds. Every player is reading a board they did not touch, so each
 * beat has to last long enough to notice, register and look up.
 */
const FULL = {
  /** Symbols churning on the card, decelerating into the flip. */
  windup: 2600,
  landing: 700,
  correct: 1500,
  wrong: 1900,
  assassin: 3400,
  clue: 3600,
  turn: 1800,
  /** The board arriving, so the first card is not simply there one frame later. */
  deal: 2800
}

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
/** When the show last actually changed, which is what "stuck" is measured against. */
let movedAt = 0
let timers: ReturnType<typeof setTimeout>[] = []
let snapshot: {shownCursor: number; stage: Stage} = {shownCursor, stage}

const publish = () => {
  snapshot = {shownCursor, stage}
  movedAt = Date.now()
  listeners.forEach(l => l())
}

const clearTimers = () => {
  timers.forEach(clearTimeout)
  timers = []
}

const at = (ms: number, fn: () => void) => {
  timers.push(setTimeout(fn, ms))
}

const timings = () => FULL

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

/**
 * The guesser used to be last to see their own guess: the click travelled to
 * the host and the result travelled back before anything moved.
 *
 * It does not have to. Every client derives the same board from the same seed,
 * so the guesser already knows what that card is the instant they commit to it.
 * The whole sequence runs locally and the host's step is reconciled against it
 * afterwards — it decides whether the guess counted, never what it was.
 */
let played: number | null = null

/**
 * How long the guesser will hold for the host's version of their guess before
 * starting anyway. Long enough to cover the round trip on a healthy mesh, so
 * everyone starts together — and short enough that it reads as a click rather
 * than as the game thinking about it.
 */
const SYNC_GRACE_MS = 100

export const previewGuess = (card: number) => {
  if (playing) return
  const {shared} = getRoom()
  if (!shared) return
  const view = derive(
    shared.settings,
    words.get(shared.settings.wordListHash),
    shared.steps,
    shownCursor
  )
  if (view.phase !== 'guess') return
  const colour = view.cards[card]?.colour
  if (!colour) return

  // Claimed straight away so pump cannot play this guess from the top when the
  // step lands while we are still waiting for it.
  playing = true
  played = card
  sfx.confirm()

  const deadline = Date.now() + SYNC_GRACE_MS
  const begin = () => {
    if (arrived(card) || Date.now() >= deadline) windUp(card, view.turn, colour)
    else at(20, begin)
  }
  begin()
}

const arrived = (card: number) => {
  const steps = getRoom().shared?.steps ?? []
  return steps.some((st, i) => i >= shownCursor && st.t === 'guess' && st.card === card)
}

/**
 * Consumes the guess step for a card we have already shown, wherever it landed
 * in the list. Returns false while it is still in flight, which is what `played`
 * is for: pump must skip it when it arrives rather than play it a second time.
 */
const consumeGuess = (card: number): boolean => {
  const steps = getRoom().shared?.steps ?? []
  const found = steps.findIndex((st, i) => i >= shownCursor && st.t === 'guess' && st.card === card)
  if (found < 0) return false
  shownCursor = found + 1
  return true
}

const finishStep = () => {
  shownCursor++
  stage = {kind: 'idle'}
  playing = false
  publish()
  queueMicrotask(pump)
}

/** The card flips here: the reveal becomes visible. */
const land = (card: number, team: Team, colour: Colour) => {
  const t = timings()
  const correct = colour === team

  if (played === card) {
    if (consumeGuess(card)) played = null
  } else {
    shownCursor++
  }

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
}

const windUp = (card: number, team: Team, colour: Colour) => {
  const t = timings()
  stage = {kind: 'windup', card, team, colour, until: Date.now() + t.windup, from: Date.now()}
  publish()
  sfx.riser(t.windup / 1000)
  at(t.windup, () => land(card, team, colour))
}

/**
 * The wheel has stopped; there is nothing left to wait for. Without this the
 * flip came on a fixed timer, so a wheel that settled early sat there having
 * plainly finished, and the stamp arrived a beat after everyone had read the
 * answer off it.
 */
export const settleNow = (card: number) => {
  if (stage.kind !== 'windup' || stage.card !== card) return
  const {team, colour} = stage
  clearTimers()
  land(card, team, colour)
}

const playGuess = (card: number, team: Team) => {
  sfx.confirm()
  windUp(card, team, colourAt(shownCursor + 1)?.colour ?? 'neutral')
}

const pump = () => {
  if (playing) return
  const {shared} = getRoom()
  if (!shared) return

  if (shownCursor > shared.cursor) {
    shownCursor = shared.cursor
    stage = {kind: 'idle'}
    clearTimers()
    playing = false
    publish()
    return
  }

  if (shownCursor === shared.cursor) return

  // Arriving at a game already in progress is not something to replay. A board
  // that has only just been dealt is not in progress.
  const joining = shownCursor === 0 && shared.cursor > 1
  if (joining || shared.cursor - shownCursor > CATCH_UP_LIMIT) {
    shownCursor = shared.cursor
    stage = {kind: 'idle'}
    publish()
    return
  }

  const step = shared.steps[shownCursor]
  if (!step) return

  // Our own guess, arriving after we already showed it.
  if (step.t === 'guess' && played === step.card) {
    played = null
    shownCursor++
    publish()
    queueMicrotask(pump)
    return
  }

  playing = true
  const t = timings()

  switch (step.t) {
    case 'start':
      stage = {kind: 'deal', team: step.startTeam}
      publish()
      sfx.turn(step.startTeam)
      at(t.deal, finishStep)
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
  played = null
  shownCursor = 0
  stage = {kind: 'idle'}
  playing = false
  publish()
}

/**
 * The show is a chain of timers, and pump refuses to start anything while one
 * is running. Anything that strands that flag — a cleared timer, a callback
 * that never arrives, a tab throttled hard enough to lose one — takes that
 * client out of the game silently: the board stops moving while everyone else
 * plays on, and no later step can get past the flag to fix it.
 *
 * The longest thing the show does is under four seconds, so a run that has not
 * changed anything in eight is not running. Drop it and read the room again —
 * every client holds the whole game, so there is never anything to fetch.
 */
const STUCK_MS = 8_000

export const releaseIfStuck = () => {
  if (!playing || Date.now() - movedAt < STUCK_MS) return
  clearTimers()
  played = null
  playing = false
  stage = {kind: 'idle'}
  publish()
  pump()
}

setInterval(releaseIfStuck, 2_000)

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
