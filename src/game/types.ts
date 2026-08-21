import type {PlayerId} from '../net/protocol'

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

/** Broadcast on every change. `players` and the 04 game payload ride along. */
export type Shared = {
  version: number
  hostId: PlayerId
  hostEpoch: number
  hostHidden: boolean
  roster: PlayerId[]
  sentAt: number
  players: Player[]
}

export const otherTeam = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

export const teamOf = (players: Player[], id: PlayerId) => players.find(p => p.id === id)?.team ?? null

export const spymasterOf = (players: Player[], team: Team) =>
  players.find(p => p.team === team && p.spymaster) ?? null
