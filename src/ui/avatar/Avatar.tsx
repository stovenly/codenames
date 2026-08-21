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

/** Nothing in the room ever waits on an avatar: an unloaded style renders as Shapes. */
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

  useEffect(() => {
    ensureStyle(spec.style, () => bump(n => n + 1))
  }, [spec.style])

  const svg = useMemo(
    () => render(spec) ?? render({...spec, style: 'shapes'}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.style, spec.seed, spec.bg, styleFor(spec.style) !== null]
  )

  return (
    <span
      aria-hidden
      className={`block overflow-hidden rounded-md ${className}`}
      style={{width: size, height: size}}
      dangerouslySetInnerHTML={{__html: svg ?? ''}}
    />
  )
}
