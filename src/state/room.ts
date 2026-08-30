import {useSyncExternalStore} from 'react'
import {newRoomId, rememberSeat, sha256Hex, startSeatClaim} from '../net/identity'
import type {PlayerId} from '../net/protocol'
import {derive, type View} from '../game/reducer'
import {advance} from '../game/reducer'
import {clueProblem} from '../game/clue'
import {shuffle} from '../game/prng'
import {defaultSettings, validate, type BoardSize, type Settings} from '../game/settings'
import type {ClueCount, Step} from '../game/steps'
import type {Avatar, Player, Shared, Team} from '../game/types'
import {AVATAR_VARIANTS, dealTeams, otherTeam, rosterProblems, spymasterOf} from '../game/types'
import {joinedExisting, lastHeardFrom, on, openRoom, peers, roomId, self, send, startMesh, stopMesh, subscribe as onNetChange, twinned} from './net'
import {PACE} from './pace'
import {takeTally} from './tally'
import {getPrefs, setPrefs} from './prefs'
import * as words from './words'

/** `displaced`: another tab took this seat, and this one has stepped out of the room. */
export type Role = 'idle' | 'joining' | 'rejected' | 'client' | 'host' | 'electing' | 'displaced'

export type RoomSnapshot = {
  role: Role
  shared: Shared | null
  banner: string | null
  split: boolean
  me: PlayerId
  wordsReady: boolean
  /** Host-local: how long our own tab has been backgrounded, for the title and favicon ladder. */
  hiddenMs: number
  degrading: boolean
  /** The oldest move still waiting to be acknowledged, and how many are waiting. */
  unacked: {oldestMs: number; count: number} | null
  /** Since the host was last heard from. Null when we are the host. */
  hostHeardMsAgo: number | null
  /** Moves the room lost to a rewind that somebody still holds. Host-only. */
  erased: Erased | null
  /** Another live tab is in the room as us. */
  twin: boolean
}

export type Erased = {seed: string; steps: Step[]; cursor: number}

/** Widened while the host advertises a hidden tab, whose timers the browser throttles. */
const MISSING_HOST_MS = 6_000
const MISSING_HOST_HIDDEN_MS = 30_000
const BEAT_MS = 2_000
/**
 * A move is repeated until the host says it arrived.
 *
 * An intent was sent once and forgotten, so a lost one looked exactly like a
 * player who had not moved: the board did not change and nothing said why. The
 * host answers every intent by name, including one it has already applied, so
 * a retry that crossed an acknowledgement in flight is answered rather than
 * replayed.
 */
const ACK_RETRY_MS = 1_000
export const ACK_WORRY_MS = 3_000
export const ACK_GIVE_UP_MS = 10_000
/** Enough to cover any plausible retry window; the oldest fall off the end. */
const APPLIED_MEMORY = 500

/**
 * The host sends the whole room this often whether or not anything changed.
 *
 * A few kilobytes against a client that missed a delta, missed the resync it
 * asked for, missed the answer, and missed the beat that would have prompted
 * it again. Deltas stay for responsiveness; this is the floor under them, and
 * it converges without anyone having to notice they are behind.
 */
const FULL_EVERY_MS = 5_000

/** Clients say so periodically, so a relayed player is not mistaken for a lost one. */
const HERE_MS = 3_000
const HEARD_WINDOW_MS = 11_000

/**
 * Everyone we can currently reach.
 *
 * `peers()` is enough on its own now that every link answers a ping every two
 * seconds and a silent one is closed: a link in the map is a link that replied.
 * It used to also count anyone heard from in the last eleven seconds, because
 * a link could be dead for a minute without anyone noticing — that window was
 * covering for the mesh rather than describing the room.
 */
const present = (ids: PlayerId[] = []): Set<PlayerId> => {
  const now = Date.now()
  const live = new Set<PlayerId>([self, ...peers()])
  for (const id of ids) if (now - lastHeardFrom(id) < HEARD_WINDOW_MS) live.add(id)
  return live
}
const CLAIM_WINDOW_MS = 1_500
const BROADCAST_DEBOUNCE_MS = 50
const SPLIT_GRACE_MS = 25_000
const BEAT_LATE_MS = 5_000
export const AWAY_NOTICE_MS = 20_000
const AWAY_TRANSFER_MS = 60_000
const TIMEOUT_GRACE_MS = 900
const TALLY_MS = 4_000
const SETTLED_MS = 2_500
const RIVAL_HOST_WINDOW_MS = 5_000
/**
 * How long two hosts are allowed to coexist before it counts as a split.
 *
 * Two hosts meeting is normal and self-resolving: a handoff or an election
 * leaves the outgoing host beating for a moment, and the higher epoch takes the
 * room on the next state or beat either way. Only a pair that will not settle
 * is worth telling anyone about.
 */
const RIVAL_SETTLE_MS = 14_000

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

/** A stable starting variant per player, so two people rarely open identical. */
const seedFor = (id: string) => {
  let h = 0
  for (const ch of id) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0
  return Math.abs(h) % AVATAR_VARIANTS
}

const bornAt = Date.now()
const listeners = new Set<() => void>()

let role: Role = 'idle'
let shared: Shared | null = null
let banner: string | null = null
let bannerTimer: ReturnType<typeof setTimeout> | null = null
let split = false
let myName = loadSession()?.name || getPrefs().name
let myAvatar: Avatar = getPrefs().avatar ?? {
  style: 'lorelei',
  seed: String(seedFor(self)),
  bg: '141C30'
}
let announcedAvatar = false
type Pending = {id: string; intent: Intent; sentAt: number; triedAt: number}
const pending = new Map<string, Pending>()
/** Intent ids the host has already carried out, so a repeat is not applied twice. */
const applied = new Set<string>()
let passwordHash: string | null = null
/** Kept so the introduction can be repeated; the mesh does not promise delivery. */
let myProof: string | null = null
let saidHelloAt = 0
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
let rivalsSince = 0
let hiddenSince = 0
let lastBeatAt = 0
let lastFullAt = 0
let lastStepAt = 0
let degrading = false
let lost: Erased | null = null

let snapshot: RoomSnapshot = {
  role,
  shared,
  banner,
  split,
  me: self,
  wordsReady: false,
  hiddenMs: 0,
  degrading: false,
  unacked: null,
  hostHeardMsAgo: null,
  erased: null,
  twin: false
}

const publish = () => {
  snapshot = {
    role,
    shared,
    banner,
    split,
    me: self,
    wordsReady: shared ? words.have(shared.settings.wordListHash) : false,
    hiddenMs: hiddenSince ? Date.now() - hiddenSince : 0,
    degrading,
    unacked: waiting(),
    hostHeardMsAgo: isHost() || !shared ? null : Date.now() - lastHostAt,
    erased: isHost() ? restorable() : null,
    twin: twinned()
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
  avatar: {style: 'lorelei', seed: String(seedFor(id)), bg: '141C30'},
  connected: true
})

const viewOf = (state: Shared): View =>
  derive(state.settings, words.get(state.settings.wordListHash), state.steps, state.cursor)

// ---------------------------------------------------------------- host side

/**
 * Full state on welcome, host change and resync; a delta the rest of the time.
 * `base` is how many steps the room is assumed to hold, so an undo followed by
 * a fresh step arrives as a truncate-and-append rather than the whole history.
 */
export type StateMsg =
  | {full: Shared}
  | {meta: Omit<Shared, 'steps'>; base: number; add: Step[]; mark?: number}

/**
 * A delta names the prefix it extends, so a client holding a different one
 * asks for the room instead of building on the wrong history for the five
 * seconds until the next full copy. Absent from an older host: trusted as before.
 */
export const markOf = (steps: Step[], upTo: number) => {
  let h = 2166136261
  for (let i = 0; i < upTo; i++) {
    const text = JSON.stringify(steps[i])
    for (let c = 0; c < text.length; c++) h = Math.imul(h ^ text.charCodeAt(c), 16777619)
  }
  return h >>> 0
}

let broadcastBase = 0

const whereWeAre = () =>
  shared ? {epoch: shared.hostEpoch, version: shared.version} : {epoch: 0, version: 0}

const sendFull = (state: Shared, to: PlayerId | '*' = '*') => {
  send('state', {full: state} satisfies StateMsg, to)
  broadcastBase = state.steps.length
}

const broadcast = () => {
  if (!isHost() || broadcastTimer) return
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    if (!isHost() || !shared) return
    shared = {
      ...shared,
      version: shared.version + 1,
      sentAt: Date.now(),
      roster: [...present(shared.players.map(p => p.id))]
    }
    const {steps, ...meta} = shared
    const base = Math.min(broadcastBase, steps.length)
    send('state', {meta, base, add: steps.slice(base), mark: markOf(steps, base)} satisfies StateMsg)
    broadcastBase = steps.length
    publish()
  }, BROADCAST_DEBOUNCE_MS)
}

/** Steps are never mutated in place, so identity is what "clients already have this" means. */
const commonPrefix = (a: Step[], b: Step[]) => {
  const limit = Math.min(a.length, b.length)
  let i = 0
  while (i < limit && a[i] === b[i]) i++
  return i
}

const hostMutate = (fn: (draft: Shared) => Shared | void) => {
  if (!isHost() || !shared) return
  const before = shared
  const next = fn(shared)
  if (next) shared = next
  // A rewind, a fresh deal or a game ended rewrites history rather than
  // extending it, and only what survives can still be assumed sent.
  if (shared.steps !== before.steps)
    broadcastBase = Math.min(broadcastBase, commonPrefix(before.steps, shared.steps))
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

/**
 * How long the splashes for the steps just applied hold the screen. Nobody can
 * act under them, so the clock does not start until they are over.
 */
const SPLASH: Partial<Record<Step['t'], number>> = {
  start: PACE.deal,
  clue: PACE.clue,
  guess: PACE.windup + PACE.landing + PACE.correct,
  endTurn: PACE.turn
}

/** A rewind snaps rather than replaying, so a long jump does not bank its splashes. */
const LEAD_CAP_MS = 8_000

export const leadIn = (state: Shared, from: number): number =>
  Math.min(
    LEAD_CAP_MS,
    state.steps.slice(from, state.cursor).reduce((ms, step) => ms + (SPLASH[step.t] ?? 0), 0)
  )

/** Wall-clock deadlines are not derivable from steps, so they are recomputed on every phase change. */
const deadlineFor = (settings: Settings, view: View, lead: number): number | null => {
  const now = Date.now() + lead
  if (view.phase === 'clue' && settings.clueTimer) return now + settings.clueTimer * 1000
  if (view.phase === 'guess' && settings.guessTimer) return now + settings.guessTimer * 1000
  return null
}

const commit = (mutate: (draft: Shared) => Shared) => {
  hostMutate(draft => {
    const next = mutate(draft)
    return {
      ...next,
      deadline: deadlineFor(next.settings, viewOf(next), leadIn(next, draft.cursor))
    }
  })
}

const appendStep = (step: Step) => {
  const now = Date.now()
  lastStepAt = now
  commit(draft => {
    const list = words.get(draft.settings.wordListHash)
    const truncated = draft.steps.slice(0, draft.cursor)
    // Follow-ups are consequences of this one and share its moment. Only the
    // host runs this, so every stamp in the list comes off the same clock.
    const steps = advance(draft.settings, list, truncated, step).map(s =>
      s.at === undefined ? {...s, at: now} : s
    )
    return {...draft, steps, cursor: steps.length}
  })
}

const startBeat = () => {
  if (beatWorker) return
  beatWorker = new Worker(new URL('../net/beat.worker.ts', import.meta.url), {type: 'module'})
  beatWorker.onmessage = () => {
    if (!isHost() || !shared) return
    const now = Date.now()
    const late = lastBeatAt > 0 && now - lastBeatAt > BEAT_LATE_MS
    lastBeatAt = now
    if (late !== degrading) {
      degrading = late
      hostMutate(draft => ({...draft, hostDegraded: late}))
    }
    send('beat', {
      version: shared.version,
      hostId: shared.hostId,
      hostEpoch: shared.hostEpoch,
      hostHidden: shared.hostHidden
    })

    if (now - lastFullAt > FULL_EVERY_MS) {
      lastFullAt = now
      sendFull(shared)
    }
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
  sendFull(shared)
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

const seedOf = (state: {steps: Step[]}) => {
  const first = state.steps[0]
  return first?.t === 'start' ? first.seed : ''
}

const keepLost = (found: Erased) => {
  if (!shared || found.seed !== seedOf(shared)) return
  if (lost && lost.seed === found.seed && lost.cursor >= found.cursor) return
  lost = found
}

/** What the host could put back: a longer log of the game it is running now. */
const restorable = (): Erased | null =>
  shared && lost && lost.seed === seedOf(shared) && lost.cursor > shared.cursor ? lost : null

const restore = (): boolean => {
  const found = restorable()
  if (!found || !shared) return false
  const count = found.cursor - shared.cursor
  commit(draft => ({...draft, steps: found.steps, cursor: found.cursor}))
  lost = null
  send('presence', {kind: 'restored', count})
  flash(`Restored ${count} erased ${count === 1 ? 'move' : 'moves'}`)
  return true
}

/**
 * Everyone holds the whole game, so a room that has gone backwards is put
 * straight again by whoever still has the rest of it. One step is left alone:
 * that is what a host's own undo followed by a move looks like to a client that
 * missed the undo, and putting it back would undo the host.
 */
const AUTO_RESTORE_OVER = 1

/**
 * A state with fewer steps than the position we were already playing at is not
 * an undo — an undo moves the cursor and keeps the steps, and a move after one
 * only cuts what the cursor had left behind. It is a host that came back with an
 * old copy. The copy we had goes to whoever is hosting now, for them to put back.
 */
const noteRewind = (current: Shared, next: Shared) => {
  const seed = seedOf(current)
  if (!seed || seed !== seedOf(next)) return
  if (next.steps.length >= current.cursor) return
  const found: Erased = {seed, steps: current.steps, cursor: current.cursor}
  if (!lost || lost.seed !== seed || lost.cursor < found.cursor) lost = found
  const count = current.cursor - Math.min(next.cursor, next.steps.length)
  flash(`${count} ${count === 1 ? 'move was' : 'moves were'} erased by a host change`)
  if (next.hostId !== self) send('lost', found, next.hostId)
}

const outranks = (a: Shared, b: Shared) =>
  a.hostEpoch > b.hostEpoch || (a.hostEpoch === b.hostEpoch && a.version > b.version)

/** Taking `next` would throw away moves of the game `current` is already past. */
const erases = (next: Shared, current: Shared) => {
  const seed = seedOf(current)
  return !!seed && seed === seedOf(next) && next.steps.length < current.cursor
}

/**
 * A host that outranks us on epoch but is behind us on the game is one that
 * came back from a frozen tab and crowned itself. Epoch is not enough to take
 * a room backwards: it is refused, and shown the game as it stands so it can
 * fall in line. `force` is that other side — a host learning it is the stale one.
 */
const adopt = (next: Shared, force = false) => {
  const current = shared
  if (current && !force) {
    if (!outranks(next, current)) return
    if (erases(next, current)) {
      send('state', {full: current} satisfies StateMsg, next.hostId)
      flash('Refused a host that would have erased moves')
      return
    }
  }

  const hostChanged = current !== null && current.hostId !== next.hostId
  if (isHost() && next.hostId !== self) demote()

  shared = next
  clockOffset = next.sentAt - Date.now()
  lastHostAt = Date.now()
  // Only somebody who asked to join is seated by a state arriving. The room is
  // gossiped to every peer, and a tab on the landing screen is a peer: adopting
  // a role here put a player who had typed no name — and proved no password —
  // straight into the lobby.
  if (role === 'joining' || role === 'electing') {
    role = next.hostId === self ? 'host' : 'client'
  }
  if (hostChanged) {
    const name = next.players.find(p => p.id === next.hostId)?.name ?? 'Someone'
    flash(`${name} is hosting now`)
  }
  if (current) noteRewind(current, next)
  // The host seats a joiner with a default look; this is where we tell it ours.
  if (!announcedAvatar && next.players.some(p => p.id === self)) {
    announcedAvatar = true
    intend({kind: 'setAvatar', avatar: myAvatar})
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
  const connected = present(shared.players.map(p => p.id))
  becomeHost({
    ...shared,
    version: shared.version + 1,
    hostId: self,
    hostEpoch: epoch,
    hostHidden: document.hidden,
    hostDegraded: false,
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
    // Alone is not elected. A tab back from being frozen has no links yet and
    // hears no claims; crowning it would put its old copy over the live game.
    if (winner.playerId === self && peers().length === 0) {
      role = 'client'
      lastHostAt = Date.now()
      publish()
      return
    }
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
    const connected = present(shared.players.map(p => p.id))
    if (shared.players.some(p => p.connected !== connected.has(p.id))) {
      // Anyone who has just come back gets the room outright. They would
      // otherwise receive deltas they cannot apply, ask for a resync, and wait
      // on the answer — two more messages to lose at the worst moment for it.
      const returning = shared.players.filter(p => !p.connected && connected.has(p.id)).map(p => p.id)

      hostMutate(draft => ({
        ...draft,
        players: draft.players.map(p => ({...p, connected: connected.has(p.id)}))
      }))

      if (shared) for (const id of returning) sendFull(shared, id)
    }

    // Rung four: hand the room to someone whose tab is actually in front. It is
    // deliberate but reversible — the original host takes it back on return.
    if (
      hiddenSince > 0 &&
      now - hiddenSince > AWAY_TRANSFER_MS &&
      degrading &&
      now - lastStepAt > SETTLED_MS
    ) {
      const to = bestSuccessor()
      if (to) {
        send('handoff', {to, epoch: shared.hostEpoch + 1, state: shared})
        const name = shared.players.find(p => p.id === to)?.name ?? 'someone else'
        flash(`Handed hosting to ${name} while you were away`)
        demote()
        return
      }
    }

    // A move sent just before the buzzer is still crossing the mesh. The
    // grace is how long it gets to arrive: a guess that lands inside it appends
    // a step, which sets a fresh deadline, and no turn is taken away.
    if (shared.deadline !== null && now >= shared.deadline + TIMEOUT_GRACE_MS) {
      const view = viewOf(shared)
      // A spymaster who ran out of time still put their team in: they get a
      // clue with nothing in it and the whole board to work from. Losing the
      // turn outright punishes four people for one person's clock.
      if (view.phase === 'clue') {
        appendStep({
          t: 'clue',
          team: view.turn,
          by: spymasterOf(shared.players, view.turn)?.id ?? '',
          word: '',
          count: 'unlimited'
        })
      } else if (view.phase === 'guess') {
        appendStep({t: 'endTurn', team: view.turn, reason: 'timeout'})
      } else {
        hostMutate(draft => ({...draft, deadline: null}))
      }
    }
  }

  const roster = new Set([
    ...(shared?.roster ?? []),
    ...(shared?.players ?? []).map(p => p.id)
  ])
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

  if (rivalHosts.size > 1) rivalsSince = rivalsSince || now
  else rivalsSince = 0

  const contested = rivalsSince > 0 && now - rivalsSince > RIVAL_SETTLE_MS
  const next = stranded || contested
  if (next !== split) {
    split = next
    publish()
  }
}

// ------------------------------------------------------------------ intents

export type Intent =
  | {kind: 'setName'; name: string}
  | {kind: 'setTeam'; target: PlayerId; team: Team | null; spectator?: boolean}
  | {kind: 'setSpymaster'; target: PlayerId; spymaster: boolean}
  | {kind: 'shuffleTeams'}
  | {kind: 'setAvatar'; avatar: Avatar}
  | {kind: 'ready'; ready: boolean}
  | {kind: 'transferHost'; target: PlayerId}
  | {kind: 'removePlayer'; target: PlayerId}
  | {kind: 'updateSettings'; patch: Partial<Settings>}
  | {kind: 'startGame'}
  | {kind: 'endGame'}
  | {kind: 'clue'; word: string; count: ClueCount}
  | {kind: 'guess'; card: number}
  | {kind: 'pass'}
  | {kind: 'undo'}
  | {kind: 'redo'}
  | {kind: 'jump'; cursor: number}
  | {kind: 'restore'}

/** Named so a rewind can be announced as what was taken back, not as a number. */
const describeStep = (state: Shared, index: number): string => {
  const step = state.steps[index]
  if (!step) return 'the last move'
  switch (step.t) {
    case 'clue':
      return `the clue ${step.word} ${step.count === 'unlimited' ? '∞' : step.count}`
    case 'guess': {
      const word = viewOf({...state, cursor: index}).cards[step.card]?.word
      return word ? `the guess ${word}` : 'a guess'
    }
    case 'endTurn':
      return 'the end of the turn'
    case 'end':
      return 'the end of the game'
    case 'start':
      return 'the deal'
  }
}

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
      upsertPlayer(intent.target, {
        team: intent.spectator ? null : intent.team,
        spymaster: false,
        spectator: !!intent.spectator
      })
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

    case 'shuffleTeams': {
      if (!fromHost) return
      if (view.phase !== 'setup') return
      // The coin decides which side gets the odd seat, so it is not always red.
      const order = shuffle(state.players.map(p => p.id), Math.random)
      const first: Team = Math.random() < 0.5 ? 'red' : 'blue'
      hostMutate(draft => ({...draft, players: dealTeams(draft.players, order, first)}))
      return
    }

    case 'removePlayer': {
      if (!fromHost) return
      if (intent.target === self) return refuse(from, 'You cannot remove yourself')
      hostMutate(draft => ({
        ...draft,
        players: draft.players.filter(p => p.id !== intent.target)
      }))
      return
    }

    case 'transferHost': {
      if (!fromHost) return
      if (!present(state.players.map(p => p.id)).has(intent.target))
        return refuse(from, 'That player is not connected')
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
      const roster = rosterProblems(state.players)
      if (roster.length) return refuse(from, roster[0]!.message)
      const startTeam: Team = Math.random() < 0.5 ? 'red' : 'blue'
      commit(draft => ({
        ...draft,
        players: draft.players.map(p => ({...p, ready: false})),
        steps: [{t: 'start', seed: newRoomId(), startTeam, at: Date.now()}],
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
      const onBoard = clueProblem(word, view.cards)
      if (onBoard) return refuse(from, onBoard)
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
      appendStep({t: 'endTurn', team: view.turn, reason: 'pass', by: from})
      return
    }

    case 'undo': {
      if (!fromHost) return
      if (state.cursor <= 0) return refuse(from, 'Nothing left to undo')
      const undone = describeStep(state, state.cursor - 1)
      commit(draft => ({...draft, cursor: draft.cursor - 1}))
      send('presence', {kind: 'rewound', undone})
      flash(`The host took back ${undone}`)
      return
    }

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

    case 'restore':
      if (!fromHost) return
      if (!restore()) refuse(from, 'Nothing to restore')
      return
  }
}

export const intend = (intent: Intent) => {
  if (isHost()) {
    applyIntent(self, intent)
    return
  }
  const id = newRoomId()
  pending.set(id, {id, intent, sentAt: Date.now(), triedAt: Date.now()})
  send('intent', {id, ...intent}, shared?.hostId ?? '*')
  publish()
}

const waiting = () => {
  if (!pending.size) return null
  const now = Date.now()
  let oldest = 0
  for (const p of pending.values()) oldest = Math.max(oldest, now - p.sentAt)
  return {oldestMs: oldest, count: pending.size}
}

/**
 * Anything unanswered goes again, addressed to whoever we believe the host is
 * right now — so a retry that spans a host change reaches the new one.
 */
const chaseIntents = () => {
  if (isHost() || !pending.size) return
  const now = Date.now()
  let changed = false

  for (const [id, p] of [...pending]) {
    if (now - p.sentAt > ACK_GIVE_UP_MS) {
      pending.delete(id)
      changed = true
      continue
    }
    if (now - p.triedAt < ACK_RETRY_MS) continue
    p.triedAt = now
    send('intent', {id, ...p.intent}, shared?.hostId ?? '*')
    changed = true
  }
  if (changed || pending.size) publish()
}

// -------------------------------------------------------------------- wiring

const proofFor = async (password: string | null) =>
  password ? await sha256Hex(`${roomId}:${password}`) : null

export const start = () => {
  if (started) return
  started = true
  // Joiners arrive with a room in the hash, so discovery can begin at once.
  // Creators have no room yet — createRoom boots the mesh.
  if (joinedExisting) startMesh()

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
    const msg = body as StateMsg

    let next: Shared | null = null
    if ('full' in msg) {
      next = msg.full
    } else {
      const have = shared?.steps ?? []
      const stale = have.length < msg.base || (msg.mark !== undefined && markOf(have, msg.base) !== msg.mark)
      if (stale) {
        send('resync', {want: 'state', have: whereWeAre()}, msg.meta.hostId)
        return
      }
      next = {...msg.meta, steps: [...have.slice(0, msg.base), ...msg.add]}
    }
    if (!next) return

    rivalHosts.set(next.hostId, Date.now())
    if (isHost() && shared && next.hostId !== self) {
      // We are the one that came back with an old copy: fall in line.
      if (erases(shared, next)) {
        flash('The game had moved on without this tab')
        adopt(next, true)
        return
      }
      const mine = shared.hostEpoch
      const theyWin = next.hostEpoch > mine || (next.hostEpoch === mine && next.hostId < self)
      if (!theyWin || erases(next, shared)) {
        sendFull(shared, next.hostId)
        return
      }
      flash('Two hosts met; the room re-synced')
    }
    // A delta only makes sense from the host it extends. A whole room is
    // checked on its own merits, so a peer can answer a resync with one.
    if ('add' in msg && env.from !== next.hostId) return
    adopt(next)
  })

  on('beat', (body, env) => {
    const beat = (body ?? {}) as Partial<Shared>
    rivalHosts.set(env.from, Date.now())
    if (!shared) return

    // A host we do not follow, running ahead of the one we do. Ask it for the
    // room rather than sitting on a stale one until a state broadcast happens
    // to reach us — this is what settles two hosts without anyone being told.
    if (env.from !== shared.hostId) {
      if ((beat.hostEpoch ?? 0) > shared.hostEpoch)
        send('resync', {want: 'state', have: whereWeAre()}, env.from)
      return
    }
    lastHostAt = Date.now()
    if (beat.hostHidden !== shared.hostHidden) {
      shared = {...shared, hostHidden: !!beat.hostHidden}
      publish()
    }
    if ((beat.version ?? 0) > shared.version)
      send('resync', {want: 'state', have: whereWeAre()}, shared.hostId)
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
    const {to, epoch, state} = (body ?? {}) as {to?: PlayerId; epoch?: number; state?: Shared}
    if (to !== self) {
      lastHostAt = 0
      return
    }
    // The room as the outgoing host had it, not as we did: a successor picked
    // by id may have missed the last few broadcasts.
    if (state && (!shared || outranks(state, shared))) shared = state
    promoteSelf(epoch ?? (shared?.hostEpoch ?? 0) + 1)
  })

  on('intent', (body, env) => {
    if (!isHost()) return
    const {id, ...intent} = (body ?? {}) as {id?: string} & Intent

    // No id is a client on an older build: carry it out, with nobody to tell.
    if (!id) {
      applyIntent(env.from, intent as Intent)
      return
    }
    // Already done. The acknowledgement is what went missing, so send it again
    // rather than doing the thing twice.
    if (!applied.has(id)) {
      applied.add(id)
      if (applied.size > APPLIED_MEMORY) applied.delete(applied.values().next().value as string)
      applyIntent(env.from, intent as Intent)
    }
    send('ack', {id}, env.from)
  })

  on('ack', body => {
    const {id} = (body ?? {}) as {id?: string}
    if (!id || !pending.delete(id)) return
    publish()
  })

  on('tally', (body, env) => {
    if (!isHost()) return
    recordTally(env.from, (body ?? {}) as {chats: number; marks: number})
  })

  on('presence', body => {
    const msg = (body ?? {}) as {kind?: string; undone?: string; count?: number}
    if (isHost()) return
    if (msg.kind === 'restored') {
      lost = null
      flash(`The host restored ${msg.count ?? ''} erased moves`.replace('  ', ' '))
      return
    }
    if (msg.kind !== 'rewound') return
    flash(msg.undone ? `The host took back ${msg.undone}` : 'The host rewound the game')
  })

  on('lost', body => {
    if (!isHost() || !shared) return
    const found = body as Erased
    if (!found?.seed || !Array.isArray(found.steps)) return
    keepLost(found)
    const back = restorable()
    if (back && back.cursor - shared.cursor > AUTO_RESTORE_OVER) restore()
    else publish()
  })

  /**
   * Answered by anyone holding something newer, not only by the host.
   *
   * Every client keeps the whole room, stamped with an epoch and a version, so
   * a peer who can reach you when the host cannot is a perfectly good source
   * for it. adopt() already refuses anything not newer than what it holds, so
   * an answer from a peer that turns out to be behind costs one message.
   */
  on('resync', (body, env) => {
    if (!shared) return
    const {want, hash, have} = (body ?? {}) as {
      want?: string
      hash?: string
      have?: {epoch: number; version: number}
    }

    if (want === 'words') {
      const key = hash ?? shared.settings.wordListHash
      if (words.get(key).length) send('words', {hash: key, words: words.get(key)}, env.from)
      return
    }

    const newer =
      !have ||
      shared.hostEpoch > have.epoch ||
      (shared.hostEpoch === have.epoch && shared.version > have.version)
    if (!isHost() && !newer) return
    sendFull(shared, env.from)
  })

  onNetChange(monitor)
  setInterval(monitor, 500)
  setInterval(nagUntilSeated, 500)
  setInterval(chaseIntents, 500)
  setInterval(reportTally, TALLY_MS)
  setInterval(() => {
    if (!isHost() && shared) send('presence', {kind: 'here'}, shared.hostId)
  }, HERE_MS)
  startSeatClaim()

  document.addEventListener('visibilitychange', () => {
    hiddenSince = document.hidden ? Date.now() : 0
    if (!document.hidden) {
      degrading = false
      lastBeatAt = 0
      wokeUp()
    }
    publish()
    if (!isHost()) return
    hostMutate(draft => ({...draft, hostHidden: document.hidden, hostDegraded: degrading}))
    if (!document.hidden && !wakeLock) takeWakeLock()
  })

  watchForTwins()

  addEventListener('pageshow', e => {
    if ((e as PageTransitionEvent).persisted) wokeUp()
  })

  addEventListener('beforeunload', () => {
    if (!isHost() || !shared) return
    const to = bestSuccessor()
    if (to) send('handoff', {to, epoch: shared.hostEpoch + 1, state: shared})
  })
}

/**
 * Two tabs in one seat send from one id and are answered at whichever spoke
 * last. The tab opened most recently is the one the player is looking at, so
 * it announces itself on arrival and any earlier tab holding the same id steps
 * out of the room, handing hosting on first if it had it.
 */
const TAB = newRoomId()
const SEAT_CHANNEL = 'cn.seat'

const displace = () => {
  if (role === 'displaced') return
  if (isHost() && shared) {
    const to = bestSuccessor()
    if (to) send('handoff', {to, epoch: shared.hostEpoch + 1, state: shared})
    demote()
  }
  role = 'displaced'
  void stopMesh()
  publish()
}

const watchForTwins = () => {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(SEAT_CHANNEL)
  channel.onmessage = e => {
    const msg = e.data as {id?: string; tab?: string; room?: string}
    if (msg.id === self && msg.tab !== TAB && msg.room === roomId) displace()
  }
  channel.postMessage({id: self, tab: TAB, room: roomId})
}

/**
 * A tab coming back has a clock that was not running: the host has not been
 * silent, it has not been listened to. The window starts again from now, and
 * the room is asked for rather than waited on.
 */
export const wokeUp = () => {
  lastHostAt = Date.now()
  if (electionTimer) {
    clearTimeout(electionTimer)
    electionTimer = null
  }
  if (role === 'electing') role = 'client'
  claims = []
  if (!isHost() && shared) send('resync', {want: 'state', have: whereWeAre()}, shared.hostId)
}

// ------------------------------------------------------------- entry points

export const createRoom = async (name: string, password: string | null) => {
  start()
  openRoom()
  startMesh()
  myName = name
  saveSession({name, password})
  setPrefs({name})
  rememberSeat(name)
  passwordHash = await proofFor(password)
  const {hash} = await words.resolve({kind: 'packs', packs: ['original']})
  becomeHost({
    version: 1,
    hostId: self,
    hostEpoch: 1,
    hostHidden: document.hidden,
    hostDegraded: false,
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
  setPrefs({name})
  rememberSeat(name)
  role = 'joining'
  publish()
  myProof = await proofFor(password)
  sayHello()
}

const sayHello = () => {
  saidHelloAt = Date.now()
  send('hello', {name: myName, proof: myProof})
}

/**
 * Keep introducing ourselves until the host has us in the room.
 *
 * Hello went out exactly once, and the mesh promises neither delivery nor a
 * route — so losing that one message left a player in a room that did not know
 * they were there. The state broadcasts still arrive, so the lobby renders and
 * everything looks fine, but the host has no player for them: their team cannot
 * be set, their intents are dropped on the floor because there is no player to
 * check them against, and chat addressed from a roster they are not on skips
 * them. A spymaster in that state can watch the game and not give a clue.
 *
 * The host answers a repeat with the same welcome, so saying it twice costs a
 * message and nothing else.
 */
const HELLO_AGAIN_MS = 1_500

/**
 * Chat and marks are reported rather than observed: the host is the one copy
 * everybody reads, so everyone ends the game looking at the same numbers.
 *
 * Not an intent. Nothing in the game turns on it, and an unacknowledged intent
 * is reported to the player as a move that is not getting through.
 */
const reportTally = () => {
  if (!shared) return
  const start = shared.steps.find(s => s.t === 'start')
  const counts = takeTally(start?.t === 'start' ? start.seed : '')
  if (!counts) return
  if (isHost()) recordTally(self, counts)
  else send('tally', counts, shared.hostId)
}

const recordTally = (from: PlayerId, counts: {chats: number; marks: number}) => {
  if (!shared?.players.some(p => p.id === from)) return
  const bounded = (n: unknown) => Math.max(0, Math.min(9_999, Math.floor(Number(n) || 0)))
  upsertPlayer(from, {chats: bounded(counts.chats), marks: bounded(counts.marks)})
}

const nagUntilSeated = () => {
  if (isHost() || role === 'rejected' || !joinedExisting) return
  if (shared?.players.some(p => p.id === self)) return
  if (Date.now() - saidHelloAt < HELLO_AGAIN_MS) return
  sayHello()
}

export const setPassword = async (password: string | null) => {
  if (!isHost()) return
  passwordHash = await proofFor(password)
  saveSession({password})
  publish()
}

export const hasPassword = () => passwordHash !== null

/** The plaintext, for the host's own invite link. Nobody else's session holds one worth sharing. */
export const myPassword = () => (isHost() ? (loadSession()?.password ?? null) : null)

export const setWordSource = async (source: words.Source, label: string) => {
  if (!isHost()) return
  const {hash, words: list} = await words.resolve(source)
  words.rememberSource(source, label)
  intend({kind: 'updateSettings', patch: {wordListHash: hash, wordListName: label}})
  send('words', {hash, words: list})
}

export const setBoardSize = (size: BoardSize, preset: {teamCards: number; assassins: number}) =>
  intend({kind: 'updateSettings', patch: {size, ...preset}})

/** The name follows the player: into the room, into prefs, and onto the held seat. */
export const rename = (name: string) => {
  const trimmed = name.trim().slice(0, 24)
  if (!trimmed || trimmed === myName) return
  myName = trimmed
  saveSession({name: trimmed})
  setPrefs({name: trimmed})
  rememberSeat(trimmed)
  intend({kind: 'setName', name: trimmed})
}

export const setAvatar = (avatar: Avatar) => {
  myAvatar = avatar
  setPrefs({avatar})
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

export const getRoom = () => snapshot

export const subscribeRoom = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
