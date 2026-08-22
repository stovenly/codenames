import {AnimatePresence, motion} from 'motion/react'
import {memo, useRef, useState} from 'react'
import type {Colour} from '../../game/board'
import type {Card as CardModel} from '../../game/reducer'
import type {Avatar as AvatarSpec, PlayerId} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {cx} from '../cx'
import {spring} from '../motion'
import {sfx} from '../sound/audio'
import {INK, STAMP, SURFACE, Symbol} from './symbols'

export type CardPhase = 'idle' | 'windup' | 'landing' | 'aftermath'

/**
 * The spymaster's key. Not a hint of a tint — a spymaster has seconds to read
 * twenty-five cards and pick one word, and the assassin is the one card that
 * ends the game, so it is solid black and carries a skull.
 */
const KEY_FACE: Record<Colour, string> = {
  red: 'linear-gradient(180deg, #8E2018 0%, #5E140F 100%)',
  blue: 'linear-gradient(180deg, #1B5AA8 0%, #103B71 100%)',
  neutral: 'linear-gradient(180deg, #3A3527 0%, #26231A 100%)',
  assassin: 'linear-gradient(180deg, #101014 0%, #000 100%)'
}

const FACES = 30
/** Faces fall, so the reel runs from the far end of the strip back toward the top. */
const START = 27
const SPUN = 6
/** Where it comes to rest; the faces either side exist only to overshoot into. */
const LAND = 2

const shuffleFaces = (): Colour[] => {
  const pool: Colour[] = ['red', 'blue', 'neutral', 'assassin']
  return Array.from({length: FACES}, () => pool[Math.floor(Math.random() * pool.length)]!)
}

const Face = ({colour}: {colour: Colour}) => (
  <span
    className="relative grid aspect-[7/5] w-full shrink-0 place-items-center"
    style={{background: SURFACE[colour], boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.55)'}}
  >
    <Symbol colour={colour} className="size-[38cqw] drop-shadow-[0_2px_3px_rgba(0,0,0,.45)]" />
  </span>
)

/**
 * One reel, the height of the card, spinning through whole card faces. It
 * decelerates through the windup without settling, because until the host's
 * step lands there is nothing to settle on — and then it overshoots the answer
 * by one and ticks back, the way a wheel does.
 *
 * The strip is random every time, so the run-up is never the same twice.
 */
const Reel = ({target, landMs}: {target: Colour | null; landMs: number}) => {
  const strip = useRef(shuffleFaces()).current
  /** Chosen once, so a re-render mid-tick cannot flip which way it settles. */
  const overshoot = useRef(Math.random() < 0.5 ? 1 : -1).current

  const faces = target ? strip.map((c, i) => (i === LAND ? target : c)) : strip
  const at = (i: number) => `${(-i * 100) / FACES}%`

  return (
    <span className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={{y: at(START)}}
        animate={target ? {y: [null, at(LAND + overshoot), at(LAND)]} : {y: at(SPUN)}}
        transition={
          target
            ? {duration: landMs / 1000, times: [0, 0.66, 1], ease: ['easeOut', 'easeInOut']}
            : {duration: 2.4, ease: [0.12, 0.55, 0.2, 1]}
        }
      >
        {faces.map((colour, i) => (
          <Face key={i} colour={colour} />
        ))}
      </motion.span>
    </span>
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
  onPick
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
  onPick: () => void
}) => {
    const ref = useRef<HTMLButtonElement>(null)
  const [sheen, setSheen] = useState({x: 50, y: 50})

  const shown: Colour | null = card.revealed
    ? card.colour
    : phase === 'landing' || phase === 'aftermath'
      ? landedColour
      : null

  const faceUp = shown !== null
  const key = spymaster && !faceUp ? card.colour : null
  const plate =
    'linear-gradient(178deg, rgba(255,255,255,.06) 0%, transparent 20%), linear-gradient(180deg, #121A2E 0%, #0A0D18 100%)'

  const move = (e: React.MouseEvent) => {
    if (!interactive) return
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
      onClick={onPick}
      animate={{
        scale: phase === 'windup' ? 1.14 : armed && !faceUp ? 1.035 : 1,
        opacity: dim ? 0.32 : 1,
        y: 0
      }}
      whileHover={interactive ? {y: -4} : undefined}
      transition={spring.firm}
      style={{
        background: faceUp ? SURFACE[shown] : key ? KEY_FACE[key] : plate,
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
        card.revealed && phase === 'idle' && 'brightness-[.82] saturate-[.72]'
      )}
    >
      {!faceUp && interactive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(40% 60% at ${sheen.x}% ${sheen.y}%, rgba(255,226,154,.14), transparent 70%)`
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
          (phase === 'windup' || phase === 'landing') && 'opacity-0'
        )}
        style={{
          fontSize: 'clamp(10px, 15cqw, 30px)',
          color: faceUp ? INK[shown] : key ? '#F5F1E6' : 'var(--color-text)'
        }}
      >
        {card.word}
      </span>

      {(phase === 'windup' || phase === 'landing') && (
        <Reel target={phase === 'landing' ? shown : null} landMs={windupUntil} />
      )}

      <AnimatePresence>
        {phase === 'aftermath' && shown && (
          <motion.span
            key="stamp"
            initial={{opacity: 0, scale: 2.2, rotate: -20}}
            animate={{opacity: 1, scale: 1, rotate: -10}}
            exit={{opacity: 0}}
            transition={{type: 'spring', stiffness: 700, damping: 17}}
            className="type-marquee pointer-events-none absolute z-20 rounded-xs border-2 whitespace-nowrap"
            style={{
              // Everything in card widths: fixed padding pushed the stamp past
              // the edge on a small board, where it was clipped mid-word.
              fontSize: 'clamp(9px, 11cqw, 26px)',
              padding: '0.6cqw 2.4cqw',
              letterSpacing: '0.06em',
              color: INK[shown],
              borderColor: INK[shown],
              background: 'rgba(255,255,255,.22)'
            }}
          >
            {STAMP[shown]}
          </motion.span>
        )}
      </AnimatePresence>

      {phase === 'aftermath' && shown && shown !== 'neutral' && <Burst colour={shown} />}

      {!faceUp && marks.size > 0 && (
        <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex -space-x-2">
          {[...marks].slice(0, 4).map(id => {
            const avatar = avatars.get(id)
            return avatar ? (
              <motion.span
                key={id}
                initial={{scale: 0, y: -10}}
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
        <Symbol
          colour={key}
          className="pointer-events-none absolute top-1 left-1 z-20 size-[13cqw] opacity-90"
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
    a.marks.size === b.marks.size &&
    [...a.marks].every(id => b.marks.has(id))
)
