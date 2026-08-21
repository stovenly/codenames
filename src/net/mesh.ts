import {joinRoom as joinNostr, getRelaySockets as nostrSockets} from '@trystero-p2p/nostr'
import {joinRoom as joinMqtt, getRelaySockets as mqttSockets} from '@trystero-p2p/mqtt'
import {joinRoom as joinTorrent, getRelaySockets as torrentSockets} from '@trystero-p2p/torrent'
import type {JoinRoomConfig, MessageAction, Room} from '@trystero-p2p/core'
import {MQTT_RELAYS, NOSTR_RELAYS, REDUNDANCY, TORRENT_RELAYS} from '../data/relays'
import {OPEN_RELAY, RTC_CONFIG} from './ice'
import {newEnvelopeId, playerId} from './identity'
import {APP_ID, TTL_DEFAULT, type Envelope, type MessageKind, type PlayerId} from './protocol'
import {pack, unpack} from './codec'

export type TransportName = 'nostr' | 'mqtt' | 'torrent'

type Spec = {
  name: TransportName
  join: typeof joinNostr
  sockets: () => Record<string, WebSocket>
  urls: string[] | null
}

const SPECS: Spec[] = [
  {name: 'nostr', join: joinNostr, sockets: nostrSockets, urls: NOSTR_RELAYS},
  {name: 'mqtt', join: joinMqtt, sockets: mqttSockets, urls: MQTT_RELAYS},
  {name: 'torrent', join: joinTorrent, sockets: torrentSockets, urls: TORRENT_RELAYS}
]

/**
 * A public relay refusing us is normal and already visible in the diagnostics
 * panel, so Trystero's own console warnings are noise that hides real errors.
 */
const relayConfig = (spec: Spec) => ({
  ...(spec.urls ? {urls: spec.urls} : {redundancy: REDUNDANCY}),
  warnOnRelayFailure: false
})

export type TransportReport = {
  name: TransportName
  status: 'connecting' | 'ready' | 'failed'
  error: string | null
  relaysOpen: number
  relaysTotal: number
  peers: number
}

export type PeerReport = {
  playerId: PlayerId
  transports: TransportName[]
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
}

type Link = {
  transport: TransportName
  peerId: string
  playerId: PlayerId | null
  since: number
}

type Live = {
  spec: Spec
  room: Room | null
  action: MessageAction<Envelope> | null
  status: TransportReport['status']
  error: string | null
}

const SEEN_SWEEP_MS = 10_000
const SEEN_TTL_MS = 30_000

const linkKey = (transport: TransportName, peerId: string) => `${transport}:${peerId}`

export type Mesh = ReturnType<typeof createMesh>

export const createMesh = (opts: {
  roomId: string
  onEnvelope: (env: Envelope, body: unknown) => void
  onChange?: () => void
}) => {
  const {roomId, onEnvelope, onChange} = opts

  const lives: Live[] = []
  const links = new Map<string, Link>()
  const seen = new Map<string, number>()
  const rtt = new Map<PlayerId, number>()
  const counters = {sent: 0, received: 0, forwarded: 0, dropped: 0}
  let peerStats = new Map<PlayerId, {ice: string; relayed: boolean}>()
  let closed = false

  const changed = () => onChange?.()

  const baseConfig: JoinRoomConfig = {
    appId: APP_ID,
    rtcConfig: RTC_CONFIG,
    turnConfig: OPEN_RELAY
  }

  const identified = () => {
    const byPlayer = new Map<PlayerId, Link[]>()
    for (const link of links.values()) {
      if (!link.playerId || link.playerId === playerId) continue
      const list = byPlayer.get(link.playerId)
      if (list) list.push(link)
      else byPlayer.set(link.playerId, [link])
    }
    for (const list of byPlayer.values()) list.sort((a, b) => a.since - b.since)
    return byPlayer
  }

  /** One preferred link per named peer, plus every link we cannot yet name. */
  const outbound = (exclude?: {player?: PlayerId | null; link?: string}) => {
    const targets = new Map<TransportName, string[]>()
    const push = (link: Link) => {
      if (exclude?.link === linkKey(link.transport, link.peerId)) return
      const list = targets.get(link.transport)
      if (list) list.push(link.peerId)
      else targets.set(link.transport, [link.peerId])
    }

    for (const [id, list] of identified()) {
      if (exclude?.player && exclude.player === id) continue
      push(list[0]!)
    }
    for (const link of links.values()) {
      if (!link.playerId) push(link)
    }
    return targets
  }

  const emit = (env: Envelope, targets: Map<TransportName, string[]>) => {
    for (const live of lives) {
      const peers = targets.get(live.spec.name)
      if (!live.action || !peers?.length) continue
      void live.action.send(env, {target: peers}).catch(() => {})
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

    if (to === '*') {
      emit(env, outbound())
      return
    }
    const direct = identified().get(to)?.[0]
    if (direct) emit(env, new Map([[direct.transport, [direct.peerId]]]))
    else emit(env, outbound())
  }

  const receive = (transport: TransportName, raw: Envelope, fromPeer: string) => {
    if (closed || !raw || typeof raw.id !== 'string' || typeof raw.from !== 'string') return

    const key = linkKey(transport, fromPeer)
    const link = links.get(key)
    if (link && link.playerId !== raw.from) {
      link.playerId = raw.from
      changed()
    }

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
      emit({...raw, ttl: raw.ttl - 1}, outbound({player: raw.from, link: key}))
    }
  }

  /** Announce our playerId the moment a link opens, so the peer map fills before any game traffic. */
  const greet = (live: Live, peer: string) => {
    if (!live.action) return
    const env: Envelope = {
      id: newEnvelopeId(),
      from: playerId,
      to: '*',
      ttl: 0,
      kind: 'id',
      body: pack(roomId, null)
    }
    seen.set(env.id, Date.now())
    void live.action.send(env, {target: peer}).catch(() => {})
  }

  for (const spec of SPECS) {
    const live: Live = {spec, room: null, action: null, status: 'connecting', error: null}
    lives.push(live)
    try {
      const room = spec.join({...baseConfig, relayConfig: relayConfig(spec)}, roomId, {
        onJoinError: ({error}) => {
          live.status = 'failed'
          live.error = error
          changed()
        }
      })
      live.room = room
      live.action = room.makeAction<Envelope>('mesh')
      live.action.onMessage = (data, ctx) => receive(spec.name, data, ctx.peerId)

      room.onPeerJoin = peer => {
        links.set(linkKey(spec.name, peer), {
          transport: spec.name,
          peerId: peer,
          playerId: null,
          since: Date.now()
        })
        live.status = 'ready'
        greet(live, peer)
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
        peers: [...links.values()].filter(l => l.transport === live.spec.name).length
      }
    })

    const peers: PeerReport[] = [...byPlayer].map(([id, list]) => ({
      playerId: id,
      transports: list.map(l => l.transport),
      ice: peerStats.get(id)?.ice ?? 'unknown',
      relayed: peerStats.get(id)?.relayed ?? false,
      rttMs: rtt.get(id) ?? null
    }))

    return {transports, peers, router: {directPeers: byPlayer.size, ...counters} as RouterReport}
  }

  const leave = async () => {
    closed = true
    clearInterval(sweep)
    await Promise.allSettled(lives.map(l => l.room?.leave()))
  }

  return {roomId, send, peers: () => [...identified().keys()], report, refreshStats, leave}
}
