import {AnimatePresence, motion} from 'motion/react'
import {memo, useEffect, useRef, useState} from 'react'
import type {Colour} from '../../game/board'
import type {Card as CardModel} from '../../game/reducer'
import type {Avatar as AvatarSpec, PlayerId} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {cx} from '../cx'
import {spring, useMotion} from '../motion'
import {sfx} from '../sound/audio'
import {INK, STAMP, SURFACE, Symbol} from './symbols'

export type CardPhase = 'idle' | 'windup' | 'landing' | 'aftermath'

const PATTERN: Record<Colour, string> = {
  red: 'repeating-linear-gradient(45deg, rgba(43,10,6,.26) 0 2px, transparent 2px 8px)',
  blue: 'radial-gradient(rgba(6,28,54,.30) 1.3px, transparent 1.5px)',
  neutral: 'none',
  assassin: 'repeating-linear-gradient(135deg, rgba(255,45,45,.26) 0 3px, transparent 3px 10px)'
}

/** The spymaster's key: a tint on the unlit plate, never the full face. */
const KEY_TINT: Record<Colour, string> = {
  red: 'rgba(240,68,56,.30)',
  blue: 'rgba(46,134,255,.30)',
  neutral: 'rgba(241,236,224,.12)',
  assassin: 'rgba(255,45,45,.30)'
}

const CYCLE: Colour[] = ['red', 'neutral', 'blue', 'assassin', 'neutral', 'red', 'assassin', 'blue']

/**
 * The tension build, played on the card being guessed rather than in a separate
 * prop: symbols churn and slow down while a light sweeps the bezel, and the
 * flip lands on whatever the host already decided. Nothing here knows the
 * answer — it cannot, or the churn would give it away early.
 */
const Windup = ({until}: {until: number}) => {
  const [i, setI] = useState(0)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let n = 0
    const tick = () => {
      n++
      setI(v => v + 1)
      // Decelerating, so the last few symbols land heavily instead of blurring past.
      timer = setTimeout(tick, Math.min(240, 45 + n * n * 1.1))
    }
    timer = setTimeout(tick, 45)
    return () => clearTimeout(timer)
  }, [until])

  return (
    <>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-1/2 z-10"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, rgba(255,197,61,.9) 40deg, transparent 90deg)'
        }}
        animate={{rotate: 360}}
        transition={{repeat: Infinity, duration: 0.62, ease: 'linear'}}
      />
      <span aria-hidden className="pointer-events-none absolute inset-[3px] z-10 rounded-sm bg-stage-000" />

      <motion.span
        key={i}
        initial={{scale: 0.55, opacity: 0}}
        animate={{scale: 1, opacity: 1}}
        transition={{duration: 0.1}}
        className="pointer-events-none absolute z-20 grid place-items-center"
      >
        <Symbol colour={CYCLE[i % CYCLE.length]!} className="size-[34cqw]" />
      </motion.span>
    </>
  )
}

const Burst = ({colour}: {colour: Colour}) => {
  const bits = useRef(
    Array.from({length: 22}, (_, i) => ({
      angle: (i / 22) * Math.PI * 2 + Math.random() * 0.3,
      distance: 48 + Math.random() * 60,
      size: 3 + Math.random() * 4,
      delay: Math.random() * 0.08,
      spin: Math.random() * 320 - 160
    }))
  ).current

  const tint =
    colour === 'red' ? '#FF7A5C' : colour === 'blue' ? '#6FB6FF' : colour === 'assassin' ? '#FF2D2D' : '#FFC53D'

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
          transition={{duration: 0.72, delay: b.delay, ease: [0.16, 1, 0.3, 1]}}
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
  windupUntil,
  dim,
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
  windupUntil: number
  dim: boolean
  spymaster: boolean
  interactive: boolean
  armed: boolean
  marks: ReadonlySet<PlayerId>
  avatars: Map<PlayerId, AvatarSpec>
  onArm: () => void
  onConfirm: () => void
  focused: boolean
}) => {
  const {reduced} = useMotion()
  const ref = useRef<HTMLButtonElement>(null)
  const [sheen, setSheen] = useState({x: 50, y: 50})

  const shown: Colour | null = card.revealed
    ? card.colour
    : phase === 'landing' || phase === 'aftermath'
      ? landedColour
      : null

  const faceUp = shown !== null
  const key = spymaster && !faceUp ? card.colour : null

  const move = (e: React.MouseEvent) => {
    if (reduced || !interactive) return
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    setSheen({x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100})
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={!interactive}
      aria-label={`${card.word}${faceUp ? `, ${STAMP[shown]}` : ''}`}
      aria-pressed={armed}
      onMouseMove={move}
      onMouseLeave={() => setSheen({x: 50, y: 50})}
      onMouseEnter={() => interactive && sfx.hover()}
      onClick={() => (armed ? onConfirm() : onArm())}
      animate={{
        scale: phase === 'windup' && !reduced ? 1.14 : armed && !faceUp ? 1.035 : 1,
        opacity: dim && !reduced ? 0.32 : 1,
        y: 0
      }}
      whileHover={interactive && !reduced ? {y: -4} : undefined}
      transition={spring.firm}
      style={{
        background: faceUp
          ? SURFACE[shown]
          : `linear-gradient(178deg, rgba(255,255,255,.06) 0%, transparent 20%), linear-gradient(180deg, ${
              key ? KEY_TINT[key] : 'rgba(27,39,64,0)'
            } 0%, transparent 62%), linear-gradient(180deg, #121A2E 0%, #0A0D18 100%)`,
        containerType: 'inline-size',
        zIndex: phase === 'windup' ? 30 : armed ? 10 : 1,
        boxShadow: faceUp
          ? 'inset 0 1px 0 rgba(255,255,255,.22), 0 2px 5px -3px rgba(0,0,0,.9)'
          : phase === 'windup'
            ? '0 0 0 2px rgba(255,197,61,.9), 0 26px 60px -20px rgba(0,0,0,1), 0 0 70px rgba(255,197,61,.45)'
            : armed
            ? 'inset 0 1px 0 rgba(255,255,255,.14), 0 0 0 2px rgba(255,197,61,.85), 0 16px 34px -18px rgba(0,0,0,1), 0 0 34px rgba(255,197,61,.30)'
            : 'inset 0 1px 0 rgba(255,255,255,.1), inset 0 -2px 8px rgba(0,0,0,.55), 0 10px 26px -16px rgba(0,0,0,.95)'
      }}
      className={cx(
        'relative grid aspect-[7/5] w-full place-items-center overflow-hidden rounded-md border text-center transition-[filter,border-color] duration-200',
        faceUp ? 'border-black/30' : 'border-gold-500/30 hover:border-gold-500/70',
        interactive ? 'cursor-pointer' : 'cursor-default',
        card.revealed && phase === 'idle' && 'brightness-[.82] saturate-[.72]',
        focused && 'outline-2 outline-lamp-500 outline-offset-2'
      )}
    >
      {!faceUp && !reduced && interactive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(40% 60% at ${sheen.x}% ${sheen.y}%, rgba(255,226,154,.14), transparent 70%)`
          }}
        />
      )}

      {faceUp && PATTERN[shown] !== 'none' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: PATTERN[shown],
            backgroundSize: shown === 'blue' ? '8px 8px' : undefined
          }}
        />
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: faceUp
            ? 'linear-gradient(168deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.05) 24%, transparent 52%)'
            : 'linear-gradient(168deg, rgba(255,255,255,.09) 0%, transparent 40%)'
        }}
      />

      <span
        className={cx(
          'type-plate relative z-20 px-1.5 transition-opacity duration-150',
          !faceUp && 'letterpress',
          phase === 'windup' && !reduced && 'opacity-0'
        )}
        style={{
          fontSize: 'clamp(10px, 15cqw, 30px)',
          color: faceUp ? INK[shown] : 'var(--color-text)'
        }}
      >
        {card.word}
      </span>

      {phase === 'windup' && !reduced && <Windup until={windupUntil} />}

      <AnimatePresence>
        {phase === 'landing' && shown && (
          <motion.span
            key="stamp"
            initial={reduced ? {opacity: 0} : {opacity: 0, scale: 2.2, rotate: -20}}
            animate={reduced ? {opacity: 1} : {opacity: 1, scale: 1, rotate: -10}}
            transition={reduced ? {duration: 0.12} : {type: 'spring', stiffness: 700, damping: 17}}
            className="type-marquee pointer-events-none absolute z-20 rounded-xs border-2 px-2 py-0.5"
            style={{
              fontSize: 'clamp(5px, 6.5cqw, 12px)',
              color: INK[shown],
              borderColor: INK[shown],
              background: 'rgba(255,255,255,.16)'
            }}
          >
            {STAMP[shown]}
          </motion.span>
        )}
      </AnimatePresence>

      {phase === 'aftermath' && !reduced && shown && shown !== 'neutral' && <Burst colour={shown} />}

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
                className="rounded-full ring-2 ring-lamp-500/80"
              >
                <AvatarView spec={avatar} size={20} className="rounded-full" />
              </motion.span>
            ) : null
          })}
        </span>
      )}

      {key && (
        <span
          aria-hidden
          className={cx(
            'absolute top-1.5 left-1.5 z-20 size-2 rounded-full',
            key === 'red'
              ? 'bg-red-lit'
              : key === 'blue'
                ? 'bg-blue-lit'
                : key === 'assassin'
                  ? 'bg-kill-lit'
                  : 'bg-bone/40'
          )}
        />
      )}

      <span className="sr-only">{index + 1}</span>
    </motion.button>
  )
}

/** 49 tiles re-render on every broadcast otherwise; only these inputs change a tile. */
export const Card = memo(
  CardBase,
  (a, b) =>
    a.card.word === b.card.word &&
    a.card.revealed === b.card.revealed &&
    a.card.colour === b.card.colour &&
    a.phase === b.phase &&
    a.landedColour === b.landedColour &&
    a.windupUntil === b.windupUntil &&
    a.dim === b.dim &&
    a.spymaster === b.spymaster &&
    a.interactive === b.interactive &&
    a.armed === b.armed &&
    a.focused === b.focused &&
    a.marks.size === b.marks.size &&
    [...a.marks].every(id => b.marks.has(id))
)
