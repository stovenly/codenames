/**
 * Presentational concealment, not security — every client holds full state, so
 * this only stops casual poking. One atob() on a captured message does not
 * yield readable JSON.
 */

const MASK_BYTES = 32

const expand = (salt: string): Uint8Array => {
  let h = 0x811c9dc5
  for (let i = 0; i < salt.length; i++) {
    h ^= salt.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const out = new Uint8Array(MASK_BYTES)
  for (let i = 0; i < MASK_BYTES; i++) {
    h ^= h << 13
    h >>>= 0
    h ^= h >>> 17
    h ^= h << 5
    h >>>= 0
    out[i] = h & 0xff
  }
  return out
}

const cache = new Map<string, Uint8Array>()

const maskFor = (salt: string) => {
  let m = cache.get(salt)
  if (!m) {
    m = expand(salt)
    cache.set(salt, m)
  }
  return m
}

const toB64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s)
}

const fromB64 = (s: string) => {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export const pack = (salt: string, value: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const m = maskFor(salt)
  for (let i = 0; i < bytes.length; i++) bytes[i]! ^= m[i % MASK_BYTES]!
  return toB64(bytes)
}

export const unpack = <T>(salt: string, blob: string): T | null => {
  try {
    const bytes = fromB64(blob)
    const m = maskFor(salt)
    for (let i = 0; i < bytes.length; i++) bytes[i]! ^= m[i % MASK_BYTES]!
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    return null
  }
}
