import {useSyncExternalStore} from 'react'
import {newRoomId, sha256Hex} from '../net/identity'
import type {PlayerId} from '../net/protocol'
import {derive, type View} from '../game/reducer'
import {advance} from '../game/reducer'
import {defaultSettings, validate, type BoardSize, type Settings} from '../game/settings'
import type {ClueCount, Step} from '../game/steps'
import type {Avatar, Player, Shared, Team} from '../game/types'
import {otherTeam} from '../game/types'
import {on, peers, roomId, self, send, startMesh, subscribe as onNetChange} from './net'
import * as words from './words'

export type Role = 'idle' | 'joining' | 'rejected' | 'client' | 'host' | 'electing'

export type RoomSnapshot = {
  role: Role
  shared: Shared | null
  banner: string | null
  split: boolean
  me: PlayerId
  wordsReady: boolean
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
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({roomId, name: '', password: null, ...loadSession(), ...patch})
    )
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
let clockOffset = 0
let claims: Claim[] = []
let electionTimer: ReturnType<typeof setTimeout> | null = null
let broadcastTimer: ReturnType<typeof setTimeout> | null = null
let beatWorker: Worker | null = null
let wakeLock: WakeLockSentinel | null = null
let started = false
const strangerSince = new Map<PlayerId, number>()
const rivalHosts = new Map<PlayerId, number>()

let snapshot: RoomSnapshot = {role, shared, banner, split, me: self, wordsReady: false}

const publish = () => {
  snapshot = {
    role,
    shared,
    banner,
    split,
    me: self,
    wordsReady: shared ? words.have(shared.settings.wordListHash) : false
  }
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

/** Host wall clock, estimated from sentAt on each broadcast. Sub-second accuracy is enough. */
export const hostNow = () => Date.now() + clockOffset

const emptyPlayer = (id: PlayerId, name: string): Player => ({
  id,
  name: name || 'Agent',
  team: null,
  spymaster: false,
  ready: false,
  avatar: {style: 'shapes', seed: id, bg: 'ink-700'},
  connected: true
})

const viewOf = (state: Shared): View =>
  derive(state.settings, words.get(state.settings.wordListHash), state.steps, state.cursor)

// ---------------------------------------------------------------- host side

const broadcast = () => {
  if (!isHost() || broadcastTimer) return
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    if (!isHost() || !shared) return
    shared = {...shared, version: shared.version + 1, sentAt: Date.now(), roster: [self, ...peers()]}
    send('state', shared)
    publish()
  }, BROADCAST_DEBOUNCE_MS)
}

const hostMutate = (fn: (draft: Shared) => Shared | void) => {
  if (!isHost() || !shared) return
  const next = fn(shared)
  if (next) shared = next
  broadcast()
}

const upsertPlayer = (id: PlayerId, patch: Partial<Player>, name?: string) => {
  hostMutate(draft => {
    const existing = draft.players.find(p => p.id === id)
    return {
      ...draft,
      players: existing
        ? draft.players.map(p => (p.id === id ? {...p, ...patch} : p))
        : [...draft.players, {...emptyPlayer(id, name ?? 'Agent'), ...patch}]
    }
  })
}

/** Wall-clock deadlines are not derivable from steps, so they are recomputed on every phase change. */
const deadlineFor = (settings: Settings, view: View): number | null => {
  if (view.phase === 'clue' && settings.clueTimer) return Date.now() + settings.clueTimer * 1000
  if (view.phase === 'guess' && settings.guessTimer) return Date.now() + settings.guessTimer * 1000
  return null
}

const commit = (mutate: (draft: Shared) => Shared) => {
  hostMutate(draft => {
    const next = mutate(draft)
    return {...next, deadline: deadlineFor(next.settings, viewOf(next))}
  })
}

const appendStep = (step: Step) => {
  commit(draft => {
    const list = words.get(draft.settings.wordListHash)
    const truncated = draft.steps.slice(0, draft.cursor)
    const steps = advance(draft.settings, list, truncated, step)
    return {...draft, steps, cursor: steps.length}
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

const becomeHost = (state: Shared) => {
  role = 'host'
  shared = state
  clockOffset = 0
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

const requestWordsIfMissing = () => {
  if (!shared) return
  const hash = shared.settings.wordListHash
  if (!hash || words.have(hash) || isHost()) return
  send('resync', {want: 'words', hash}, shared.hostId)
}

const adopt = (next: Shared) => {
  const current = shared
  const newer =
    !current ||
    next.hostEpoch > current.hostEpoch ||
    (next.hostEpoch === current.hostEpoch && next.version > current.version)
  if (!newer) return

  const hostChanged = current !== null && current.hostId !== next.hostId
  if (isHost() && next.hostId !== self) demote()

  shared = next
  clockOffset = next.sentAt - Date.now()
  lastHostAt = Date.now()
  if (role === 'joining' || role === 'electing' || role === 'rejected' || role === 'idle') {
    role = next.hostId === self ? 'host' : 'client'
  }
  if (hostChanged) {
    const name = next.players.find(p => p.id === next.hostId)?.name ?? 'Someone'
    flash(`${name} is hosting now`)
  }
  requestWordsIfMissing()
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

const promoteSelf = (epoch: number) => {
  if (!shared) return
  const connected = new Set([self, ...peers()])
  becomeHost({
    ...shared,
    version: shared.version + 1,
    hostId: self,
    hostEpoch: epoch,
    hostHidden: document.hidden,
    roster: [...connected],
    sentAt: Date.now(),
    players: shared.players.map(p => ({...p, connected: connected.has(p.id)}))
  })
  flash('You are hosting now')
}

const startElection = () => {
  if (role === 'electing' || isHost() || !shared) return
  role = 'electing'
  claims = [myClaim()]
  send('claim', claims[0])
  publish()

  if (electionTimer) clearTimeout(electionTimer)
  electionTimer = setTimeout(() => {
    electionTimer = null
    if (isHost() || role !== 'electing') return
    const winner = [...claims].sort(scoreClaim)[0]!
    if (winner.playerId === self) promoteSelf((shared?.hostEpoch ?? 0) + 1)
    else {
      // Wait for the winner's state; the liveness monitor retries if it never lands.
      role = 'client'
      lastHostAt = Date.now()
      publish()
    }
  }, CLAIM_WINDOW_MS)
}

/** The host cannot see anyone else's visibility or version, so this falls back to the deterministic tiebreak the election ends on. A failed handoff simply times out into a normal election. */
const bestSuccessor = (): PlayerId | null =>
  [...peers()].sort((a, b) => (a < b ? -1 : 1))[0] ?? null

// ----------------------------------------------------------------- monitors

const missingWindow = () => (shared?.hostHidden ? MISSING_HOST_HIDDEN_MS : MISSING_HOST_MS)

const monitor = () => {
  const now = Date.now()

  if (role === 'client' && shared && now - lastHostAt > missingWindow()) startElection()

  if (isHost() && shared) {
    const connected = new Set([self, ...peers()])
    if (shared.players.some(p => p.connected !== connected.has(p.id))) {
      hostMutate(draft => ({
        ...draft,
        players: draft.players.map(p => ({...p, connected: connected.has(p.id)}))
      }))
    }

    if (shared.deadline !== null && now >= shared.deadline) {
      const view = viewOf(shared)
      if (view.phase === 'clue' || view.phase === 'guess') {
        appendStep({t: 'endTurn', team: view.turn, reason: 'timeout'})
      } else {
        hostMutate(draft => ({...draft, deadline: null}))
      }
    }
  }

  const roster = new Set(shared?.roster ?? [])
  let stranded = false
  for (const peer of peers()) {
    if (roster.has(peer)) {
      strangerSince.delete(peer)
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

// ------------------------------------------------------------------ intents

export type Intent =
  | {kind: 'setName'; name: string}
  | {kind: 'setTeam'; target: PlayerId; team: Team | null}
  | {kind: 'setSpymaster'; target: PlayerId; spymaster: boolean}
  | {kind: 'setAvatar'; avatar: Avatar}
  | {kind: 'ready'; ready: boolean}
  | {kind: 'transferHost'; target: PlayerId}
  | {kind: 'updateSettings'; patch: Partial<Settings>}
  | {kind: 'startGame'}
  | {kind: 'endGame'}
  | {kind: 'clue'; word: string; count: ClueCount}
  | {kind: 'guess'; card: number}
  | {kind: 'pass'}
  | {kind: 'undo'}
  | {kind: 'redo'}
  | {kind: 'jump'; cursor: number}

const refuse = (from: PlayerId, why: string) => {
  if (from === self) flash(why)
}

const applyIntent = (from: PlayerId, intent: Intent) => {
  if (!isHost() || !shared) return
  const state = shared
  const fromHost = from === state.hostId
  const view = viewOf(state)
  const player = state.players.find(p => p.id === from)

  switch (intent.kind) {
    case 'setName':
      upsertPlayer(from, {name: intent.name.slice(0, 24) || 'Agent'})
      return

    case 'setAvatar':
      upsertPlayer(from, {avatar: intent.avatar})
      return

    case 'ready':
      if (view.phase !== 'setup') return
      upsertPlayer(from, {ready: intent.ready})
      return

    case 'setTeam':
      if (view.phase !== 'setup') return
      if (intent.target !== from && !fromHost) return
      upsertPlayer(intent.target, {team: intent.team, spymaster: false})
      return

    case 'setSpymaster': {
      if (view.phase !== 'setup') return
      if (intent.target !== from && !fromHost) return
      const team = state.players.find(p => p.id === intent.target)?.team
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
      if (!fromHost) return
      if (!peers().includes(intent.target)) return refuse(from, 'That player is not connected')
      send('handoff', {to: intent.target, epoch: state.hostEpoch + 1})
      demote()
      return
    }

    case 'updateSettings': {
      if (!fromHost) return
      if (view.phase !== 'setup' && view.phase !== 'gameover') {
        return refuse(from, 'Settings are locked mid-game')
      }
      commit(draft => ({...draft, settings: {...draft.settings, ...intent.patch}}))
      return
    }

    case 'startGame': {
      if (!fromHost) return
      const list = words.get(state.settings.wordListHash)
      const problems = validate(state.settings, list.length)
      if (problems.length) return refuse(from, problems[0]!.message)
      const startTeam: Team = Math.random() < 0.5 ? 'red' : 'blue'
      commit(draft => ({
        ...draft,
        players: draft.players.map(p => ({...p, ready: false})),
        steps: [{t: 'start', seed: newRoomId(), startTeam}],
        cursor: 1
      }))
      return
    }

    case 'endGame': {
      if (!fromHost) return
      if (view.phase === 'setup') return
      commit(draft => ({
        ...draft,
        steps: [],
        cursor: 0,
        players: draft.players.map(p => ({...p, ready: false}))
      }))
      return
    }

    case 'clue': {
      if (view.phase !== 'clue') return
      if (!player || player.team !== view.turn || !player.spymaster) return
      const word = intent.word.trim().slice(0, 40)
      if (!word) return
      const max = state.settings.size * state.settings.size
      if (intent.count !== 'unlimited' && (intent.count < 0 || intent.count > max)) return
      appendStep({t: 'clue', team: view.turn, by: from, word, count: intent.count})
      return
    }

    case 'guess': {
      if (view.phase !== 'guess') return
      if (!player || player.team !== view.turn || player.spymaster) return
      if (!view.cards[intent.card] || view.cards[intent.card]!.revealed) return
      appendStep({t: 'guess', team: view.turn, by: from, card: intent.card})
      return
    }

    case 'pass': {
      if (view.phase !== 'guess') return
      if (!player || player.team !== view.turn || player.spymaster) return
      if (view.guessedSinceClue < 1) return
      appendStep({t: 'endTurn', team: view.turn, reason: 'pass'})
      return
    }

    case 'undo':
      if (!fromHost) return
      if (state.cursor <= 0) return refuse(from, 'Nothing left to undo')
      commit(draft => ({...draft, cursor: draft.cursor - 1}))
      send('presence', {kind: 'rewound'})
      return

    case 'redo':
      if (!fromHost) return
      if (state.cursor >= state.steps.length) return refuse(from, 'Nothing to redo')
      commit(draft => ({...draft, cursor: draft.cursor + 1}))
      return

    case 'jump':
      if (!fromHost) return
      if (intent.cursor < 0 || intent.cursor > state.steps.length) return
      commit(draft => ({...draft, cursor: intent.cursor}))
      send('presence', {kind: 'rewound'})
      return
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
    send('words', {hash: shared.settings.wordListHash, words: words.get(shared.settings.wordListHash)}, env.from)
  })

  on('welcome', body => {
    if (body) adopt(body as Shared)
  })

  on('words', body => {
    const {hash, words: list} = (body ?? {}) as {hash?: string; words?: string[]}
    if (hash && Array.isArray(list)) {
      words.put(hash, list)
      publish()
    }
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
      const mine = shared?.hostEpoch ?? 0
      const theyWin = next.hostEpoch > mine || (next.hostEpoch === mine && next.hostId < self)
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
    if ((beat.version ?? 0) > shared.version) send('resync', {want: 'state'}, shared.hostId)
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
    promoteSelf(epoch ?? (shared?.hostEpoch ?? 0) + 1)
  })

  on('intent', (body, env) => applyIntent(env.from, body as Intent))

  on('resync', (body, env) => {
    if (!isHost() || !shared) return
    const {want, hash} = (body ?? {}) as {want?: string; hash?: string}
    if (want === 'words') {
      const key = hash ?? shared.settings.wordListHash
      send('words', {hash: key, words: words.get(key)}, env.from)
      return
    }
    send('welcome', shared, env.from)
  })

  onNetChange(monitor)
  setInterval(monitor, 500)

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
  const {hash} = await words.resolve({kind: 'packs', packs: ['original']})
  becomeHost({
    version: 1,
    hostId: self,
    hostEpoch: 1,
    hostHidden: document.hidden,
    roster: [self],
    sentAt: Date.now(),
    players: [{...emptyPlayer(self, name), avatar: myAvatar}],
    settings: defaultSettings(hash),
    steps: [],
    cursor: 0,
    deadline: null
  })
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

export const setWordSource = async (source: words.Source) => {
  if (!isHost()) return
  const {hash, words: list} = await words.resolve(source)
  intend({kind: 'updateSettings', patch: {wordListHash: hash}})
  send('words', {hash, words: list})
}

export const setBoardSize = (size: BoardSize, preset: {teamCards: number; assassins: number}) =>
  intend({kind: 'updateSettings', patch: {size, ...preset}})

export const setAvatar = (avatar: Avatar) => {
  myAvatar = avatar
  intend({kind: 'setAvatar', avatar})
}

export const myDisplayName = () => myName

export const myPlayer = () => shared?.players.find(p => p.id === self) ?? null

export const currentView = (): View | null => (shared ? viewOf(shared) : null)

export const opposing = otherTeam

export const useRoom = () =>
  useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
    () => snapshot
  )
