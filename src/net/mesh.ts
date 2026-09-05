import {joinRoom as joinNostr, getRelaySockets as nostrSockets} from '@trystero-p2p/nostr'
import {joinRoom as joinMqtt, getRelaySockets as mqttSockets} from '@trystero-p2p/mqtt'
import {joinRoom as joinTorrent, getRelaySockets as torrentSockets} from '@trystero-p2p/torrent'
import type {JoinRoomConfig, MessageAction} from '@trystero-p2p/core'
import {MQTT_RELAYS, NOSTR_RELAYS, REDUNDANCY, TORRENT_RELAYS} from '../data/relays'
import {OPEN_RELAY, RTC_CONFIG} from './ice'
import {newEnvelopeId, playerId} from './identity'
import {APP_ID, TTL_DEFAULT, type Envelope, type MessageKind, type PlayerId} from './protocol'
import {pack, unpack} from './codec'

export type TransportName = 'nostr' | 'mqtt' | 'torrent'

/**
 * The part of a Trystero room this file uses. Narrowed to a structural type so
 * the mesh can be handed fake transports in a test and never load a real one.
 */
export type MeshRoom = {
  makeAction: (namespace: string) => MessageAction<Envelope>
  getPeers: () => Record<string, RTCPeerConnection>
  ping: (peerId: string) => Promise<number>
  leave: () => unknown
  onPeerJoin?: (peerId: string) => void
  onPeerLeave?: (peerId: string) => void
}

export type Spec = {
  name: TransportName
  join: (
    config: JoinRoomConfig,
    roomId: string,
    hooks?: {onJoinError: (e: {error: string; peerId?: string}) => void}
  ) => MeshRoom
  sockets: () => Record<string, WebSocket>
  urls: string[] | null
}

/** The real three. Cast because MeshRoom is deliberately a subset of Room. */
const SPECS: Spec[] = [
  {name: 'nostr', join: joinNostr as unknown as Spec['join'], sockets: nostrSockets, urls: NOSTR_RELAYS},
  {name: 'mqtt', join: joinMqtt as unknown as Spec['join'], sockets: mqttSockets, urls: MQTT_RELAYS},
  {name: 'torrent', join: joinTorrent as unknown as Spec['join'], sockets: torrentSockets, urls: TORRENT_RELAYS}
]

/**
 * A public relay refusing us is normal and already visible in the diagnostics
 * panel, so Trystero's own console warnings are noise that hides real errors.
 */
const relayConfig = (spec: Spec) => ({
  ...(spec.urls ? {urls: spec.urls} : {redundancy: REDUNDANCY}),
  warnOnRelayFailure: false
})

/**
 * Sent on every link to the peer rather than the best one.
 *
 * A link whose ICE has quietly failed stays in the map until the channel
 * closes, which for a dead NAT mapping can be a long time or never, and
 * everything addressed to that player falls into it while a healthy link on
 * another transport sits idle. Duplicates are already dropped by envelope id,
 * so the second copy costs a few hundred bytes and closes that hole.
 *
 * Presence and chat are left out: they are frequent, and losing one costs a
 * marker or a line rather than the game.
 */
const REDUNDANT: ReadonlySet<MessageKind> = new Set<MessageKind>([
  'hello',
  'welcome',
  'state',
  'intent',
  'ack',
  'handoff',
  'claim',
  'resync',
  'words'
])

const SEEN_SWEEP_MS = 10_000
const SEEN_TTL_MS = 30_000

/** A link answers this often, and is dead after missing this many in a row. */
/** Sent on one link and never forwarded, so the sender is who is on the other end. */
const DIRECT: ReadonlySet<MessageKind> = new Set<MessageKind>(['id', 'ping', 'pong'])

const PING_MS = 2_000
/** A twin is reported for this long after it last pinged us, a few beats past its death. */
const TWIN_WINDOW_MS = 9_000
const PING_DEAD_AFTER = 3

/** How long a message with nowhere to go waits for a route to appear. */
const HOLD_MS = 15_000

/**
 * Dev-only sabotage, so the recovery paths can be exercised instead of assumed.
 * Never read outside a development build.
 */
export type Chaos = {
  /** 0..1 of envelopes dropped as they are sent. */
  drop?: number
  /** Milliseconds added to every send, give or take half. */
  delay?: number
  /** Transports that are never joined at all. */
  kill?: TransportName[]
}

const linkKey = (transport: TransportName, peerId: string) => `${transport}:${peerId}`

type Link = {
  transport: TransportName
  peerId: string
  playerId: PlayerId | null
  since: number
  /** When anything last arrived over this link. */
  heard: number
  /** Pings sent since the last thing heard back. */
  missed: number
}

type Live = {
  spec: Spec
  room: MeshRoom | null
  action: MessageAction<Envelope> | null
  status: TransportReport['status']
  error: string | null
  /** Peers this transport exchanged SDP with and still could not reach. */
  unreachable: Set<string>
}

type Held = {env: Envelope; to: PlayerId | '*'; wide: boolean; until: number}

export type TransportReport = {
  name: TransportName
  status: 'connecting' | 'ready' | 'failed'
  error: string | null
  relaysOpen: number
  relaysTotal: number
  peers: number
  /** Peers signalling reached but ICE could not, which is a NAT away, not a broken transport. */
  unreachable: number
}

export type LinkReport = {name: TransportName; heardMsAgo: number; missed: number}

export type PeerReport = {
  playerId: PlayerId
  transports: LinkReport[]
  ice: string
  relayed: boolean
  rttMs: number | null
}

export type RouterReport = {
  directPeers: number
  sent: number
  received: number
  forwarded: number
  dropped: number
  held: number
}

export type Mesh = ReturnType<typeof createMesh>

export const createMesh = (opts: {
  roomId: string
  onEnvelope: (env: Envelope, body: unknown) => void
  onChange?: () => void
  specs?: Spec[]
  chaos?: Chaos
}) => {
  const {roomId, onEnvelope, onChange, specs = SPECS, chaos} = opts

  const lives: Live[] = []
  const links = new Map<string, Link>()
  const seen = new Map<string, number>()
  const rtt = new Map<PlayerId, number>()
  const held: Held[] = []
  const counters = {sent: 0, received: 0, forwarded: 0, dropped: 0}
  let peerStats = new Map<PlayerId, {ice: string; relayed: boolean}>()
  let closed = false
  /** When a link last introduced itself with our own id: another tab holding this seat. */
  let twinAt = 0

  const changed = () => onChange?.()

  const baseConfig: JoinRoomConfig = {
    appId: APP_ID,
    rtcConfig: RTC_CONFIG,
    turnConfig: OPEN_RELAY
  }

  /**
   * Links to each named peer, freshest first — the one that most recently
   * carried something, rather than the one that has merely existed longest.
   */
  const identified = () => {
    const byPlayer = new Map<PlayerId, Link[]>()
    for (const link of links.values()) {
      if (!link.playerId || link.playerId === playerId) continue
      const list = byPlayer.get(link.playerId)
      if (list) list.push(link)
      else byPlayer.set(link.playerId, [link])
    }
    for (const list of byPlayer.values()) list.sort((a, b) => b.heard - a.heard)
    return byPlayer
  }

  const outbound = (exclude?: {player?: PlayerId | null; link?: string}, everyLink = false) => {
    const targets = new Map<TransportName, string[]>()
    const push = (link: Link) => {
      if (exclude?.link === linkKey(link.transport, link.peerId)) return
      const list = targets.get(link.transport)
      if (list) list.push(link.peerId)
      else targets.set(link.transport, [link.peerId])
    }

    for (const [id, list] of identified()) {
      if (exclude?.player && exclude.player === id) continue
      if (everyLink) list.forEach(push)
      else push(list[0]!)
    }
    for (const link of links.values()) {
      if (!link.playerId) push(link)
    }
    return targets
  }

  const deliver = (env: Envelope, targets: Map<TransportName, string[]>) => {
    for (const live of lives) {
      const peers = targets.get(live.spec.name)
      if (!live.action || !peers?.length) continue
      void live.action.send(env, {target: peers}).catch(() => {})
    }
  }

  const emit = (env: Envelope, targets: Map<TransportName, string[]>) => {
    if (!chaos) return deliver(env, targets)
    if (chaos.drop && Math.random() < chaos.drop) return
    if (chaos.delay) {
      const jitter = chaos.delay * (0.5 + Math.random())
      setTimeout(() => !closed && deliver(env, targets), jitter)
      return
    }
    deliver(env, targets)
  }

  const routeFor = (to: PlayerId | '*', wide: boolean) => {
    if (to === '*') return outbound(undefined, wide)
    const list = identified().get(to)
    // No link to them is not no route: every peer forwards, so it goes to
    // everyone we have and arrives by whoever can reach them.
    if (!list?.length) return outbound(undefined, wide)
    const chosen = wide ? list : [list[0]!]
    const targets = new Map<TransportName, string[]>()
    for (const link of chosen) {
      const at = targets.get(link.transport)
      if (at) at.push(link.peerId)
      else targets.set(link.transport, [link.peerId])
    }
    return targets
  }

  /** Anything held that now has somewhere to go; anything too old is dropped. */
  const flush = () => {
    if (!held.length) return
    const now = Date.now()
    for (let i = held.length - 1; i >= 0; i--) {
      const item = held[i]!
      if (item.until < now) {
        held.splice(i, 1)
        counters.dropped++
        continue
      }
      const targets = routeFor(item.to, item.wide)
      if (!targets.size) continue
      held.splice(i, 1)
      emit(item.env, targets)
    }
  }

  const send = (kind: MessageKind, body: unknown, to: PlayerId | '*' = '*', ttl = TTL_DEFAULT) => {
    if (closed) return
    const env: Envelope = {
      id: newEnvelopeId(),
      from: playerId,
      to,
      ttl,
      kind,
      body: pack(roomId, body)
    }
    seen.set(env.id, Date.now())
    counters.sent++

    const wide = REDUNDANT.has(kind)
    const targets = routeFor(to, wide)

    // Nowhere to send it yet. Holding it is the difference between a joiner
    // whose hello arrives late and one the room never learns about.
    if (!targets.size) {
      held.push({env, to, wide, until: Date.now() + HOLD_MS})
      return
    }
    emit(env, targets)
  }

  const onOwnLink = (live: Live, peer: string, env: Envelope) => {
    if (!live.action) return
    seen.set(env.id, Date.now())
    void live.action.send(env, {target: peer}).catch(() => {})
  }

  const bare = (kind: MessageKind, body: unknown = null): Envelope => ({
    id: newEnvelopeId(),
    from: playerId,
    to: '*',
    ttl: 0,
    kind,
    body: pack(roomId, body)
  })

  const receive = (transport: TransportName, raw: Envelope, fromPeer: string) => {
    if (closed || !raw || typeof raw.id !== 'string' || typeof raw.from !== 'string') return

    const key = linkKey(transport, fromPeer)
    const link = links.get(key)
    if (link) {
      link.heard = Date.now()
      link.missed = 0
      // Only link-level traffic names a link. Everything else may have been
      // forwarded on somebody else's behalf, and taking the sender's name off
      // one of those relabels the link with whoever the flood came from.
      if (DIRECT.has(raw.kind) && raw.from === playerId) twinAt = Date.now()
      if (DIRECT.has(raw.kind) && link.playerId !== raw.from) {
        link.playerId = raw.from
        // A link that just got a name may be the route something is waiting on.
        flush()
        changed()
      }
    }

    // Link-level traffic. It proves the link is alive, which is the whole job,
    // and it is neither passed to the room nor forwarded anywhere.
    if (raw.kind === 'ping') {
      const live = lives.find(l => l.spec.name === transport)
      if (live) onOwnLink(live, fromPeer, {...bare('pong', raw.id), to: raw.from})
      return
    }
    if (raw.kind === 'pong') return

    if (seen.has(raw.id)) {
      counters.dropped++
      return
    }
    seen.set(raw.id, Date.now())
    counters.received++

    if (raw.to === playerId || raw.to === '*') {
      if (raw.kind !== 'id') onEnvelope(raw, unpack<unknown>(roomId, raw.body))
    }

    if (raw.ttl > 0 && raw.to !== playerId) {
      counters.forwarded++
      emit({...raw, ttl: raw.ttl - 1}, outbound({player: raw.from, link: key}, REDUNDANT.has(raw.kind)))
    }
  }

  /** Announce our playerId the moment a link opens, so the peer map fills before any game traffic. */
  const greet = (live: Live, peer: string) => onOwnLink(live, peer, bare('id'))

  /**
   * A link that has stopped answering is closed rather than left in the map.
   * Closing the connection is what makes Trystero notice and re-signal; simply
   * forgetting it leaves the corpse holding the peer slot.
   */
  const drop = (link: Link) => {
    links.delete(linkKey(link.transport, link.peerId))
    const live = lives.find(l => l.spec.name === link.transport)
    try {
      live?.room?.getPeers()[link.peerId]?.close()
    } catch {
      /* already gone */
    }
    changed()
  }

  for (const spec of specs) {
    if (chaos?.kill?.includes(spec.name)) continue
    const live: Live = {
      spec,
      room: null,
      action: null,
      status: 'connecting',
      error: null,
      unreachable: new Set()
    }
    lives.push(live)
    try {
      const room = spec.join({...baseConfig, relayConfig: relayConfig(spec)} as JoinRoomConfig, roomId, {
        // A named peer means one pair could not traverse its NAT, which says
        // nothing about the transport: the other transports, or a relayed hop
        // through another player, still reach them.
        onJoinError: ({error, peerId}) => {
          if (peerId) live.unreachable.add(peerId)
          else {
            live.status = 'failed'
            live.error = error
          }
          changed()
        }
      })
      live.room = room
      live.action = room.makeAction('mesh')
      live.action.onMessage = (data, ctx) => receive(spec.name, data, ctx.peerId)

      room.onPeerJoin = peer => {
        live.unreachable.delete(peer)
        links.set(linkKey(spec.name, peer), {
          transport: spec.name,
          peerId: peer,
          playerId: null,
          since: Date.now(),
          heard: Date.now(),
          missed: 0
        })
        live.status = 'ready'
        greet(live, peer)
        flush()
        changed()
      }

      room.onPeerLeave = peer => {
        links.delete(linkKey(spec.name, peer))
        changed()
      }
    } catch (err) {
      live.status = 'failed'
      live.error = err instanceof Error ? err.message : String(err)
    }
  }

  const sweep = setInterval(() => {
    const cutoff = Date.now() - SEEN_TTL_MS
    for (const [id, at] of seen) if (at < cutoff) seen.delete(id)
  }, SEEN_SWEEP_MS)

  const heartbeat = setInterval(() => {
    if (closed) return
    for (const link of [...links.values()]) {
      if (link.missed > PING_DEAD_AFTER) {
        drop(link)
        continue
      }
      link.missed++
      const live = lives.find(l => l.spec.name === link.transport)
      if (live) onOwnLink(live, link.peerId, bare('ping'))
    }
    flush()
  }, PING_MS)

  const refreshStats = async () => {
    const next = new Map<PlayerId, {ice: string; relayed: boolean}>()
    for (const live of lives) {
      if (!live.room) continue
      for (const [peer, pc] of Object.entries(live.room.getPeers())) {
        const id = links.get(linkKey(live.spec.name, peer))?.playerId
        if (!id || next.has(id)) continue

        let relayed = false
        try {
          const stats = await pc.getStats()
          stats.forEach(entry => {
            if (entry.type !== 'candidate-pair' || !entry.nominated || entry.state !== 'succeeded') return
            const local = stats.get(entry.localCandidateId) as {candidateType?: string} | undefined
            if (local?.candidateType === 'relay') relayed = true
          })
        } catch {
          /* stats are diagnostics only */
        }
        next.set(id, {ice: pc.iceConnectionState, relayed})

        try {
          rtt.set(id, await live.room.ping(peer))
        } catch {
          /* peer may have gone mid-ping */
        }
      }
    }
    peerStats = next
    changed()
  }

  const report = () => {
    const byPlayer = identified()
    const now = Date.now()

    const transports: TransportReport[] = lives.map(live => {
      let open = 0
      try {
        open = Object.values(live.spec.sockets()).filter(s => s?.readyState === 1).length
      } catch {
        /* transport has not opened any socket yet */
      }
      return {
        name: live.spec.name,
        status: live.status,
        error: live.error,
        relaysOpen: open,
        relaysTotal: live.spec.urls?.length ?? REDUNDANCY,
        peers: [...links.values()].filter(l => l.transport === live.spec.name).length,
        unreachable: live.unreachable.size
      }
    })

    const peers: PeerReport[] = [...byPlayer].map(([id, list]) => ({
      playerId: id,
      transports: list.map(l => ({name: l.transport, heardMsAgo: now - l.heard, missed: l.missed})),
      ice: peerStats.get(id)?.ice ?? 'unknown',
      relayed: peerStats.get(id)?.relayed ?? false,
      rttMs: rtt.get(id) ?? null
    }))

    return {
      transports,
      peers,
      router: {directPeers: byPlayer.size, ...counters, held: held.length} as RouterReport,
      twin: now - twinAt < TWIN_WINDOW_MS
    }
  }

  const leave = async () => {
    closed = true
    clearInterval(sweep)
    clearInterval(heartbeat)
    await Promise.allSettled(lives.map(l => l.room?.leave()))
  }

  return {
    roomId,
    send,
    peers: () => [...identified().keys()],
    heldCount: () => held.length,
    report,
    refreshStats,
    leave
  }
}
