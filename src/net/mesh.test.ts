import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {MessageAction} from '@trystero-p2p/core'
import {createMesh, type MeshRoom, type Spec, type TransportName} from './mesh'
import {playerId} from './identity'
import type {Envelope} from './protocol'
import {pack} from './codec'

const ROOM = 'testroom'

/**
 * A transport that goes nowhere. Records what the mesh sent, and lets a test
 * play the other side: bring a peer up, hand an envelope back, take it away.
 */
const fakeSpec = (name: TransportName) => {
  const sent: Array<{env: Envelope; target: string[]}> = []
  let room: MeshRoom | null = null
  let onMessage: ((env: Envelope, ctx: {peerId: string}) => void) | null = null
  const peers: Record<string, RTCPeerConnection> = {}
  const closed: string[] = []

  const action = {
    send: (env: Envelope, opts?: {target?: string | string[]}) => {
      const target = opts?.target
      sent.push({env, target: target === undefined ? [] : Array.isArray(target) ? target : [target]})
      return Promise.resolve()
    },
    set onMessage(fn: (env: Envelope, ctx: {peerId: string}) => void) {
      onMessage = fn
    }
  } as unknown as MessageAction<Envelope>

  let fail: ((e: {error: string; peerId?: string}) => void) | null = null

  const spec: Spec = {
    name,
    urls: null,
    sockets: () => ({}),
    join: (_config, _roomId, hooks) => {
      fail = hooks?.onJoinError ?? null
      room = {
        makeAction: () => action,
        getPeers: () => peers,
        ping: () => Promise.resolve(1),
        leave: () => {}
      }
      return room
    }
  }

  return {
    spec,
    sent,
    fail: (error: string, peerId?: string) => fail?.({error, peerId}),
    /** Envelopes of one kind, in order. */
    of: (kind: string) => sent.filter(s => s.env.kind === kind),
    connect: (peer: string) => {
      peers[peer] = {close: () => closed.push(peer)} as unknown as RTCPeerConnection
      room?.onPeerJoin?.(peer)
    },
    closed,
    deliver: (peer: string, env: Partial<Envelope> & {from: string; kind: Envelope['kind']}) =>
      onMessage?.(
        {id: `e${Math.random()}`, to: '*', ttl: 0, body: pack(ROOM, null), ...env} as Envelope,
        {peerId: peer}
      )
  }
}

const build = (specs: ReturnType<typeof fakeSpec>[], chaos?: Parameters<typeof createMesh>[0]['chaos']) => {
  const got: Envelope[] = []
  const mesh = createMesh({
    roomId: ROOM,
    onEnvelope: env => got.push(env),
    specs: specs.map(s => s.spec),
    chaos
  })
  return {mesh, got}
}

/** A peer that has connected and said who it is, which is what names the link. */
const introduce = (fake: ReturnType<typeof fakeSpec>, peer: string, who: string) => {
  fake.connect(peer)
  fake.deliver(peer, {from: who, kind: 'id'})
}

describe('sending on every link', () => {
  beforeEach(() => vi.useFakeTimers())

  it('puts an intent on both links to a peer, and a chat on one', () => {
    const a = fakeSpec('nostr')
    const b = fakeSpec('torrent')
    const {mesh} = build([a, b])

    introduce(a, 'pa', 'B')
    introduce(b, 'pb', 'B')

    mesh.send('intent', {kind: 'pass'}, 'B')
    expect(a.of('intent')).toHaveLength(1)
    expect(b.of('intent')).toHaveLength(1)
    expect(a.of('intent')[0]!.env.id).toBe(b.of('intent')[0]!.env.id)

    mesh.send('chat', {text: 'hi'}, 'B')
    expect(a.of('chat').length + b.of('chat').length).toBe(1)
  })

  it('hands the same envelope to the room only once', () => {
    const a = fakeSpec('nostr')
    const b = fakeSpec('torrent')
    const {mesh, got} = build([a, b])
    introduce(a, 'pa', 'B')
    introduce(b, 'pb', 'B')

    const twice: Envelope = {
      id: 'same',
      from: 'B',
      to: playerId,
      ttl: 0,
      kind: 'chat',
      body: pack(ROOM, {text: 'once'})
    }
    a.deliver('pa', twice)
    b.deliver('pb', twice)

    expect(got.filter(e => e.id === 'same')).toHaveLength(1)
    expect(mesh.report().router.dropped).toBe(1)
  })
})

describe('link liveness', () => {
  beforeEach(() => vi.useFakeTimers())

  it('answers a ping on the link it came in on', () => {
    const a = fakeSpec('nostr')
    build([a])
    introduce(a, 'pa', 'B')

    a.deliver('pa', {from: 'B', kind: 'ping', id: 'ping-1'})
    const pong = a.of('pong')[0]
    expect(pong).toBeDefined()
    expect(pong!.target).toEqual(['pa'])
  })

  it('drops a link that stops answering, and closes it so the transport re-signals', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])
    introduce(a, 'pa', 'B')
    expect(mesh.peers()).toEqual(['B'])

    // Four intervals with nothing coming back.
    vi.advanceTimersByTime(2_000 * 5)

    expect(mesh.peers()).toEqual([])
    expect(a.closed).toEqual(['pa'])
  })

  it('keeps a link that answers', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])
    introduce(a, 'pa', 'B')

    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(2_000)
      a.deliver('pa', {from: 'B', kind: 'pong'})
    }
    expect(mesh.peers()).toEqual(['B'])
  })

  it('prefers the link that most recently carried something', () => {
    const stale = fakeSpec('nostr')
    const fresh = fakeSpec('torrent')
    const {mesh} = build([stale, fresh])

    introduce(stale, 'pa', 'B')
    vi.advanceTimersByTime(500)
    introduce(fresh, 'pb', 'B')

    mesh.send('chat', {text: 'hi'}, 'B')
    expect(fresh.of('chat')).toHaveLength(1)
    expect(stale.of('chat')).toHaveLength(0)
  })
})

describe('messages with nowhere to go', () => {
  beforeEach(() => vi.useFakeTimers())

  it('holds one until a route appears, then sends it', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])

    mesh.send('hello', {name: 'Wren'}, 'HOST')
    expect(a.of('hello')).toHaveLength(0)
    expect(mesh.heldCount()).toBe(1)

    introduce(a, 'pa', 'HOST')
    expect(a.of('hello')).toHaveLength(1)
    expect(mesh.heldCount()).toBe(0)
  })

  it('gives up on one nobody ever came for', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])

    mesh.send('hello', {name: 'Wren'}, 'HOST')
    vi.advanceTimersByTime(16_000)
    expect(mesh.heldCount()).toBe(0)

    introduce(a, 'pa', 'HOST')
    expect(a.of('hello')).toHaveLength(0)
  })
})

describe('a peer with no direct link', () => {
  beforeEach(() => vi.useFakeTimers())

  it('sends to everyone it has, for them to pass on', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])
    introduce(a, 'pa', 'B')
    introduce(a, 'pb', 'C')

    mesh.send('ack', {id: 'x'}, 'HOST')
    expect(mesh.heldCount()).toBe(0)
    expect(a.of('ack')).toHaveLength(1)
    expect(a.of('ack')[0]!.target.sort()).toEqual(['pa', 'pb'])
    expect(a.of('ack')[0]!.env.to).toBe('HOST')
  })

  it('passes on what someone else addressed to a peer it cannot see either', () => {
    const a = fakeSpec('nostr')
    const {mesh, got} = build([a])
    introduce(a, 'pa', 'B')
    introduce(a, 'pb', 'C')

    a.deliver('pa', {from: 'B', to: 'HOST', kind: 'intent', ttl: 3})
    expect(got).toHaveLength(0)
    expect(a.of('intent')).toHaveLength(1)
    expect(a.of('intent')[0]!.target).toEqual(['pb'])
    expect(a.of('intent')[0]!.env.ttl).toBe(2)
    expect(mesh.report().router.forwarded).toBe(1)
  })

  it('still prefers the direct link once there is one', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])
    introduce(a, 'pa', 'B')
    introduce(a, 'ph', 'HOST')

    mesh.send('presence', {kind: 'here'}, 'HOST')
    expect(a.of('presence')[0]!.target).toEqual(['ph'])
  })
})

describe('who is on the other end of a link', () => {
  beforeEach(() => vi.useFakeTimers())

  it('does not take the name off a message the peer was only passing along', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])
    introduce(a, 'pa', 'B')

    // B forwards something of C's: same link, someone else's name on it.
    a.deliver('pa', {from: 'C', kind: 'state', ttl: 3})
    expect(mesh.peers()).toEqual(['B'])
  })

  it('keeps two links apart when each is relaying for the other', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])
    introduce(a, 'pa', 'B')
    introduce(a, 'pb', 'C')

    a.deliver('pa', {from: 'C', kind: 'state', ttl: 3})
    a.deliver('pb', {from: 'B', kind: 'state', ttl: 3})
    expect(mesh.peers().sort()).toEqual(['B', 'C'])
  })

  it('learns a name from a pong when the introduction went missing', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])
    a.connect('pa')
    expect(mesh.peers()).toEqual([])

    a.deliver('pa', {from: 'B', kind: 'pong'})
    expect(mesh.peers()).toEqual(['B'])
  })
})

describe('a peer ICE cannot reach', () => {
  beforeEach(() => vi.useFakeTimers())

  it('counts the peer without failing the transport', () => {
    const a = fakeSpec('mqtt')
    const {mesh} = build([a])
    introduce(a, 'pa', 'B')

    a.fail('could not connect to peer pz after exchanging SDP; check your TURN', 'pz')

    const t = mesh.report().transports[0]!
    expect(t.status).toBe('ready')
    expect(t.error).toBeNull()
    expect(t.unreachable).toBe(1)
  })

  it('still fails the transport when nothing named a peer', () => {
    const a = fakeSpec('mqtt')
    const {mesh} = build([a])

    a.fail('no relay accepted the room')

    const t = mesh.report().transports[0]!
    expect(t.status).toBe('failed')
    expect(t.error).toBe('no relay accepted the room')
  })

  it('forgets the peer once it does connect', () => {
    const a = fakeSpec('mqtt')
    const {mesh} = build([a])

    a.fail('could not connect to peer pa after exchanging SDP', 'pa')
    expect(mesh.report().transports[0]!.unreachable).toBe(1)

    introduce(a, 'pa', 'B')
    expect(mesh.report().transports[0]!.unreachable).toBe(0)
  })
})

describe('chaos', () => {
  beforeEach(() => vi.useFakeTimers())

  it('drops what it is told to drop', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a], {drop: 1})
    introduce(a, 'pa', 'B')

    mesh.send('chat', {text: 'hi'}, 'B')
    expect(a.of('chat')).toHaveLength(0)
  })

  it('never joins a transport it is told to kill', () => {
    const a = fakeSpec('nostr')
    const b = fakeSpec('torrent')
    const {mesh} = build([a, b], {kill: ['nostr']})
    introduce(b, 'pb', 'B')

    mesh.send('intent', {kind: 'pass'}, 'B')
    expect(a.sent).toHaveLength(0)
    expect(b.of('intent')).toHaveLength(1)
    expect(mesh.report().transports.map(t => t.name)).toEqual(['torrent'])
  })
})

describe('getting through a lossy wire', () => {
  beforeEach(() => vi.useFakeTimers())

  it('keeps holding a message while there is still no route', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a])

    mesh.send('intent', {kind: 'pass'}, 'HOST')
    vi.advanceTimersByTime(5_000)
    expect(mesh.heldCount()).toBe(1)

    introduce(a, 'pa', 'HOST')
    expect(a.of('intent')).toHaveLength(1)
  })

  it('still reaches a peer when one of two transports is dead', () => {
    const dead = fakeSpec('nostr')
    const alive = fakeSpec('torrent')
    const {mesh} = build([dead, alive])

    introduce(dead, 'pa', 'B')
    introduce(alive, 'pb', 'B')

    // The nostr link stops answering; the torrent one keeps up.
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(2_000)
      alive.deliver('pb', {from: 'B', kind: 'pong'})
    }

    expect(mesh.peers()).toEqual(['B'])
    const before = alive.of('intent').length
    mesh.send('intent', {kind: 'pass'}, 'B')
    expect(alive.of('intent')).toHaveLength(before + 1)
  })

  it('loses roughly what it is told to lose, and no more', () => {
    const a = fakeSpec('nostr')
    const {mesh} = build([a], {drop: 0.5})
    introduce(a, 'pa', 'B')

    for (let i = 0; i < 400; i++) mesh.send('chat', {text: i}, 'B')

    const got = a.of('chat').length
    expect(got).toBeGreaterThan(140)
    expect(got).toBeLessThan(260)
  })
})
