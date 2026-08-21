const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

const randomFrom = (alphabet: string, length: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length]
  return out
}

export const newRoomId = () => randomFrom(ALPHABET, 10)
export const newEnvelopeId = () => randomFrom(ALPHABET, 8)

export const roomFromHash = (): string | null => {
  const m = /(?:^|[#&])r=([a-z0-9]{4,32})/.exec(location.hash)
  return m ? m[1]! : null
}

const PLAYER_KEY = 'cn.playerId'
const SEAT_KEY = 'cn.seat'

/** A tab still holding a seat refreshes this; a claim older than the window is free to take. */
const CLAIM_FRESH_MS = 15_000
const CLAIM_BEAT_MS = 5_000

export type Seat = {roomId: string; playerId: string; name: string; claimedAt: number}

const readSeat = (): Seat | null => {
  try {
    const raw = localStorage.getItem(SEAT_KEY)
    if (!raw) return null
    const seat = JSON.parse(raw) as Seat
    return seat.roomId === roomFromHash() && seat.playerId ? seat : null
  } catch {
    return null
  }
}

const writeSeat = (seat: Seat) => {
  try {
    localStorage.setItem(SEAT_KEY, JSON.stringify(seat))
  } catch {
    /* private mode; the seat lives for this session only */
  }
}

const sessionId = () => {
  try {
    return sessionStorage.getItem(PLAYER_KEY)
  } catch {
    return null
  }
}

const setSessionId = (id: string) => {
  try {
    sessionStorage.setItem(PLAYER_KEY, id)
  } catch {
    /* the id still holds for this page load */
  }
}

/**
 * Identity resolution, in order:
 *
 * 1. This tab's own id, so a refresh never loses the seat.
 * 2. The saved seat for this room, but only once its claim has gone stale —
 *    otherwise a second tab would adopt the identity of the first and the room
 *    would see one player speaking from two places.
 * 3. A fresh id.
 *
 * A seat whose claim is still warm is offered on the landing screen instead, so
 * taking it back is the player's explicit choice rather than a guess.
 */
const resolve = (): {id: string; resumed: boolean} => {
  const existing = sessionId()
  if (existing) return {id: existing, resumed: false}

  const seat = readSeat()
  if (seat && Date.now() - seat.claimedAt > CLAIM_FRESH_MS) {
    setSessionId(seat.playerId)
    return {id: seat.playerId, resumed: true}
  }

  const fresh = randomFrom(ALPHABET, 12)
  setSessionId(fresh)
  return {id: fresh, resumed: false}
}

const resolved = resolve()

export const playerId: string = resolved.id

/** True when this page load picked up a seat left behind by an earlier session. */
export const resumedSeat = resolved.resumed

/** A seat for this room that belongs to someone else's session, or to a still-open tab. */
export const offeredSeat = (): Seat | null => {
  const seat = readSeat()
  return seat && seat.playerId !== playerId ? seat : null
}

export const rememberSeat = (name: string) => {
  const roomId = roomFromHash()
  if (!roomId) return
  writeSeat({roomId, playerId, name, claimedAt: Date.now()})
}

export const holdSeat = () => {
  const seat = readSeat()
  if (seat?.playerId === playerId) writeSeat({...seat, claimedAt: Date.now()})
}

export const startSeatClaim = () => setInterval(holdSeat, CLAIM_BEAT_MS)

/** Take a seat back deliberately. The reload is what guarantees the mesh restarts as them. */
export const takeSeat = (seat: Seat) => {
  setSessionId(seat.playerId)
  writeSeat({...seat, claimedAt: Date.now()})
  location.reload()
}

export const abandonSeat = () => {
  try {
    localStorage.removeItem(SEAT_KEY)
    sessionStorage.removeItem(PLAYER_KEY)
  } catch {
    /* nothing to clear */
  }
  location.reload()
}

export const setRoomHash = (roomId: string) => {
  if (roomFromHash() === roomId) return
  history.replaceState(null, '', `${location.pathname}${location.search}#r=${roomId}`)
}

export const shareLink = (roomId: string) => `${location.origin}${location.pathname}#r=${roomId}`

export const sha256Hex = async (input: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
