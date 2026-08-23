import {AnimatePresence, motion} from 'motion/react'
import {memo, useRef, useState} from 'react'
import type {Colour} from '../../game/board'
import type {Card as CardModel} from '../../game/reducer'
import type {Player, PlayerId, Team} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {cx} from '../cx'
import {spring} from '../motion'
import {sfx} from '../sound/audio'
import {Reel} from './Reel'
import {INK, STAMP, SURFACE, Symbol} from './symbols'

/** Read off a near-black stamp rather than off the card, so one set works on all four. */
const STAMP_INK: Record<Colour, string> = {
  red: 'var(--color-red-lit)',
  blue: 'var(--color-blue-lit)',
  neutral: 'var(--color-bone)',
  assassin: 'var(--color-kill-lit)'
}

export type CardPhase = 'idle' | 'windup' | 'landing' | 'aftermath'

/**
 * The spymaster's key. Not a hint of a tint — a spymaster has seconds to read
 * twenty-five cards and pick one word, and the assassin is the one card that
 * ends the game, so it is solid black and carries a skull.
 */
const KEY_FACE: Record<Colour, string> = {
  red: 'linear-gradient(180deg, var(--key-red-hi) 0%, var(--key-red-lo) 100%)',
  blue: 'linear-gradient(180deg, #1B5AA8 0%, #103B71 100%)',
  neutral: 'linear-gradient(180deg, #3A3527 0%, #26231A 100%)',
  assassin: 'linear-gradient(180deg, #101014 0%, #000 100%)'
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
    colour === 'red'
      ? 'var(--color-red-lit)'
      : colour === 'blue'
        ? 'var(--color-blue-lit)'
        : colour === 'assassin'
          ? 'var(--color-kill-lit)'
          : 'var(--color-lamp-500)'

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
  reelColour,
  reelTeam,
  onSettled,
  windupMs,
  dim,
  spymaster,
  interactive,
  armed,
  marks,
  people,
  onPick
}: {
  card: CardModel
  index: number
  phase: CardPhase
  landedColour: Colour | null
  reelColour: Colour | null
  reelTeam: Team | null
  onSettled: () => void
  windupMs: number
  dim: boolean
  spymaster: boolean
  interactive: boolean
  armed: boolean
  marks: ReadonlySet<PlayerId>
  people: Map<PlayerId, Player>
  onPick: () => void
}) => {
    const ref = useRef<HTMLButtonElement>(null)
  const [sheen, setSheen] = useState<{x: number; y: number} | null>(null)

  const shown: Colour | null = card.revealed
    ? card.colour
    : phase === 'landing' || phase === 'aftermath'
      ? landedColour
      : null

  const faceUp = shown !== null
  /** Turned over and done with — not the one currently being turned over. */
  const spent = card.revealed && phase === 'idle'
  const key = spymaster && !faceUp ? card.colour : null
  const plate =
    'linear-gradient(178deg, rgba(255,255,255,.06) 0%, transparent 20%), linear-gradient(180deg, #121A2E 0%, #0A0D18 100%)'

  /** Null until the pointer is actually over the card: a light under a cursor
      that is not there is just a permanent smudge behind the word. */
  const move = (e: React.MouseEvent) => {
    if (!interactive) return
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    setSheen({
      x: ((e.clientX - box.left) / box.width) * 100,
      y: ((e.clientY - box.top) / box.height) * 100
    })
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={!interactive}
      aria-label={`${card.word}${faceUp ? `, ${STAMP[shown]}` : ''}`}
      aria-pressed={armed}
      onMouseMove={move}
      onMouseLeave={() => setSheen(null)}
      onMouseEnter={() => interactive && sfx.hover()}
      onClick={onPick}
      animate={{
        scale: phase === 'windup' ? 1.14 : armed && !faceUp ? 1.035 : 1,
        // Spent cards drop right back so the live board is the only thing with
        // any presence. Set here rather than as a class: motion writes opacity
        // inline, and an inline value beats the class every time.
        opacity: dim ? 0.32 : spent ? 0.25 : 1,
        y: 0
      }}
      whileHover={interactive ? {y: -4} : undefined}
      transition={spring.firm}
      style={{
        background: faceUp ? SURFACE[shown] : key ? KEY_FACE[key] : plate,
        containerType: 'inline-size',
        // Raised for the whole reveal, not just the spin: the stamp hangs off
        // the edges, and cards later in the grid would paint over it.
        zIndex: phase === 'idle' ? (armed ? 10 : 1) : 30,
        boxShadow: faceUp
          ? 'inset 0 1px 0 rgba(255,255,255,.22), 0 2px 5px -3px rgba(0,0,0,.9)'
          : phase === 'windup'
            ? '0 0 0 2px rgba(255,197,61,.9), 0 26px 60px -20px rgba(0,0,0,1), 0 0 70px rgba(255,197,61,.45)'
            : armed
            ? 'inset 0 1px 0 rgba(255,255,255,.14), 0 0 0 2px rgba(255,197,61,.85), 0 16px 34px -18px rgba(0,0,0,1), 0 0 34px rgba(255,197,61,.30)'
            : 'inset 0 1px 0 rgba(255,255,255,.1), inset 0 -2px 8px rgba(0,0,0,.55), 0 10px 26px -16px rgba(0,0,0,.95)'
      }}
      className={cx(
        'relative grid aspect-[7/5] w-full place-items-center rounded-md border text-center transition-[filter,border-color] duration-200 select-none',
        faceUp ? 'border-black/30' : 'border-gold-500/30 hover:border-gold-500/70',
        interactive ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      {!faceUp && interactive && sheen && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(38% 56% at ${sheen.x}% ${sheen.y}%, rgba(255,226,154,.2), transparent 72%)`
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
          'type-plate relative z-20 max-w-full px-1.5 break-words transition-opacity duration-150',
          !faceUp && 'letterpress',
          // The stamp says what this card is; the word underneath it would only
          // be a second thing printed in the same place.
          (phase === 'windup' || phase === 'landing' || phase === 'aftermath') && 'opacity-0'
        )}
        style={{
          // Long words shrink rather than run off the card, which the wider
          // dyslexia-friendly face makes obvious.
          fontSize: `clamp(9px, ${Math.min(13, 66 / Math.max(5, card.word.length))}cqw, 44px)`,
          // A spent card keeps white type: dark ink on a faded plate is a
          // second thing to read past, not a card that has stopped mattering.
          color: spent ? 'var(--color-text)' : faceUp ? INK[shown] : key ? '#F5F1E6' : 'var(--color-text)'
        }}
      >
        {card.word}
      </span>

      {/* Held through the landing and faded out, so the face it stopped on does
          not blink into the word underneath it. */}
      {(phase === 'windup' || phase === 'landing') && (reelColour ?? shown) && reelTeam && (
        <Reel
          target={(reelColour ?? shown)!}
          team={reelTeam}
          ms={windupMs}
          settling={phase === 'landing'}
          onStopped={onSettled}
        />
      )}

      <AnimatePresence>
        {(phase === 'landing' || phase === 'aftermath') && shown && (
          <motion.span
            key="stamp"
            initial={{opacity: 0, scale: 2.2, rotate: -20}}
            animate={{opacity: 1, scale: 1, rotate: -10}}
            exit={{opacity: 0}}
            transition={{type: 'spring', stiffness: 700, damping: 17}}
            className={cx(
              'type-marquee pointer-events-none absolute z-30 rounded-xs border-2 whitespace-nowrap',
              // Pushed clear of the skull rather than printed across it.
              shown === 'assassin' && 'translate-y-[26cqw]'
            )}
            style={{
              // Everything in card widths: fixed padding pushed the stamp past
              // the edge on a small board, where it was clipped mid-word.
              fontSize: 'clamp(11px, 17cqw, 52px)',
              padding: '1cqw 3.5cqw',
              letterSpacing: '0.04em',
              // Opaque, so the stamp is one thing rather than two overlapping
              // ones, and dark whatever the face under it happens to be.
              color: STAMP_INK[shown],
              borderColor: STAMP_INK[shown],
              background: 'rgba(9,11,20,.93)',
              boxShadow: '0 4px 14px -6px rgba(0,0,0,.9)'
            }}
          >
            {STAMP[shown]}
          </motion.span>
        )}
      </AnimatePresence>

      {/* The assassin keeps its skull. The wheel stops on it, and taking it away
          the instant the stamp lands throws out the one image that says what
          just happened. */}
      {shown === 'assassin' && phase !== 'idle' && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute z-10 grid place-items-center"
          initial={{opacity: 0, scale: 1.25}}
          animate={{opacity: 1, scale: 1}}
          transition={spring.firm}
        >
          <Symbol colour="assassin" className="size-[46cqw] opacity-90" />
        </motion.span>
      )}

      {/* Still clipped: sparks crossing into a neighbouring card read as that
          card doing something. */}
      {phase === 'aftermath' && shown && shown !== 'neutral' && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
          <Burst colour={shown} />
        </span>
      )}

      {/* Sized against the card, not in pixels: on a big screen a 20px badge
          in the corner of a 200px plate is a speck. */}
      {!faceUp && marks.size > 0 && (
        <span className="pointer-events-none absolute -top-[2.5cqw] -right-[2.5cqw] z-40 flex -space-x-[3.5cqw]">
          {[...marks].slice(0, 4).map(id => {
            const who = people.get(id)
            return who ? (
              <motion.span
                key={id}
                initial={{scale: 0, y: -10}}
                animate={{scale: 1, y: 0, opacity: 1}}
                exit={{scale: 0, opacity: 0}}
                transition={spring.firm}
                // The badge owns the shape: the border and the clip are here,
                // and the face is whatever fills what is left. Rounding the
                // avatar itself relied on its own class winning against the one
                // it ships with, which is not something to rely on.
                className="size-[18cqw] max-h-12 min-h-5 max-w-12 min-w-5 shrink-0 overflow-hidden rounded-full border-solid bg-stage-000"
                style={{
                  borderColor: 'rgba(255,197,61,.9)',
                  borderWidth: 'clamp(1.5px, 0.7cqw, 4px)',
                  boxShadow: '0 2px 6px -1px rgba(0,0,0,.7)'
                }}
              >
                <AvatarView spec={who.avatar} size={null} className="size-full rounded-full" />
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
    a.reelColour === b.reelColour &&
    a.reelTeam === b.reelTeam &&
    a.dim === b.dim &&
    a.spymaster === b.spymaster &&
    a.interactive === b.interactive &&
    a.armed === b.armed &&
    a.marks.size === b.marks.size &&
    [...a.marks].every(id => b.marks.has(id))
)
