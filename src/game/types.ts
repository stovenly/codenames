import type {PlayerId} from '../net/protocol'
import type {Settings} from './settings'
import type {Step} from './steps'

export type {PlayerId}

export type Team = 'red' | 'blue'

export type Avatar = {
  style: string
  seed: string
  bg: string
}

export type Player = {
  id: PlayerId
  name: string
  team: Team | null
  spymaster: boolean
  ready: boolean
  avatar: Avatar
  connected: boolean
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

export const teamOf = (players: Player[], id: PlayerId) => players.find(p => p.id === id)?.team ?? null

export const spymasterOf = (players: Player[], team: Team) =>
  players.find(p => p.team === team && p.spymaster) ?? null
