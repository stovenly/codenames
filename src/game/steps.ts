import type {PlayerId, Team} from './types'

export type ClueCount = number | 'unlimited'

export type EndTurnReason = 'pass' | 'wrong' | 'timeout' | 'exhausted'

/** Steps carry no derived data: a guess records the card clicked, never its colour. */
export type Step =
  | {t: 'start'; seed: string; startTeam: Team}
  | {t: 'clue'; team: Team; by: PlayerId; word: string; count: ClueCount}
  | {t: 'guess'; team: Team; by: PlayerId; card: number}
  /** `by` only when somebody chose it: a turn that ran out has nobody to name. */
  | {t: 'endTurn'; team: Team; reason: EndTurnReason; by?: PlayerId}
  | {t: 'end'; winner: Team; reason: 'cards' | 'assassin'}
