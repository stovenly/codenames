import {useSyncExternalStore} from 'react'
import {sha256Hex} from '../net/identity'
import type {PlayerId} from '../net/protocol'
import type {Avatar, Player, Shared, Team} from '../game/types'
import {on, peers, roomId, self, send, startMesh, subscribe as onNetChange} from './net'

export type Role = 'idle' | 'joining' | 'rejected' | 'client' | 'host' | 'electing'

export type RoomSnapshot = {
  role: Role
  shared: Shared | null
  banner: string | null
  split: boolean
  me: PlayerId
}

/** Widened while the host advertises a hidden tab, whose timers the browser throttles. */
const MISSING_HOST_MS = 6_000
const MISSING_HOST_HIDDEN_MS = 30_000
const BEAT_MS = 2_000
const CLAIM_WINDOW_MS = 1_500
const BROADCAST_DEBOUNCE_MS = 50
const SPLIT_GRACE_MS = 10_000
const RIVAL_HOST_WINDOW_MS = 5_000

const SESSION_KEY = 'cn.session'

type Session = {roomId: string; name: string; password: string | null}

const loadSession = (): Session | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    return parsed.roomId === roomId ? parsed : null
  } catch {
    return null
  }
}

const saveSession = (patch: Partial<Session>) => {
  try {
    const next = {roomId, name: '', password: null, ...loadSession(), ...patch}
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  } catch {
    /* private mode; reconnect just loses its shortcut */
  }
}

type Claim = {playerId: PlayerId; version: number; visible: boolean; uptime: number}

const bornAt = Date.now()

const listeners = new Set<() => void>()

let role: Role = 'idle'
let shared: Shared | null = null
let banner: string | null = null
let bannerTimer: ReturnType<typeof setTimeout> | null = null
let split = false
let myName = loadSession()?.name ?? ''
let myAvatar: Avatar = {style: 'shapes', seed: self, bg: 'ink-700'}
let passwordHash: string | null = null
let lastHostAt = 0
let claims: Claim[] = []
let electionTimer: ReturnType<typeof setTimeout> | null = null
let broadcastTimer: ReturnType<typeof setTimeout> | null = null
let beatWorker: Worker | null = null
let wakeLock: WakeLockSentinel | null = null
let started = false
const strangerSince = new Map<PlayerId, number>()
const rivalHosts = new Map<PlayerId, number>()

let snapshot: RoomSnapshot = {role, shared, banner, split, me: self}

const publish = () => {
  snapshot = {role, shared, banner, split, me: self}
  listeners.forEach(l => l())
}

const flash = (text: string) => {
  banner = text
  if (bannerTimer) clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => {
    banner = null
    publish()
  }, 5000)
  publish()
}

const isHost = () => role === 'host'

const emptyPlayer = (id: PlayerId, name: string): Player => ({
  id,
  name: name || 'Agent',
  team: null,
  spymaster: false,
  ready: false,
  avatar: {style: 'shapes', seed: id, bg: 'ink-700'},
  connected: true
})

// ---------------------------------------------------------------- host side

const bump = () => {
  if (!shared) return
  shared = {...shared, version: shared.version + 1, sentAt: Date.now(), roster: [self, ...peers()]}
}

const broadcast = () => {
  if (!isHost()) return
  if (broadcastTimer) return
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    if (!isHost() || !shared) return
    bump()
    send('state', shared)
    publish()
  }, BROADCAST_DEBOUNCE_MS)
}

export const hostMutate = (fn: (draft: Shared) => Shared | void) => {
  if (!isHost() || !shared) return
  const next = fn(shared)
  if (next) shared = next
  broadcast()
}

const upsertPlayer = (id: PlayerId, patch: Partial<Player>, name?: string) => {
  hostMutate(draft => {
    const existing = draft.players.find(p => p.id === id)
    const players = existing
      ? draft.players.map(p => (p.id === id ? {...p, ...patch} : p))
      : [...draft.players, {...emptyPlayer(id, name ?? 'Agent'), ...patch}]
    return {...draft, players}
  })
}

const startBeat = () => {
  if (beatWorker) return
  beatWorker = new Worker(new URL('../net/beat.worker.ts', import.meta.url), {type: 'module'})
  beatWorker.onmessage = () => {
    if (!isHost() || !shared) return
    send('beat', {
      version: shared.version,
      hostId: shared.hostId,
      hostEpoch: shared.hostEpoch,
      hostHidden: shared.hostHidden
    })
  }
  beatWorker.postMessage({type: 'start', ms: BEAT_MS})
}

const stopBeat = () => {
  beatWorker?.postMessage({type: 'stop'})
  beatWorker?.terminate()
  beatWorker = null
}

const takeWakeLock = () => {
  navigator.wakeLock
    ?.request('screen')
    .then(lock => {
      wakeLock = lock
    })
    .catch(() => {
      /* unsupported or denied; best-effort by design */
    })
}

const releaseWakeLock = () => {
  void wakeLock?.release().catch(() => {})
  wakeLock = null
}

const becomeHost = (players: Player[], epoch: number, carry?: Partial<Shared>) => {
  role = 'host'
  shared = {
    version: (shared?.version ?? 0) + 1,
    hostId: self,
    hostEpoch: epoch,
    hostHidden: document.hidden,
    roster: [self, ...peers()],
    sentAt: Date.now(),
    players,
    ...carry
  }
  lastHostAt = Date.now()
  startBeat()
  takeWakeLock()
  send('state', shared)
  publish()
}

const demote = () => {
  if (!isHost()) return
  role = 'client'
  stopBeat()
  releaseWakeLock()
  publish()
}

// -------------------------------------------------------------- client side

const adopt = (next: Shared, why?: string) => {
  const current = shared
  const newer =
    !current ||
    next.hostEpoch > current.hostEpoch ||
    (next.hostEpoch === current.hostEpoch && next.version > current.version)

  if (!newer) return

  const hostChanged = current?.hostId !== next.hostId
  if (isHost() && next.hostId !== self) demote()

  shared = next
  lastHostAt = Date.now()
  if (role === 'joining' || role === 'electing' || role === 'rejected' || role === 'idle') {
    role = next.hostId === self ? 'host' : 'client'
  }
  if (hostChanged && current) {
    const name = next.players.find(p => p.id === next.hostId)?.name ?? 'Someone'
    flash(why ?? `${name} is hosting now`)
  }
  publish()
}

// ---------------------------------------------------------------- elections

const scoreClaim = (a: Claim, b: Claim) => {
  if (a.visible !== b.visible) return a.visible ? -1 : 1
  if (a.version !== b.version) return b.version - a.version
  if (a.uptime !== b.uptime) return b.uptime - a.uptime
  return a.playerId < b.playerId ? -1 : 1
}

const myClaim = (): Claim => ({
  playerId: self,
  version: shared?.version ?? 0,
  visible: !document.hidden,
  uptime: Date.now() - bornAt
})

const startElection = () => {
  if (role === 'electing' || isHost()) return
  role = 'electing'
  claims = [myClaim()]
  send('claim', claims[0])
  publish()

  if (electionTimer) clearTimeout(electionTimer)
  electionTimer = setTimeout(() => {
    electionTimer = null
    if (isHost() || role !== 'electing') return
    const winner = [...claims].sort(scoreClaim)[0]!
    if (winner.playerId === self) {
      const players = (shared?.players ?? []).map(p => ({...p, connected: peers().includes(p.id) || p.id === self}))
      becomeHost(players, (shared?.hostEpoch ?? 0) + 1)
      flash('You are hosting now')
    } else {
      // Wait for the winner's state; if it never lands, the liveness monitor retries.
      role = 'client'
      lastHostAt = Date.now()
      publish()
    }
  }, CLAIM_WINDOW_MS)
}

const bestSuccessor = (): PlayerId | null => {
  const connected = peers()
  if (!connected.length) return null
  return [...connected].sort((a, b) => (a < b ? -1 : 1))[0]!
}

// ----------------------------------------------------------------- monitors

const missingWindow = () => (shared?.hostHidden ? MISSING_HOST_HIDDEN_MS : MISSING_HOST_MS)

const monitor = () => {
  const now = Date.now()

  if (role === 'client' && shared && now - lastHostAt > missingWindow()) startElection()

  if (isHost()) {
    const connected = new Set(peers())
    const players = shared?.players ?? []
    if (players.some(p => p.connected !== (connected.has(p.id) || p.id === self))) {
      hostMutate(draft => ({
        ...draft,
        players: draft.players.map(p => ({...p, connected: connected.has(p.id) || p.id === self}))
      }))
    }
  }

  const roster = new Set(shared?.roster ?? [])
  let stranded = false
  for (const peer of peers()) {
    if (roster.has(peer)) {
      strandedClear(peer)
      continue
    }
    const since = strangerSince.get(peer) ?? now
    strangerSince.set(peer, since)
    if (now - since > SPLIT_GRACE_MS) stranded = true
  }

  for (const [id, at] of rivalHosts) if (now - at > RIVAL_HOST_WINDOW_MS) rivalHosts.delete(id)

  const next = stranded || rivalHosts.size > 1
  if (next !== split) {
    split = next
    publish()
  }
}

const strandedClear = (peer: PlayerId) => strangerSince.delete(peer)

// ------------------------------------------------------------------ intents

export type Intent =
  | {kind: 'setName'; name: string}
  | {kind: 'setTeam'; target: PlayerId; team: Team | null}
  | {kind: 'setSpymaster'; target: PlayerId; spymaster: boolean}
  | {kind: 'setAvatar'; avatar: Avatar}
  | {kind: 'ready'; ready: boolean}
  | {kind: 'transferHost'; target: PlayerId}

const applyIntent = (from: PlayerId, intent: Intent) => {
  if (!isHost() || !shared) return
  const isHostSender = from === shared.hostId

  switch (intent.kind) {
    case 'setName':
      upsertPlayer(from, {name: intent.name.slice(0, 24) || 'Agent'})
      return
    case 'setAvatar':
      upsertPlayer(from, {avatar: intent.avatar})
      return
    case 'ready':
      upsertPlayer(from, {ready: intent.ready})
      return
    case 'setTeam':
      if (intent.target !== from && !isHostSender) return
      upsertPlayer(intent.target, {team: intent.team})
      return
    case 'setSpymaster': {
      if (intent.target !== from && !isHostSender) return
      const team = shared.players.find(p => p.id === intent.target)?.team
      if (!team) return
      hostMutate(draft => ({
        ...draft,
        players: draft.players.map(p =>
          p.id === intent.target
            ? {...p, spymaster: intent.spymaster}
            : p.team === team && intent.spymaster
              ? {...p, spymaster: false}
              : p
        )
      }))
      return
    }
    case 'transferHost': {
      if (!isHostSender || !peers().includes(intent.target)) return
      send('handoff', {to: intent.target, epoch: shared.hostEpoch + 1})
      demote()
      return
    }
  }
}

export const intend = (intent: Intent) => {
  if (isHost()) applyIntent(self, intent)
  else send('intent', intent, shared?.hostId ?? '*')
}

// -------------------------------------------------------------------- wiring

const proofFor = async (password: string | null) =>
  password ? await sha256Hex(`${roomId}:${password}`) : null

export const start = () => {
  if (started) return
  started = true
  startMesh()

  on('hello', async (body, env) => {
    if (!isHost() || !shared) return
    const {name, proof} = (body ?? {}) as {name?: string; proof?: string | null}
    if (passwordHash && proof !== passwordHash) {
      send('reject', {reason: 'password'}, env.from)
      return
    }
    upsertPlayer(env.from, {connected: true}, name)
    send('welcome', shared, env.from)
  })

  on('welcome', body => {
    if (body) adopt(body as Shared)
  })

  on('reject', () => {
    if (role === 'client' || isHost()) return
    role = 'rejected'
    publish()
  })

  on('state', (body, env) => {
    if (!body) return
    const next = body as Shared
    rivalHosts.set(next.hostId, Date.now())
    if (isHost() && next.hostId !== self) {
      const theyWin =
        next.hostEpoch > (shared?.hostEpoch ?? 0) ||
        (next.hostEpoch === (shared?.hostEpoch ?? 0) && next.hostId < self)
      if (!theyWin) {
        broadcast()
        return
      }
      flash('Two hosts met; the room re-synced')
    }
    if (env.from !== next.hostId) return
    adopt(next)
  })

  on('beat', (body, env) => {
    const beat = (body ?? {}) as Partial<Shared>
    rivalHosts.set(env.from, Date.now())
    if (!shared || env.from !== shared.hostId) return
    lastHostAt = Date.now()
    if (beat.hostHidden !== shared.hostHidden) {
      shared = {...shared, hostHidden: !!beat.hostHidden}
      publish()
    }
    if ((beat.version ?? 0) > shared.version) send('resync', null, shared.hostId)
  })

  on('claim', body => {
    const claim = body as Claim
    if (!claim?.playerId) return
    if (isHost()) {
      broadcast()
      return
    }
    if (role !== 'electing') startElection()
    if (!claims.some(c => c.playerId === claim.playerId)) claims = [...claims, claim]
  })

  on('handoff', body => {
    const {to, epoch} = (body ?? {}) as {to?: PlayerId; epoch?: number}
    if (to !== self) {
      lastHostAt = 0
      return
    }
    const players = (shared?.players ?? []).map(p => ({
      ...p,
      connected: peers().includes(p.id) || p.id === self
    }))
    becomeHost(players, epoch ?? (shared?.hostEpoch ?? 0) + 1)
    flash('You are hosting now')
  })

  on('intent', (body, env) => applyIntent(env.from, body as Intent))

  on('resync', (_body, env) => {
    if (isHost() && shared) send('welcome', shared, env.from)
  })

  onNetChange(monitor)
  setInterval(monitor, 1000)

  document.addEventListener('visibilitychange', () => {
    if (!isHost()) return
    hostMutate(draft => ({...draft, hostHidden: document.hidden}))
    if (!document.hidden && !wakeLock) takeWakeLock()
  })

  addEventListener('beforeunload', () => {
    if (!isHost() || !shared) return
    const to = bestSuccessor()
    if (to) send('handoff', {to, epoch: shared.hostEpoch + 1})
  })
}

// ------------------------------------------------------------- entry points

export const createRoom = async (name: string, password: string | null) => {
  start()
  myName = name
  saveSession({name, password})
  passwordHash = await proofFor(password)
  becomeHost([{...emptyPlayer(self, name), avatar: myAvatar}], 1)
}

export const joinRoom = async (name: string, password: string | null) => {
  start()
  myName = name
  saveSession({name, password})
  role = 'joining'
  publish()
  send('hello', {name, proof: await proofFor(password)})
}

export const setPassword = async (password: string | null) => {
  if (!isHost()) return
  passwordHash = await proofFor(password)
  saveSession({password})
  publish()
}

export const hasPassword = () => passwordHash !== null

export const setAvatar = (avatar: Avatar) => {
  myAvatar = avatar
  intend({kind: 'setAvatar', avatar})
}

export const myDisplayName = () => myName

export const useRoom = () =>
  useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
    () => snapshot
  )
