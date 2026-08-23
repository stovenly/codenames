/** hex without the hash; `by` is toward black, negative toward white. */
export const shade = (hex: string, by: number) => {
  const n = parseInt(hex, 16)
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(by >= 0 ? c * (1 - by) : c + (255 - c) * -by)))
  const out = (mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255)
  return out.toString(16).padStart(6, '0')
}
