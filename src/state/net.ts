import {useSyncExternalStore} from 'react'
import type {Mesh} from '../net/mesh'
import {newRoomId, playerId, roomFromHash, setRoomHash} from '../net/identity'
import type {Envelope, MessageKind, PlayerId} from '../net/protocol'

export type Handler = (body: unknown, env: Envelope) => void

/**
 * A room is only created when someone asks for one. Arriving on the page used to
 * mint an id and publish it to the hash immediately, which meant every visitor
 * opened a room whether or not they ever pressed the button.
 *
 * Joiners still prewarm: they arrive with an id in the hash, so discovery starts
 * while they are typing a name. Creators trade that for not making a room by
 * accident, which is the right way round.
 *
 * A live binding, so importers see the id the moment it is assigned.
 */
export let roomId = roomFromHash() ?? ''
export const joinedExisting = roomFromHash() !== null

export const openRoom = () => {
  if (!roomId) {
    roomId = newRoomId()
    setRoomHash(roomId)
  }
  return roomId
}

type Report = ReturnType<Mesh['report']>

const EMPTY: Report = {
  transports: [],
  peers: [],
  router: {directPeers: 0, sent: 0, received: 0, forwarded: 0, dropped: 0, held: 0}
}

let mesh: Mesh | null = null
let booting: Promise<Mesh> | null = null
const outbox: Array<[MessageKind, unknown, PlayerId | '*', number | undefined]> = []
const handlers = new Map<MessageKind, Set<Handler>>()
const listeners = new Set<() => void>()

let snapshot = {report: EMPTY, revision: 0}

const publish = () => {
  snapshot = {report: mesh ? mesh.report() : snapshot.report, revision: snapshot.revision + 1}
  listeners.forEach(l => l())
}

/**
 * When each player was last heard from, by any route.
 *
 * `peers()` is direct links only, and the mesh forwards: a player two hops away
 * plays the game perfectly while having no link to the host at all. Deciding
 * who is present from direct links alone marks those players as having dropped
 * while they are sitting there taking turns.
 */
const heard = new Map<PlayerId, number>()

export const lastHeardFrom = (id: PlayerId) => heard.get(id) ?? 0

const dispatch = (env: Envelope, body: unknown) => {
  if (env.from && env.from !== playerId) heard.set(env.from, Date.now())
  handlers.get(env.kind)?.forEach(h => h(body, env))
}

/**
 * The transport stack is a third of the bundle, so it loads as its own chunk
 * after first paint. Anything sent before it lands waits in the outbox.
 */
export const startMesh = () => {
  if (!roomId) throw new Error('no room')
  if (booting) return booting
  booting = import('../net/mesh').then(({createMesh}) => {
    mesh = createMesh({roomId, onEnvelope: dispatch, onChange: publish})
    for (const [kind, body, to, ttl] of outbox.splice(0)) mesh.send(kind, body, to, ttl)
    publish()
    return mesh
  })
  return booting
}

export const send = (kind: MessageKind, body: unknown, to: PlayerId | '*' = '*', ttl?: number) => {
  if (mesh) mesh.send(kind, body, to, ttl)
  else {
    outbox.push([kind, body, to, ttl])
    void startMesh()
  }
}

export const on = (kind: MessageKind, handler: Handler) => {
  const set = handlers.get(kind) ?? new Set<Handler>()
  set.add(handler)
  handlers.set(kind, set)
  return () => {
    set.delete(handler)
  }
}

export const peers = () => mesh?.peers() ?? []

export const refreshStats = () => mesh?.refreshStats() ?? Promise.resolve()

export const useNet = () =>
  useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
    () => snapshot
  )

export const self = playerId

export const meshStarted = () => booting !== null

export const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
