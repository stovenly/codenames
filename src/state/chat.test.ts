import {beforeEach, describe, expect, it, vi} from 'vitest'
import {defaultSettings} from '../game/settings'
import type {Step} from '../game/steps'
import type {Player, Shared, Team} from '../game/types'

let shared: Shared | null = null
const sent: Array<{kind: string; body: unknown; to: string}> = []

vi.mock('./room', () => ({getRoom: () => ({shared})}))
vi.mock('./net', () => ({
  self: 'me',
  on: () => {},
  send: (kind: string, body: unknown, to: string) => sent.push({kind, body, to})
}))

const {readable, rooms, say, writable, whyLocked} = await import('./chat')
import type {Message} from './chat'

const seat = (id: string, team: Team | null, spymaster = false): Player => ({
  id,
  name: id,
  team,
  spymaster,
  ready: true,
  avatar: {style: 'lorelei', seed: '0', bg: '141C30'},
  connected: true
})

const room = (players: Player[], steps: Step[]): Shared => ({
  version: 1,
  hostId: 'rs',
  hostEpoch: 1,
  hostHidden: false,
  hostDegraded: false,
  roster: [],
  sentAt: 0,
  players,
  settings: defaultSettings('hash'),
  steps,
  cursor: steps.length,
  deadline: null
})

const START: Step = {t: 'start', seed: 's', startTeam: 'red'}
const END: Step = {t: 'end', winner: 'red', reason: 'cards'}
const TABLE = [seat('me', 'red'), seat('mate', 'red'), seat('rs', 'red', true), seat('bs', 'blue', true), seat('bg', 'blue')]

/** The same table with me holding red's mask instead of rs. */
const ASSPY = [seat('me', 'red', true), seat('mate', 'red'), seat('rs', 'red'), seat('bs', 'blue', true), seat('bg', 'blue')]

describe('chat', () => {
  beforeEach(() => {
    sent.length = 0
    shared = room(TABLE, [START])
  })

  it('offers a guesser All and Team, and a spymaster the spymaster room', () => {
    expect(readable()).toEqual(['all', 'team'])
    shared = room(ASSPY, [START])
    expect(readable()).toEqual(['all', 'team', 'spymasters'])
  })

  it('lets a spymaster mid-game write only to the other spymasters', () => {
    shared = room(ASSPY, [START])
    expect(writable('spymasters')).toBe(true)
    expect(writable('all')).toBe(false)
    expect(writable('team')).toBe(false)
    expect(whyLocked('all')).toBe('Spymasters can only talk to each other')
  })

  it('addresses a team message to that team and nobody else', () => {
    say('team', 'they mean the fruit')
    expect(sent.map(s => s.to).sort()).toEqual(['mate', 'rs'])
  })

  it('addresses a spymaster message to both spymasters', () => {
    shared = room(ASSPY, [START])
    say('spymasters', 'that was a terrible clue')
    expect(sent.map(s => s.to).sort()).toEqual(['bs'])
  })

  it('sends All to everyone else', () => {
    say('all', 'hello')
    expect(sent.map(s => s.to).sort()).toEqual(['bg', 'bs', 'mate', 'rs'])
  })

  it('drops everyone to All once the game is over', () => {
    shared = room(TABLE, [START, END])
    expect(writable('all')).toBe(true)
    expect(writable('team')).toBe(false)
    expect(whyLocked('team')).toBe('Only All while the game is not running')
  })

  it('refuses to send on a channel it just said was locked', () => {
    shared = room(TABLE, [START, END])
    say('team', 'psst')
    expect(sent).toEqual([])
  })
})

describe('reading a message off its shape', () => {
  let n = 0
  const said = (channel: 'all' | 'team' | 'spymasters', team: Team | null, spymaster = false): Message => ({
    id: `m${n++}`,
    at: 0,
    from: 'a',
    channel,
    text: 'x',
    team,
    spymaster
  })

  it('blocks a run of one room together and breaks on another', () => {
    const log = [
      said('all', 'red'),
      said('team', 'red'),
      said('team', 'red'),
      said('all', 'blue'),
      said('team', 'red')
    ]
    expect(rooms(log).map(b => [b.room, b.items.length])).toEqual([
      ['all', 1],
      ['team:red', 2],
      ['all', 1],
      ['team:red', 1]
    ])
  })

  it('keeps the two teams in separate blocks', () => {
    const log = [said('team', 'red'), said('team', 'blue')]
    expect(rooms(log).map(b => b.room)).toEqual(['team:red', 'team:blue'])
  })

  it('puts opposing spymasters in one block', () => {
    const log = [said('spymasters', 'red', true), said('spymasters', 'blue', true)]
    expect(rooms(log)).toHaveLength(1)
    expect(rooms(log)[0]!.items).toHaveLength(2)
  })

  it('treats a team message from nobody in particular as All', () => {
    expect(rooms([said('team', null)])[0]!.room).toBe('all')
  })

  it('has nothing to draw for an empty log', () => {
    expect(rooms([])).toEqual([])
  })
})
