import {createAvatar} from '@dicebear/core'
import {useEffect, useMemo, useState} from 'react'
import type {Avatar as AvatarSpec} from '../../game/types'
import {ensureStyle, styleFor} from './styles'

const cache = new Map<string, string>()

const render = (spec: AvatarSpec): string | null => {
  const key = `${spec.style}|${spec.seed}|${spec.bg}`
  const hit = cache.get(key)
  if (hit) return hit

  const style = styleFor(spec.style)
  if (!style) return null

  const svg = createAvatar(style, {
    seed: spec.seed,
    backgroundColor: [spec.bg.replace('#', '')],
    radius: 12,
    scale: 88
  } as never).toString()

  cache.set(key, svg)
  return svg
}

/** A style still downloading renders as this, not as another style's avatar. */
const Placeholder = ({size, bg}: {size: number; bg: string}) => (
  <span
    aria-hidden
    className="grid size-full place-items-center"
    style={{background: `#${bg.replace('#', '')}`}}
  >
    <svg viewBox="0 0 24 24" className="opacity-25" style={{width: size * 0.6}}>
      <circle cx="12" cy="9" r="4" fill="currentColor" />
      <path d="M3.5 23c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8z" fill="currentColor" />
    </svg>
  </span>
)

/** Nothing in the room ever waits on an avatar. */
export const AvatarView = ({
  spec,
  size = 48,
  className = ''
}: {
  spec: AvatarSpec
  size?: number
  className?: string
}) => {
  const [, bump] = useState(0)

  useEffect(() => ensureStyle(spec.style, () => bump(n => n + 1)), [spec.style])

  const svg = useMemo(
    () => render(spec),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.style, spec.seed, spec.bg, styleFor(spec.style) !== null]
  )

  if (!svg) {
    return (
      <span
        aria-hidden
        className={`block overflow-hidden rounded-md text-text-dim ${className}`}
        style={{width: size, height: size}}
      >
        <Placeholder size={size} bg={spec.bg} />
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className={`block overflow-hidden rounded-md ${className}`}
      style={{width: size, height: size}}
      dangerouslySetInnerHTML={{__html: svg}}
    />
  )
}
