import {AnimatePresence, motion} from 'motion/react'
import {memo, useEffect, useRef, useState} from 'react'
import type {Colour} from '../../game/board'
import type {Card as CardModel} from '../../game/reducer'
import type {Avatar as AvatarSpec, PlayerId} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {spring, useReducedMotion} from '../motion'
import {sfx} from '../sound/audio'

export type CardPhase = 'idle' | 'windup' | 'landing' | 'aftermath'

const SURFACE: Record<Colour, string> = {
  red: 'linear-gradient(150deg, #E0503F 0%, #B93A2C 100%)',
  blue: 'linear-gradient(150deg, #3D8BE8 0%, #2A63AA 100%)',
  neutral: 'linear-gradient(150deg, #E8E3D6 0%, #C3BCAA 100%)',
  assassin: 'linear-gradient(150deg, #14161F 0%, #05060A 100%)'
}

const STAMP: Record<Colour, string> = {
  red: 'RED AGENT',
  blue: 'BLUE AGENT',
  neutral: 'BYSTANDER',
  assassin: 'ASSASSIN'
}

const INK: Record<Colour, string> = {
  red: '#2A0C07',
  blue: '#071B33',
  neutral: '#2B2718',
  assassin: '#C41E1E'
}

const PATTERN: Record<Colour, string> = {
  red: 'repeating-linear-gradient(45deg, rgba(42,12,7,.28) 0 2px, transparent 2px 8px)',
  blue: 'radial-gradient(rgba(7,27,51,.32) 1.3px, transparent 1.5px)',
  neutral: 'none',
  assassin: 'repeating-linear-gradient(135deg, rgba(196,30,30,.30) 0 3px, transparent 3px 10px)'
}

const REEL: Colour[] = ['red', 'neutral', 'blue', 'assassin', 'neutral', 'red', 'blue', 'neutral']

/** Fast at first, then decelerating like a reel finding its detent. */
const useReel = (active: boolean, durationMs: number) => {
  const [colour, setColour] = useState<Colour>('neutral')

  useEffect(() => {
    if (!active) return
    let index = Math.floor(Math.random() * REEL.length)
    let elapsed = 0
    let handle: ReturnType<typeof setTimeout>

    const tick = () => {
      const progress = Math.min(1, elapsed / durationMs)
      setColour(REEL[index++ % REEL.length]!)
      sfx.reelTick(progress)
      const gap = 42 + 260 * Math.pow(progress, 2.4)
      elapsed += gap
      handle = setTimeout(tick, gap)
    }

    handle = setTimeout(tick, 0)
    return () => clearTimeout(handle)
  }, [active, durationMs])

  return colour
}

const Particles = ({colour}: {colour: Colour}) => {
  const bits = useRef(
    Array.from({length: 24}, (_, i) => ({
      angle: (i / 24) * Math.PI * 2 + Math.random() * 0.3,
      distance: 46 + Math.random() * 62,
      size: 3 + Math.random() * 4,
      delay: Math.random() * 0.09,
      spin: Math.random() * 300 - 150
    }))
  ).current

  const tint =
    colour === 'red' ? '#FF6B57' : colour === 'blue' ? '#5FA8FF' : colour === 'assassin' ? '#C41E1E' : '#F0D18A'

  return (
    <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          initial={{x: 0, y: 0, opacity: 1, rotate: 0, scale: 1}}
          animate={{
            x: Math.cos(b.angle) * b.distance,
            y: Math.sin(b.angle) * b.distance,
            opacity: 0,
            rotate: b.spin,
            scale: 0.4
          }}
          transition={{duration: 0.75, delay: b.delay, ease: [0.16, 1, 0.3, 1]}}
          style={{width: b.size, height: b.size * 2.2, background: tint, borderRadius: 1}}
          className="absolute"
        />
      ))}
    </span>
  )
}

const CardBase = ({
  card,
  index,
  phase,
  landedColour,
  spymaster,
  interactive,
  armed,
  marks,
  avatars,
  onArm,
  onConfirm,
  focused
}: {
  card: CardModel
  index: number
  phase: CardPhase
  landedColour: Colour | null
  spymaster: boolean
  interactive: boolean
  armed: boolean
  marks: ReadonlySet<PlayerId>
  avatars: Map<PlayerId, AvatarSpec>
  onArm: () => void
  onConfirm: () => void
  focused: boolean
}) => {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLButtonElement>(null)
  const [tilt, setTilt] = useState({x: 0, y: 0})
  const [glow, setGlow] = useState({x: 50, y: 50})

  const winding = phase === 'windup'
  const reelColour = useReel(winding && !reduced, 1500)

  const shown: Colour | null = card.revealed
    ? card.colour
    : phase === 'landing' || phase === 'aftermath'
      ? landedColour
      : winding && !reduced
        ? reelColour
        : null

  const faceUp = card.revealed || phase === 'landing' || phase === 'aftermath'
  const key = spymaster && !faceUp ? card.colour : null

  const move = (e: React.MouseEvent) => {
    if (reduced || !interactive) return
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const px = (e.clientX - box.left) / box.width
    const py = (e.clientY - box.top) / box.height
    setTilt({x: (0.5 - py) * 6, y: (px - 0.5) * 6})
    setGlow({x: px * 100, y: py * 100})
  }

  const leave = () => {
    setTilt({x: 0, y: 0})
    setGlow({x: 50, y: 50})
  }

  const surface = shown
    ? SURFACE[shown]
    : key
      ? `linear-gradient(150deg, ${
          key === 'red' ? 'rgba(224,80,63,.32)' : key === 'blue' ? 'rgba(61,139,232,.32)' : key === 'assassin' ? 'rgba(5,6,10,.85)' : 'rgba(232,227,214,.14)'
        } 0%, rgba(13,18,32,.9) 100%)`
      : 'linear-gradient(150deg, #1B2338 0%, #121829 100%)'

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={!interactive}
      aria-label={`${card.word}${faceUp ? `, ${STAMP[shown ?? 'neutral']}` : ''}`}
      aria-pressed={armed}
      onMouseMove={move}
      onMouseLeave={leave}
      onMouseEnter={() => interactive && sfx.hover()}
      onClick={() => (armed ? onConfirm() : onArm())}
      animate={{
        scale: winding ? 1.14 : phase === 'landing' ? 1.06 : armed ? 1.04 : 1,
        rotateX: reduced ? 0 : tilt.x,
        rotateY: reduced ? 0 : tilt.y,
        y: phase === 'aftermath' && shown && shown !== 'assassin' && !card.revealed ? 0 : 0
      }}
      whileHover={interactive && !reduced ? {y: -4} : undefined}
      transition={winding ? {...spring.heavy} : spring.firm}
      style={{
        background: surface,
        transformStyle: 'preserve-3d',
        containerType: 'inline-size',
        zIndex: winding || phase === 'landing' || phase === 'aftermath' ? 30 : armed ? 10 : 1,
        boxShadow: winding
          ? '0 30px 70px -20px rgba(0,0,0,1), 0 0 0 2px rgba(217,164,65,.9), 0 0 60px rgba(217,164,65,.35)'
          : faceUp
            ? '0 2px 6px -3px rgba(0,0,0,.8)'
            : armed
              ? '0 18px 40px -18px rgba(0,0,0,1), 0 0 0 2px rgba(217,164,65,.85)'
              : '0 10px 26px -16px rgba(0,0,0,.95)'
      }}
      className={`paper relative grid aspect-[7/5] w-full place-items-center overflow-hidden rounded-lg border text-center transition-[filter] ${
        faceUp ? 'border-black/25' : 'border-ink-600'
      } ${interactive ? 'cursor-pointer' : 'cursor-default'} ${
        card.revealed && phase === 'idle' ? 'saturate-[0.72] brightness-90' : ''
      } ${focused ? 'outline-2 outline-brass-400 outline-offset-2' : ''}`}
    >
      {!faceUp && !reduced && interactive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 transition-opacity"
          style={{
            background: `radial-gradient(38% 55% at ${glow.x}% ${glow.y}%, rgba(240,209,138,.16), transparent 70%)`
          }}
        />
      )}

      {shown && PATTERN[shown] !== 'none' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{backgroundImage: PATTERN[shown], backgroundSize: shown === 'blue' ? '8px 8px' : undefined}}
        />
      )}

      {phase === 'landing' && shown && !reduced && (
        <motion.span
          aria-hidden
          initial={{clipPath: 'circle(0% at 50% 50%)'}}
          animate={{clipPath: 'circle(140% at 50% 50%)'}}
          transition={{duration: 0.42, ease: [0.16, 1, 0.3, 1]}}
          className="pointer-events-none absolute inset-0"
          style={{background: SURFACE[shown]}}
        />
      )}

      <span
        className="type-display relative z-20 px-1 leading-tight"
        style={{
          fontSize: 'clamp(9px, 14cqw, 26px)',
          color: faceUp ? INK[shown ?? 'neutral'] : 'var(--color-text)',
          textShadow: faceUp ? 'none' : '0 1px 0 rgba(0,0,0,.5)'
        }}
      >
        {card.word}
      </span>

      <AnimatePresence>
        {phase === 'landing' && shown && (
          <motion.span
            key="stamp"
            initial={reduced ? {opacity: 0} : {opacity: 0, scale: 2.4, rotate: -22}}
            animate={reduced ? {opacity: 1} : {opacity: 1, scale: 1, rotate: -11}}
            transition={reduced ? {duration: 0.12} : {type: 'spring', stiffness: 700, damping: 17}}
            className="type-display pointer-events-none absolute z-20 rounded border-2 px-2 py-0.5"
            style={{
              fontSize: 'clamp(6px, 7cqw, 13px)',
              color: INK[shown],
              borderColor: INK[shown],
              background: 'rgba(255,255,255,.14)'
            }}
          >
            {STAMP[shown]}
          </motion.span>
        )}
      </AnimatePresence>

      {phase === 'aftermath' && !reduced && shown && shown !== 'neutral' && <Particles colour={shown} />}

      {winding && !reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-brass-200"
          animate={{opacity: [0.15, 0.9, 0.15]}}
          transition={{duration: 0.34, repeat: Infinity}}
        />
      )}

      {!faceUp && marks.size > 0 && (
        <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex -space-x-2">
          {[...marks].slice(0, 4).map(id => {
            const avatar = avatars.get(id)
            return avatar ? (
              <motion.span
                key={id}
                initial={reduced ? {opacity: 0} : {scale: 0, y: -10}}
                animate={{scale: 1, y: 0, opacity: 1}}
                exit={{scale: 0, opacity: 0}}
                transition={spring.firm}
                className="rounded-full border border-brass-400/70 bg-ink-900"
              >
                <AvatarView spec={avatar} size={20} className="rounded-full" />
              </motion.span>
            ) : null
          })}
        </span>
      )}

      {key && !faceUp && (
        <span
          aria-hidden
          className={`absolute top-1 left-1 z-20 size-2 rounded-full ${
            key === 'red'
              ? 'bg-red-glow'
              : key === 'blue'
                ? 'bg-blue-glow'
                : key === 'assassin'
                  ? 'bg-void-rim'
                  : 'bg-bone/40'
          }`}
        />
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,.07),inset_0_-2px_6px_rgba(0,0,0,.35)]"
      />
      <span className="sr-only">{index + 1}</span>
    </motion.button>
  )
}

/** 49 tiles re-render on every broadcast otherwise; only these inputs change what a tile looks like. */
export const Card = memo(
  CardBase,
  (a, b) =>
    a.card.word === b.card.word &&
    a.card.revealed === b.card.revealed &&
    a.card.colour === b.card.colour &&
    a.phase === b.phase &&
    a.landedColour === b.landedColour &&
    a.spymaster === b.spymaster &&
    a.interactive === b.interactive &&
    a.armed === b.armed &&
    a.focused === b.focused &&
    a.marks.size === b.marks.size &&
    [...a.marks].every(id => b.marks.has(id))
)
