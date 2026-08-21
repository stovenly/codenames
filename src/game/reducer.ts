import {buildBoard, type Colour, type Slot} from './board'
import type {ClueCount, Step} from './steps'
import type {Settings} from './settings'
import type {PlayerId, Team} from './types'
import {otherTeam} from './types'

export type Phase = 'setup' | 'clue' | 'guess' | 'gameover'

export type Card = Slot & {revealed: boolean; revealedBy: Team | null}

export type Clue = {word: string; count: ClueCount; by: PlayerId; team: Team}

export type View = {
  phase: Phase
  cards: Card[]
  turn: Team
  startTeam: Team | null
  clue: Clue | null
  /** Infinity when the clue was 0 or unlimited. */
  guessesLeft: number
  unlimited: boolean
  guessedSinceClue: number
  remaining: {red: number; blue: number}
  totals: {red: number; blue: number}
  winner: Team | null
  endReason: 'cards' | 'assassin' | null
  lastGuess: {card: number; colour: Colour; correct: boolean} | null
}

const EMPTY: View = {
  phase: 'setup',
  cards: [],
  turn: 'red',
  startTeam: null,
  clue: null,
  guessesLeft: 0,
  unlimited: false,
  guessedSinceClue: 0,
  remaining: {red: 0, blue: 0},
  totals: {red: 0, blue: 0},
  winner: null,
  endReason: null,
  lastGuess: null
}

const count = (cards: Card[], team: Team, unrevealedOnly: boolean) =>
  cards.filter(c => c.colour === team && (!unrevealedOnly || !c.revealed)).length

/** Pure and total: the board, scores, turn and winner all come out of here. */
export const derive = (settings: Settings, words: string[], steps: Step[], cursor: number): View => {
  const applied = steps.slice(0, Math.max(0, Math.min(cursor, steps.length)))
  const start = applied.find(s => s.t === 'start')
  if (!start) return EMPTY

  const board = buildBoard(settings, words, start.seed, start.startTeam)
  const cards: Card[] = board.map(slot => ({...slot, revealed: false, revealedBy: null}))

  let phase: Phase = 'clue'
  let turn: Team = start.startTeam
  let clue: Clue | null = null
  let guessesLeft = 0
  let unlimited = false
  let guessedSinceClue = 0
  let winner: Team | null = null
  let endReason: View['endReason'] = null
  let lastGuess: View['lastGuess'] = null
  let over = false

  const finish = (team: Team, reason: 'cards' | 'assassin') => {
    winner = team
    endReason = reason
    phase = 'gameover'
    over = true
  }

  for (const step of applied) {
    if (over) break

    switch (step.t) {
      case 'start':
        break

      case 'clue':
        clue = {word: step.word, count: step.count, by: step.by, team: step.team}
        unlimited = step.count === 'unlimited' || step.count === 0
        guessesLeft = unlimited ? Infinity : (step.count as number) + 1
        guessedSinceClue = 0
        phase = 'guess'
        break

      case 'guess': {
        const card = cards[step.card]
        if (!card || card.revealed) break
        card.revealed = true
        card.revealedBy = step.team
        guessedSinceClue++
        lastGuess = {card: step.card, colour: card.colour, correct: card.colour === step.team}

        if (card.colour === 'assassin') {
          finish(otherTeam(step.team), 'assassin')
          break
        }
        if (card.colour === step.team) guessesLeft--

        if (count(cards, 'red', true) === 0) finish('red', 'cards')
        else if (count(cards, 'blue', true) === 0) finish('blue', 'cards')
        break
      }

      case 'endTurn':
        turn = otherTeam(step.team)
        clue = null
        guessesLeft = 0
        unlimited = false
        guessedSinceClue = 0
        lastGuess = null
        phase = 'clue'
        break

      case 'end':
        finish(step.winner, step.reason)
        break
    }
  }

  return {
    phase,
    cards,
    turn,
    startTeam: start.startTeam,
    clue,
    guessesLeft,
    unlimited,
    guessedSinceClue,
    remaining: {red: count(cards, 'red', true), blue: count(cards, 'blue', true)},
    totals: {red: count(cards, 'red', false), blue: count(cards, 'blue', false)},
    winner,
    endReason,
    lastGuess
  }
}

/**
 * The consequences of the step just appended, so the rules live in one place
 * rather than being restated wherever a step is created. The host appends
 * these in the same broadcast as the step that caused them.
 */
export const followUps = (settings: Settings, words: string[], steps: Step[]): Step[] => {
  const view = derive(settings, words, steps, steps.length)
  const last = steps[steps.length - 1]
  if (!last) return []

  if (view.winner && last.t !== 'end') {
    return [{t: 'end', winner: view.winner, reason: view.endReason ?? 'cards'}]
  }

  if (last.t === 'guess' && view.phase === 'guess' && view.lastGuess) {
    if (!view.lastGuess.correct) return [{t: 'endTurn', team: view.turn, reason: 'wrong'}]
    if (!view.unlimited && view.guessesLeft <= 0) {
      return [{t: 'endTurn', team: view.turn, reason: 'exhausted'}]
    }
  }

  return []
}

/** Appends a step plus everything that automatically follows from it. */
export const advance = (settings: Settings, words: string[], steps: Step[], step: Step): Step[] => {
  let next = [...steps, step]
  for (let guard = 0; guard < 4; guard++) {
    const more = followUps(settings, words, next)
    if (!more.length) break
    next = [...next, ...more]
  }
  return next
}
