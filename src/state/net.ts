import {useSyncExternalStore} from 'react'
import type {Mesh} from '../net/mesh'
import {newRoomId, playerId, roomFromHash, setRoomHash} from '../net/identity'
import type {Envelope, MessageKind, PlayerId} from '../net/protocol'

export type Handler = (body: unknown, env: Envelope) => void

/**
 * The room id exists before the player commits to anything: Trystero starts
 * gathering candidates while they are still typing a name, so the board is
 * populated the moment they hit enter. A minted-but-unused id costs nothing.
 */
export const roomId = roomFromHash() ?? newRoomId()
export const joinedExisting = roomFromHash() !== null

type Report = ReturnType<Mesh['report']>

const EMPTY: Report = {
  transports: [],
  peers: [],
  router: {directPeers: 0, sent: 0, received: 0, forwarded: 0, dropped: 0}
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

const dispatch = (env: Envelope, body: unknown) => {
  handlers.get(env.kind)?.forEach(h => h(body, env))
}

/**
 * The transport stack is a third of the bundle, so it loads as its own chunk
 * after first paint. Anything sent before it lands waits in the outbox.
 */
export const startMesh = () => {
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

export const publishRoomToHash = () => setRoomHash(roomId)
