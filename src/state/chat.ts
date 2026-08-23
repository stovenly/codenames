import {useSyncExternalStore} from 'react'
import type {Team} from '../game/types'
import type {PlayerId} from '../net/protocol'
import {TTL_DEFAULT} from '../net/protocol'
import {on, self, send} from './net'
import {noteChat} from './tally'
import {getRoom} from './room'

export type Channel = 'all' | 'team' | 'spymasters'

export type Message = {
  id: string
  at: number
  from: PlayerId
  channel: Channel
  text: string
  /** Who they were at the time, not who they are now. */
  team: Team | null
  spymaster: boolean
}

/** A tab left open all evening should not grow without limit. */
const KEEP = 300
const MAX_LEN = 400

const listeners = new Set<() => void>()
let log: Message[] = []
let snapshot: readonly Message[] = log
let seenAt = 0
let wired = false

const publish = () => {
  snapshot = [...log]
  listeners.forEach(l => l())
}

const push = (msg: Message) => {
  if (log.some(m => m.id === msg.id)) return
  log = [...log, msg].slice(-KEEP)
  publish()
}

const me = () => getRoom().shared?.players.find(p => p.id === self) ?? null

/**
 * Who is allowed to see a channel right now. Used to address a message, not to
 * filter one on arrival: a message a player may not read is never sent to them,
 * which is the only concealment that survives a determined reader.
 */
const readersOf = (channel: Channel): PlayerId[] => {
  const players = getRoom().shared?.players ?? []
  if (channel === 'spymasters') return players.filter(p => p.spymaster).map(p => p.id)
  if (channel === 'team') {
    const mine = me()?.team
    return mine ? players.filter(p => p.team === mine).map(p => p.id) : []
  }
  return players.map(p => p.id)
}

/** True once the board is dealt and before the winner is known. */
const live = () => {
  const shared = getRoom().shared
  if (!shared) return false
  return shared.cursor > 0 && !shared.steps.slice(0, shared.cursor).some(s => s.t === 'end')
}

export const readable = (): Channel[] => {
  const mine = me()
  const out: Channel[] = ['all']
  if (!mine?.team) return out
  out.push('team')
  if (mine.spymaster) out.push('spymasters')
  return out
}

/**
 * Outside a live game there are no teams to speak to and no key left to
 * protect, so everyone is on All and nothing else. During one, a spymaster
 * writes only to the other spymasters — the one person who must not talk to
 * their team is given somewhere else to talk.
 */
export const writable = (channel: Channel): boolean => {
  const mine = me()
  if (!mine) return false
  if (!live()) return channel === 'all'
  if (mine.spymaster) return channel === 'spymasters'
  return channel === 'all' || (channel === 'team' && !!mine.team)
}

export const whyLocked = (channel: Channel): string | null => {
  if (writable(channel)) return null
  if (!live()) return 'Only All while the game is not running'
  if (me()?.spymaster) return 'Spymasters can only talk to each other'
  if (channel === 'team') return 'Take a seat on a team first'
  return 'Read-only'
}

let counter = 0

export const say = (channel: Channel, body: string) => {
  const text = body.trim().slice(0, MAX_LEN)
  if (!text || !writable(channel)) return

  const mine = me()
  const msg: Message = {
    id: `${self}-${Date.now().toString(36)}-${counter++}`,
    at: Date.now(),
    from: self,
    channel,
    text,
    team: mine?.team ?? null,
    spymaster: !!mine?.spymaster
  }
  push(msg)
  noteChat()
  seenAt = log.length

  for (const to of readersOf(channel)) {
    if (to === self) continue
    send('chat', msg, to, TTL_DEFAULT)
  }
}

export const startChat = () => {
  if (wired) return
  wired = true
  on('chat', body => {
    const msg = body as Message | null
    if (!msg?.id || typeof msg.text !== 'string') return
    push({...msg, text: msg.text.slice(0, MAX_LEN)})
  })
}

export const markRead = () => {
  if (seenAt === log.length) return
  seenAt = log.length
  publish()
}

export const unread = () => Math.max(0, log.length - seenAt)

export const useChat = () =>
  useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
    () => snapshot
  )
