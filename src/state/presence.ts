import {useSyncExternalStore} from 'react'
import type {PlayerId} from '../net/protocol'
import {TTL_PRESENCE} from '../net/protocol'
import {on, self, send} from './net'
import {getRoom, subscribeRoom} from './room'

/**
 * Arm markers are ephemeral and go peer to peer rather than through the host:
 * the point is that everyone sees your avatar land on the card immediately.
 * A lost one costs a stale marker for a second, never a desync.
 */
const THROTTLE_MS = 100

const listeners = new Set<() => void>()
let marks = new Map<number, Set<PlayerId>>()
let snapshot: ReadonlyMap<number, ReadonlySet<PlayerId>> = marks
let lastSent = 0
let lastTurnKey = ''
let wired = false

const publish = () => {
  snapshot = new Map([...marks].map(([k, v]) => [k, new Set(v)]))
  listeners.forEach(l => l())
}

const apply = (card: number, who: PlayerId, on_: boolean) => {
  const at = marks.get(card) ?? new Set<PlayerId>()
  if (on_) at.add(who)
  else at.delete(who)
  if (at.size) marks.set(card, at)
  else marks.delete(card)
  publish()
}

export const clearMarks = () => {
  if (!marks.size) return
  marks = new Map()
  publish()
}

export const armCard = (card: number, on_: boolean) => {
  apply(card, self, on_)
  const now = Date.now()
  if (now - lastSent < THROTTLE_MS && on_) return
  lastSent = now
  send('presence', {kind: 'arm', card, on: on_}, '*', TTL_PRESENCE)
}

export const myMark = () => {
  for (const [card, who] of marks) if (who.has(self)) return card
  return null
}

export const startPresence = () => {
  if (wired) return
  wired = true

  on('presence', (body, env) => {
    const msg = (body ?? {}) as {kind?: string; card?: number; on?: boolean}
    if (msg.kind === 'arm' && typeof msg.card === 'number') {
      apply(msg.card, env.from, !!msg.on)
    }
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
    }
  })
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
