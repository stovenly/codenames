import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {Envelope} from '../net/protocol'
import type {Step} from '../game/steps'
import {PACE} from './pace'

/**
 * The handful of browser globals room.ts touches on the way in. Stubbed rather
 * than pulling in a DOM, because the room is not a DOM thing — it reads whether
 * the tab is visible and remembers a session, and that is the whole of it.
 */
const store = new Map<string, string>()
vi.stubGlobal('document', {
  hidden: false,
  addEventListener: () => {},
  documentElement: {setAttribute: () => {}, removeAttribute: () => {}}
})
vi.stubGlobal('addEventListener', () => {})
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k)
})
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
})
vi.stubGlobal('Worker', class {
  onmessage: unknown = null
  postMessage() {}
  terminate() {}
})

type Sent = {kind: string; body: unknown; to: string}

const sent: Sent[] = []
const handlers = new Map<string, (body: unknown, env: Envelope) => void>()
let livePeers: string[] = []

vi.mock('./net', () => ({
  self: 'me',
  roomId: 'r',
  joinedExisting: true,
  openRoom: () => 'r',
  startMesh: () => {},
  peers: () => livePeers,
  lastHeardFrom: () => 0,
  on: (kind: string, fn: (body: unknown, env: Envelope) => void) => {
    handlers.set(kind, fn)
  },
  send: (kind: string, body: unknown, to = '*') => sent.push({kind, body, to}),
  subscribe: () => () => {}
}))
vi.mock('./words', () => ({
  get: () => Array.from({length: 80}, (_, i) => `W${i}`),
  have: () => true,
  useWords: () => {},
  resolve: () => Promise.resolve({hash: 'h', words: []}),
  put: () => {},
  rememberSource: () => {},
  lastSource: () => null
}))
vi.mock('../net/identity', () => ({
  playerId: 'me',
  newRoomId: () => `id-${count++}`,
  newEnvelopeId: () => `env-${count++}`,
  rememberSeat: () => {},
  startSeatClaim: () => {},
  sha256Hex: () => Promise.resolve('hash'),
  shareLink: () => '',
  offeredSeat: () => null,
  resumedSeat: false,
  takeSeat: () => {},
  abandonSeat: () => {}
}))

let count = 0

/**
 * The room is one module holding one game, which is right for a tab and wrong
 * for a suite: pending moves and an adopted state would carry from test to
 * test, and adopt refuses anything older than what it already has. Each test
 * gets the module fresh.
 */
type Room = typeof import('./room')
let room: Room

const load = async () => {
  vi.resetModules()
  handlers.clear()
  sent.length = 0
  livePeers = []
  room = await import('./room')
  room.start()
}

const deliver = (kind: string, body: unknown, from = 'host') =>
  handlers.get(kind)?.(body, {from} as Envelope)

/**
 * Time passing with the host still there. Advancing in one jump instead would
 * take the room past the missing-host window and into an election, which is a
 * different test.
 */
const tick = (ms: number) => {
  for (let left = ms; left > 0; left -= 1_000) {
    vi.advanceTimersByTime(Math.min(1_000, left))
    deliver('beat', {version: 5, hostId: 'host', hostEpoch: 1, hostHidden: false}, 'host')
  }
}

/** Acknowledge everything outstanding, so a test starts with a quiet queue. */
const settle = () => {
  for (const s of sent.filter(s => s.kind === 'intent')) {
    deliver('ack', {id: (s.body as {id: string}).id})
  }
}

/**
 * A room where we are a client and `host` is in charge. Adopting a state we are
 * named in makes the room announce our avatar, which is a move like any other —
 * acknowledged here so it is not still in the queue when a test looks.
 */
const FULL = {
  version: 5,
  hostId: 'host',
  hostEpoch: 1,
  hostHidden: false,
  hostDegraded: false,
  roster: ['host', 'me'],
  sentAt: Date.now(),
  players: [
    {id: 'host', name: 'Host', team: 'red', spymaster: true, ready: true, connected: true, avatar: {style: 'lorelei', seed: '0', bg: '141C30'}},
    {id: 'me', name: 'Me', team: 'red', spymaster: false, ready: true, connected: true, avatar: {style: 'lorelei', seed: '1', bg: '141C30'}}
  ],
  settings: {size: 5, teamCards: 8, assassins: 1, clueTimer: null, guessTimer: null, wordListHash: 'h', wordListName: 'x'},
  steps: [],
  cursor: 0,
  deadline: null
}

const asClient = async () => {
  await room.joinRoom('Me', null)
  deliver('state', {full: {...FULL, sentAt: Date.now()}})
  settle()
}

describe('a move that has to arrive', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await load()
    await asClient()
    sent.length = 0
  })

  it('goes again until it is acknowledged', () => {
    room.intend({kind: 'ready', ready: true})
    const first = sent.filter(s => s.kind === 'intent')
    expect(first).toHaveLength(1)

    const id = (first[0]!.body as {id: string}).id
    expect(id).toBeTruthy()

    tick(1_100)
    const again = sent.filter(s => s.kind === 'intent')
    expect(again).toHaveLength(2)
    // The same move, not a second one.
    expect((again[1]!.body as {id: string}).id).toBe(id)

    deliver('ack', {id})
    tick(5_000)
    expect(sent.filter(s => s.kind === 'intent')).toHaveLength(2)
  })

  it('gives up rather than trying for ever', () => {
    room.intend({kind: 'ready', ready: true})
    tick(12_000)
    const tries = sent.filter(s => s.kind === 'intent').length
    expect(tries).toBeGreaterThan(2)

    tick(10_000)
    expect(sent.filter(s => s.kind === 'intent')).toHaveLength(tries)
    expect(room.getRoom().unacked).toBeNull()
  })

  it('says so once it has been waiting a while', () => {
    expect(room.getRoom().unacked).toBeNull()
    room.intend({kind: 'ready', ready: true})
    tick(4_000)

    const waiting = room.getRoom().unacked
    expect(waiting?.count).toBe(1)
    expect(waiting?.oldestMs).toBeGreaterThan(room.ACK_WORRY_MS)
  })

  it('sends the retry to whoever is host now, not who was', () => {
    room.intend({kind: 'ready', ready: true})
    deliver('state', {
      full: {
        ...(room.getRoom().shared as object),
        hostId: 'other',
        hostEpoch: 2,
        version: 9,
        sentAt: Date.now()
      }
    }, 'other')

    vi.advanceTimersByTime(1_100)
    const last = sent.filter(s => s.kind === 'intent').at(-1)
    expect(last?.to).toBe('other')
  })
})

describe('answering a peer that has fallen behind', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await load()
    await asClient()
    sent.length = 0
  })

  it('hands over the room when we hold something newer', () => {
    deliver('resync', {want: 'state', have: {epoch: 1, version: 2}}, 'peer')
    expect(sent.filter(s => s.kind === 'state' && s.to === 'peer')).toHaveLength(1)
  })

  it('stays quiet when the asker is further ahead', () => {
    deliver('resync', {want: 'state', have: {epoch: 1, version: 99}}, 'peer')
    expect(sent.filter(s => s.kind === 'state')).toHaveLength(0)
  })

  it('says where it is when it asks', () => {
    deliver('beat', {version: 99, hostId: 'host', hostEpoch: 1}, 'host')
    const ask = sent.find(s => s.kind === 'resync')
    expect((ask?.body as {have?: {version: number}}).have?.version).toBe(5)
  })
})

describe('the clock waits for the splash', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await load()
    await asClient()
  })

  const state = (steps: Step[], cursor = steps.length) =>
    ({...(room.getRoom().shared as object), steps, cursor}) as never

  it('banks the clue splash before the guessers are on the clock', () => {
    const steps: Step[] = [
      {t: 'start', seed: 's', startTeam: 'red'},
      {t: 'clue', team: 'red', by: 'host', word: 'ORBIT', count: 2}
    ]
    expect(room.leadIn(state(steps), 1)).toBe(PACE.clue)
  })

  it('adds up a reveal and the turn band that follows it', () => {
    const steps: Step[] = [
      {t: 'start', seed: 's', startTeam: 'red'},
      {t: 'clue', team: 'red', by: 'host', word: 'ORBIT', count: 2},
      {t: 'guess', team: 'red', by: 'me', card: 0},
      {t: 'endTurn', team: 'red', reason: 'wrong'}
    ]
    const reveal = PACE.windup + PACE.landing + PACE.correct
    expect(room.leadIn(state(steps), 2)).toBe(reveal + PACE.turn)
  })

  it('does not bank anything for a rewind', () => {
    const steps: Step[] = [
      {t: 'start', seed: 's', startTeam: 'red'},
      {t: 'clue', team: 'red', by: 'host', word: 'ORBIT', count: 2}
    ]
    expect(room.leadIn(state(steps, 1), 2)).toBe(0)
  })

  it('caps a long jump rather than banking every splash in the game', () => {
    const steps: Step[] = [
      {t: 'start', seed: 's', startTeam: 'red'},
      ...Array.from({length: 12}, () => ({t: 'clue', team: 'red', by: 'host', word: 'X', count: 1}) as Step)
    ]
    expect(room.leadIn(state(steps), 0)).toBe(8_000)
  })
})

describe('who a state arriving is allowed to seat', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await load()
  })

  it('leaves a tab that has not asked to join on the landing screen', () => {
    deliver('state', {full: {...FULL}})
    expect(room.getRoom().role).toBe('idle')
  })

  it('still learns the room, so the landing screen knows what it is joining', () => {
    deliver('state', {full: {...FULL}})
    expect(room.getRoom().shared?.players).toHaveLength(2)
  })

  it('seats one that did ask', async () => {
    await room.joinRoom('Me', null)
    expect(room.getRoom().role).toBe('joining')
    deliver('state', {full: {...FULL}})
    expect(room.getRoom().role).toBe('client')
  })
})

describe('what a rewound host puts on the wire', () => {
  /** Every state message replayed the way a client applies it, deltas included. */
  const asRemote = () => {
    let steps: Step[] = []
    for (const s of sent.filter(s => s.kind === 'state')) {
      const msg = s.body as {full?: {steps: Step[]}; base?: number; add?: Step[]}
      if (msg.full) steps = msg.full.steps
      else steps = [...steps.slice(0, msg.base), ...msg.add!]
    }
    return steps
  }

  const flush = () => vi.advanceTimersByTime(100)

  const seat = (id: string, team: 'red' | 'blue', spymaster: boolean) => {
    deliver('intent', {kind: 'setName', name: id}, id)
    room.intend({kind: 'setTeam', target: id, team})
    if (spymaster) room.intend({kind: 'setSpymaster', target: id, spymaster: true})
  }

  /** Which team starts is a coin toss, so every move goes in as whoever holds the turn. */
  const asTurn = (spymaster: boolean, intent: object) => {
    const turn = room.currentView()!.turn
    const who = turn === 'red' ? (spymaster ? 'me' : 'a') : spymaster ? 'b' : 'c'
    if (who === 'me') room.intend(intent as Parameters<typeof room.intend>[0])
    else deliver('intent', intent, who)
    flush()
  }

  beforeEach(async () => {
    vi.useFakeTimers()
    await load()
    await room.createRoom('Host', null)
    room.intend({kind: 'setTeam', target: 'me', team: 'red'})
    room.intend({kind: 'setSpymaster', target: 'me', spymaster: true})
    seat('a', 'red', false)
    seat('b', 'blue', true)
    seat('c', 'blue', false)
    room.intend({kind: 'startGame'})
    flush()
    expect(room.currentView()!.phase).toBe('clue')
  })

  it('sends a clue given after an undo, not the one taken back', () => {
    asTurn(true, {kind: 'clue', word: 'FIRST', count: 2})
    room.intend({kind: 'undo'})
    flush()
    asTurn(true, {kind: 'clue', word: 'SECOND', count: 2})

    expect(room.currentView()!.clue?.word).toBe('SECOND')
    expect(asRemote()).toEqual(room.getRoom().shared!.steps)
  })

  it('sends the new deal when a game is restarted from the lobby', () => {
    const dealt = () => (room.getRoom().shared!.steps[0] as {seed: string}).seed
    asTurn(true, {kind: 'clue', word: 'CLUE', count: 2})
    const first = dealt()

    room.intend({kind: 'endGame'})
    flush()
    room.intend({kind: 'startGame'})
    flush()

    expect(dealt()).not.toBe(first)
    expect(asRemote()).toEqual(room.getRoom().shared!.steps)
  })

  it('sends the new deal when the host rewinds to the lobby instead', () => {
    const dealt = () => (room.getRoom().shared!.steps[0] as {seed: string}).seed
    asTurn(true, {kind: 'clue', word: 'CLUE', count: 2})
    const first = dealt()

    room.intend({kind: 'undo'})
    room.intend({kind: 'undo'})
    flush()
    expect(room.currentView()!.phase).toBe('setup')

    room.intend({kind: 'setTeam', target: 'me', team: 'red'})
    room.intend({kind: 'setSpymaster', target: 'me', spymaster: true})
    room.intend({kind: 'startGame'})
    flush()

    expect(dealt()).not.toBe(first)
    expect(asRemote()).toEqual(room.getRoom().shared!.steps)
  })

  it('sends a guess made after an undo, not the one taken back', () => {
    const cards = room.currentView()!.cards
    const first = cards.findIndex(c => !c.revealed)
    const second = cards.findIndex((c, i) => !c.revealed && i > first)
    asTurn(true, {kind: 'clue', word: 'CLUE', count: 3})
    asTurn(false, {kind: 'guess', card: first})
    room.intend({kind: 'undo'})
    flush()
    asTurn(false, {kind: 'guess', card: second})

    expect(asRemote()).toEqual(room.getRoom().shared!.steps)
  })
})
