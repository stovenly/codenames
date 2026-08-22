import type {Colour} from './board'
import {derive} from './reducer'
import type {Settings} from './settings'
import type {ClueCount, EndTurnReason, Step} from './steps'
import type {PlayerId, Team} from './types'

export type Entry =
  | {kind: 'clue'; index: number; team: Team; by: PlayerId; word: string; count: ClueCount}
  | {
      kind: 'guess'
      index: number
      team: Team
      by: PlayerId
      word: string
      colour: Colour
      correct: boolean
      /** The pick itself ended the turn, which is the part people forget. */
      ended: boolean
    }
  | {kind: 'turn'; index: number; team: Team; reason: EndTurnReason}

/**
 * The step list as something a person can read. Derived rather than recorded,
 * because a step carries only the card that was clicked — its colour, and
 * whether that pick cost the turn, both come from replaying the board.
 *
 * `upTo` is the visual cursor, not the authoritative one: a row for a pick must
 * not appear while the reel is still deciding it.
 */
export const readLog = (
  settings: Settings,
  words: string[],
  steps: Step[],
  upTo: number
): Entry[] => {
  const out: Entry[] = []
  const cards = derive(settings, words, steps, steps.length).cards

  for (let i = 0; i < Math.min(upTo, steps.length); i++) {
    const step = steps[i]!
    if (step.t === 'clue') {
      out.push({kind: 'clue', index: i, team: step.team, by: step.by, word: step.word, count: step.count})
      continue
    }
    if (step.t === 'guess') {
      const card = cards[step.card]
      const colour: Colour = card?.colour ?? 'neutral'
      const next = steps[i + 1]
      out.push({
        kind: 'guess',
        index: i,
        team: step.team,
        by: step.by,
        word: card?.word ?? '?',
        colour,
        correct: colour === step.team,
        ended: next?.t === 'endTurn' && next.reason === 'wrong'
      })
      continue
    }
    if (step.t === 'endTurn') {
      out.push({kind: 'turn', index: i, team: step.team, reason: step.reason})
    }
  }

  return out
}
