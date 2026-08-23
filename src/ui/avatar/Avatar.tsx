import {createAvatar} from '@dicebear/core'
import {useEffect, useMemo, useState} from 'react'
import type {Avatar as AvatarSpec} from '../../game/types'
import {Agent} from '../board/symbols'
import {ensureStyle, styleFor} from './styles'

const cache = new Map<string, string>()

let unique = 0

/**
 * DiceBear names its internal elements with fixed ids — every avatar it
 * generates contains `id="viewboxMask"`. Inline more than one in a document and
 * every `url(#viewboxMask)` resolves to the first one, so each style ends up
 * masked by whichever avatar happens to be earliest in the DOM. Styles whose
 * viewBox differs from that one get clipped to a speck, or vanish: Pixel Art
 * draws in a 16-unit box and was being masked by a 980-unit mask.
 *
 * Prefixing every id and every reference to it keeps each avatar self-contained.
 * The result is cached with its prefix, so an avatar stays stable once made.
 */
const isolate = (svg: string) => {
  const p = `db${(unique++).toString(36)}-`
  return svg
    .replace(/id="([^"]+)"/g, (_, id: string) => `id="${p}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${p}${id})`)
    .replace(/((?:xlink:)?href)="#([^"]+)"/g, (_, attr: string, id: string) => `${attr}="#${p}${id}"`)
}

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
  } as never)
    .toString()
    // Attribution rides along in every generated file and ends up in the
    // accessibility tree and in textContent. The licence is credited in the
    // repo instead.
    .replace(/<metadata[\s\S]*?<\/metadata>/, '')

  const isolated = isolate(svg)
  cache.set(key, isolated)
  return isolated
}

/** A style still downloading renders as this, not as another style's avatar. */
const Placeholder = ({bg}: {bg: string}) => (
  <span
    aria-hidden
    className="grid size-full place-items-center"
    style={{background: `#${bg.replace('#', '')}`}}
  >
    <Agent className="w-3/5 opacity-25" />
  </span>
)

/** Nothing in the room ever waits on an avatar. */
export const AvatarView = ({
  spec,
  size = 48,
  className = ''
}: {
  spec: AvatarSpec
  /** null hands sizing to the class, for anywhere the box is a fraction of something. */
  size?: number | null
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
        style={size === null ? undefined : {width: size, height: size}}
      >
        <Placeholder bg={spec.bg} />
      </span>
    )
  }

  return (
    <span
      aria-hidden
      // Each style declares its own intrinsic size — Lorelei 980, Notionists
      // 1744, Pixel 16 — so the generated svg has to be told to fill the box or
      // it renders at its own scale and gets cropped to a speck.
      className={`block overflow-hidden rounded-md [&>svg]:size-full ${className}`}
      style={size === null ? undefined : {width: size, height: size}}
      dangerouslySetInnerHTML={{__html: svg}}
    />
  )
}
