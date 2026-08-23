export const APP_ID = 'codenames-briefing-room-v1'

export type PlayerId = string

export type MessageKind =
  | 'id'
  | 'hello'
  | 'welcome'
  | 'reject'
  | 'state'
  | 'intent'
  | 'beat'
  | 'claim'
  | 'handoff'
  | 'presence'
  | 'resync'
  | 'words'
  | 'chat'
  /** Client to host: what it did that the step log does not record. */
  | 'tally'
  | 'echo'
  /** Link-level only: never dispatched, never forwarded. */
  | 'ping'
  | 'pong'
  /** Host to client, naming the intent it applied. */
  | 'ack'

export type Envelope = {
  id: string
  from: PlayerId
  to: PlayerId | '*'
  ttl: number
  kind: MessageKind
  body: string
  /**
   * Per-sender counter, so a receiver can drop one overtaken in flight.
   * Optional: a client on an older build neither sends nor reads it.
   */
  seq?: number
}

export const TTL_DEFAULT = 4
export const TTL_PRESENCE = 2
