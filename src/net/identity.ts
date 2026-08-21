const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

const randomFrom = (alphabet: string, length: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length]
  return out
}

export const newRoomId = () => randomFrom(ALPHABET, 10)

export const newEnvelopeId = () => randomFrom(ALPHABET, 8)

const PLAYER_KEY = 'cn.playerId'

/** Survives a refresh, unlike Trystero's selfId, so a returning player keeps their seat. */
export const playerId: string = (() => {
  try {
    const existing = sessionStorage.getItem(PLAYER_KEY)
    if (existing) return existing
    const fresh = randomFrom(ALPHABET, 12)
    sessionStorage.setItem(PLAYER_KEY, fresh)
    return fresh
  } catch {
    return randomFrom(ALPHABET, 12)
  }
})()

export const roomFromHash = (): string | null => {
  const m = /(?:^|[#&])r=([a-z0-9]{4,32})/.exec(location.hash)
  return m ? m[1]! : null
}

export const setRoomHash = (roomId: string) => {
  if (roomFromHash() === roomId) return
  history.replaceState(null, '', `${location.pathname}${location.search}#r=${roomId}`)
}

export const shareLink = (roomId: string) =>
  `${location.origin}${location.pathname}#r=${roomId}`

export const sha256Hex = async (input: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
