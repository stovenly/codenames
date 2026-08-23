import {useSyncExternalStore} from 'react'
import type {PlayerId} from '../net/protocol'
import {TTL_DEFAULT} from '../net/protocol'
import {on, self, send} from './net'
import {derive} from '../game/reducer'
import * as words from './words'
import {getRoom, subscribeRoom} from './room'

/**
 * Where each player says they are looking. Peer to peer rather than through the
 * host: the point is that everyone sees your avatar land on the card at once,
 * and a lost one costs a stale marker, never a desync.
 *
 * A message says where somebody's mark **is**, not what changed about it.
 * Deltas cost a mark forever: moving one used to send "off the old" and "on the
 * new" as two messages, and the mesh guarantees neither delivery nor order, so
 * one dropped or overtaken "off" left that player holding two marks on every
 * screen but their own. Stating the whole truth each time cannot drift.
 *
 * The sequence number is the other half of it. Two messages from one player can
 * arrive by different routes in the wrong order, and an older one landing last
 * would otherwise undo the newer.
 */
type Arm = {kind?: string; card?: number | null; seq?: number}

const listeners = new Set<() => void>()
/**
 * Whether a mark means anything right now, read from the authoritative cursor
 * rather than the visual one.
 *
 * The two disagree for the length of a reveal, and that gap is a race: a player
 * whose wrong guess has already ended the turn is still watching the wheel, so
 * their board still invites a pick, and the mark they make lands on everyone
 * else's board after the turn change has swept it. Nothing clears it again
 * until the next turn ends, so an avatar sits on a card nobody is considering.
 */
const marksAllowed = () => {
  const {shared} = getRoom()
  if (!shared) return false
  const view = derive(
    shared.settings,
    words.get(shared.settings.wordListHash),
    shared.steps,
    shared.cursor
  )
  return view.phase === 'guess'
}

/** One card each, at most. */
let mark = new Map<PlayerId, number>()
let heard = new Map<PlayerId, number>()
let sent = 0
let snapshot: ReadonlyMap<number, ReadonlySet<PlayerId>> = new Map()
let lastTurnKey = ''
let wired = false

/** The render wants it the other way round: who is on each card. */
const byCard = () => {
  const out = new Map<number, Set<PlayerId>>()
  for (const [who, card] of mark) {
    const at = out.get(card) ?? new Set<PlayerId>()
    at.add(who)
    out.set(card, at)
  }
  return out
}

const publish = () => {
  snapshot = byCard()
  listeners.forEach(l => l())
}

export const clearMarks = () => {
  if (!mark.size) return
  mark = new Map()
  publish()
}

export const myMark = () => mark.get(self) ?? null

/** The same snapshot useMarks subscribes to, for anything that is not a component. */
export const getMarksSnapshot = () => snapshot

export const setMyMark = (card: number | null) => {
  const allowed = card === null || marksAllowed()
  if (!allowed) return

  if (card === null) mark.delete(self)
  else mark.set(self, card)
  publish()
  send('presence', {kind: 'arm', card, seq: ++sent}, '*', TTL_DEFAULT)
}

export const clearMyMark = () => setMyMark(null)

export const startPresence = () => {
  if (wired) return
  wired = true

  on('presence', (body, env) => {
    const msg = (body ?? {}) as Arm
    if (msg.kind !== 'arm') return

    const seq = msg.seq ?? 0
    if (seq <= (heard.get(env.from) ?? 0)) return
    heard.set(env.from, seq)

    // Clearing is always honoured; setting one is not, because the sender may
    // still have been looking at a turn that is over.
    if (typeof msg.card === 'number' && marksAllowed()) mark.set(env.from, msg.card)
    else mark.delete(env.from)
    publish()
  })

  subscribeRoom(() => {
    const {shared} = getRoom()
    if (!shared) return

    // A marker means "I am considering this card, this turn". Only a turn change
    // or a rewind invalidates that — a guess mid-turn leaves it standing.
    const turns = shared.steps.slice(0, shared.cursor).filter(s => s.t === 'endTurn').length
    const key = `${turns}:${shared.steps.length === 0 ? 'reset' : 'live'}`
    if (key !== lastTurnKey) {
      lastTurnKey = key
      clearMarks()
      return
    }

    // Nobody is considering anything between turns, so nothing should be shown
    // as considered — including a mark that arrived just after the sweep.
    if (mark.size && !marksAllowed()) clearMarks()

    // Somebody who left the room does not get to keep pointing at a card.
    const here = new Set(shared.players.map(p => p.id))
    let dropped = false
    for (const who of [...mark.keys()]) {
      if (here.has(who)) continue
      mark.delete(who)
      heard.delete(who)
      dropped = true
    }
    if (dropped) publish()
  })
}

/** Subscribed, unlike myMark(): a component that only reads cannot know a pick happened. */
export const useMyMark = () => {
  useMarks()
  return myMark()
}

export const useMarks = () =>
  useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
    () => snapshot
  )
