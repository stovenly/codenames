import type {PlayerId} from '../net/protocol'
import type {Settings} from './settings'
import type {Step} from './steps'

export type {PlayerId}

export type Team = 'red' | 'blue'

export type Avatar = {
  style: string
  /** The variant index within the style, as a string, so a slider can find it. */
  seed: string
  bg: string
}

export const AVATAR_VARIANTS = 60

export type Player = {
  id: PlayerId
  name: string
  team: Team | null
  spymaster: boolean
  ready: boolean
  avatar: Avatar
  connected: boolean
  /** Watching, not waiting: implies no team, and skipped when teams are dealt out. */
  spectator?: boolean
  /** Self-reported and only for the end-game cards: messages sent, cards pointed at. */
  chats?: number
  marks?: number
}

/** Broadcast on every change. The board is not here: it derives from steps. */
export type Shared = {
  version: number
  hostId: PlayerId
  hostEpoch: number
  hostHidden: boolean
  /** Measured, not assumed: the host's own beat is running late. */
  hostDegraded: boolean
  roster: PlayerId[]
  sentAt: number
  players: Player[]
  settings: Settings
  steps: Step[]
  /** steps[0..cursor) are applied. */
  cursor: number
  /** Host wall-clock ms, not derivable from steps. */
  deadline: number | null
}

export const otherTeam = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

export type Seat = 'red' | 'blue' | 'bench' | 'spectator'

export const seatOf = (player: Player): Seat =>
  player.spectator ? 'spectator' : (player.team ?? 'bench')

/** Everyone a game can be dealt around: the bench is waiting to play, a spectator is not. */
export const playing = (players: Player[]) => players.filter(p => !p.spectator)

/**
 * Teams dealt alternately from `first`, over an already-shuffled roster: the two
 * sides differ by at most one, and whoever is dealt first to each side calls its
 * clues. Spectators keep the seat they chose.
 */
export const dealTeams = (players: Player[], order: PlayerId[], first: Team): Player[] => {
  const spectating = new Set(players.filter(p => p.spectator).map(p => p.id))
  const seats = new Map<PlayerId, {team: Team; spymaster: boolean}>()
  order
    .filter(id => !spectating.has(id))
    .forEach((id, i) => {
      seats.set(id, {team: i % 2 === 0 ? first : otherTeam(first), spymaster: i < 2})
    })
  return players.map(p => {
    const seat = seats.get(p.id)
    return seat ? {...p, ...seat} : p
  })
}

export const teamOf = (players: Player[], id: PlayerId) => players.find(p => p.id === id)?.team ?? null

export const spymasterOf = (players: Player[], team: Team) =>
  players.find(p => p.team === team && p.spymaster) ?? null

/**
 * A side needs someone to give clues and someone to act on them, so a lone
 * spymaster is as unplayable as an empty team. At most one message per side,
 * red first: naming every fault at once reads as a wall of complaints about
 * the same seat.
 */
export const rosterProblems = (players: Player[]): Array<{team: Team; message: string}> => {
  const out: Array<{team: Team; message: string}> = []
  for (const team of ['red', 'blue'] as Team[]) {
    const side = players.filter(p => p.team === team)
    const label = team === 'red' ? 'Red' : 'Blue'
    if (!side.length) out.push({team, message: `${label} has no players`})
    else if (!side.some(p => p.spymaster)) out.push({team, message: `${label} needs a spymaster`})
    else if (side.every(p => p.spymaster)) out.push({team, message: `${label} needs at least one spy`})
  }
  return out
}
