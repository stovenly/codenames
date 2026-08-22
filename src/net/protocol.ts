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
  | 'echo'

export type Envelope = {
  id: string
  from: PlayerId
  to: PlayerId | '*'
  ttl: number
  kind: MessageKind
  body: string
}

export const TTL_DEFAULT = 4
export const TTL_PRESENCE = 2
