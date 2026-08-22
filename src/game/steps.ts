import type {PlayerId, Team} from './types'

export type ClueCount = number | 'unlimited'

export type EndTurnReason = 'pass' | 'wrong' | 'timeout' | 'exhausted'

/**
 * When the host appended it, on the host's clock. The only clock any of them
 * are stamped by, so intervals between steps are comparable even though the
 * room has no shared time.
 *
 * Optional because nothing about the game needs it: it is for saying how long
 * somebody sat there, and a step that arrives without one is still a step.
 */
type Stamped = {at?: number}

/** Steps carry no derived data: a guess records the card clicked, never its colour. */
export type Step =
  | ({t: 'start'; seed: string; startTeam: Team} & Stamped)
  | ({t: 'clue'; team: Team; by: PlayerId; word: string; count: ClueCount} & Stamped)
  | ({t: 'guess'; team: Team; by: PlayerId; card: number} & Stamped)
  /** `by` only when somebody chose it: a turn that ran out has nobody to name. */
  | ({t: 'endTurn'; team: Team; reason: EndTurnReason; by?: PlayerId} & Stamped)
  | ({t: 'end'; winner: Team; reason: 'cards' | 'assassin'} & Stamped)
