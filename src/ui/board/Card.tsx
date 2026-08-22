import {AnimatePresence, motion, useAnimationFrame, useMotionValue, useTransform} from 'motion/react'
import {memo, useEffect, useRef, useState} from 'react'
import type {Colour} from '../../game/board'
import type {Card as CardModel} from '../../game/reducer'
import type {Avatar as AvatarSpec, PlayerId} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {cx} from '../cx'
import {spring} from '../motion'
import {sfx} from '../sound/audio'
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

const FACES = 26
/** Faces fall, so the reel runs from the far end of the strip back toward the top. */
const START = 22
/** Where it comes to rest. The faces either side exist to be overshot into. */
const LAND = 3

const POOL: Colour[] = ['red', 'blue', 'neutral', 'assassin']

/** A different run-up every time, with the answer dropped into the resting slot. */
const buildStrip = (target: Colour): Colour[] => {
  const strip = Array.from({length: FACES}, () => POOL[Math.floor(Math.random() * POOL.length)]!)
  strip[LAND] = target
  // Never sit the answer directly above the window as the reel slows: seeing it
  // arrive one notch early is the whole tension given away for free.
  strip[LAND + 1] = POOL.filter(c => c !== target)[Math.floor(Math.random() * 3)]!
  return strip
}

const TAU = Math.PI * 2

const Face = ({colour}: {colour: Colour}) => (
  <span
    className="relative grid aspect-[7/5] w-full shrink-0 place-items-center"
    style={{background: SURFACE[colour], boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.55)'}}
  >
    <Symbol colour={colour} className="size-[38cqw] drop-shadow-[0_2px_3px_rgba(0,0,0,.45)]" />
  </span>
)

/**
 * The wheel, as a wheel.
 *
 * Keyframes were the wrong tool: each notch was its own eased segment, so
 * velocity fell to zero at every one of them and the run read as a series of
 * little stops. The interesting part of a real wheel — coming to rest half a
 * notch short, hanging, and being pulled over the crest — is not something to
 * script. It falls out of a detent and some friction on its own.
 *
 * Integrated in notch units, one notch being one card face:
 *
 *   a = -DRAG·v            the wheel losing speed
 *       -DETENT·sin(2πp)   the sprung pawl, zero on a notch, restoring around it
 *       +creep             a hand's weight, only while resting on the wrong notch
 *
 * The pawl term is what makes it hesitate; whether it hesitates a notch past
 * the answer or a notch short depends on how hard it was thrown, which is
 * jittered per spin. Creep is what guarantees the answer regardless — it is off
 * once the nearest notch is the right one, so the wheel is never dragged past.
 */
const DETENT = 34
const CREEP = 30
/** Above this the wheel is turning; below it, it is resting and a hand can decide. */
const RESTING = 5

const Reel = ({target, ms, settling}: {target: Colour; ms: number; settling: boolean}) => {
  const strip = useRef(buildStrip(target)).current
  const p = useMotionValue(START)
  const y = useTransform(p, v => `${(-v * 100) / FACES}%`)

  /**
   * Drag is set from the time available rather than picked: a wheel still
   * turning when the card is due to flip would be cut off mid-spin. Four time
   * constants is a stop, so aiming them at the first 40% of the windup leaves
   * the rest for whatever the pawl decides to do.
   *
   * Simulated over hundreds of spins: never leaves the strip, always comes to
   * rest on the answer, settles inside the budget, and changes direction at
   * least three times on the way.
   *
   * Thrown a notch long, with enough spread that where it runs out is genuinely
   * in doubt — free travel under drag alone being v0/drag.
   */
  const sim = useRef(
    (() => {
      const drag = 4 / ((ms / 1000) * 0.4)
      return {
        drag,
        v: -drag * (START - LAND + 1) * (0.95 + Math.random() * 0.1),
        elapsed: 0,
        done: false
      }
    })()
  ).current

  useAnimationFrame((_, delta) => {
    if (settling || sim.done) return

    // A backgrounded tab hands back one enormous frame; integrating it whole
    // would fire the wheel off the end of the strip.
    const dt = Math.min(delta, 34) / 1000
    sim.elapsed += dt

    // Out of time: lean on it so it is stopped before the card turns over,
    // rather than being cut off wherever it happens to be.
    const late = sim.elapsed > (ms / 1000) * 0.7
    const drag = late ? sim.drag * 2.5 : sim.drag

    const at = p.get()
    const notch = Math.round(at)
    // Only ever applied to a wheel that has stopped on the wrong notch. Applied
    // while it is still turning it would push all the way round the run and
    // throw it off the end of the strip.
    const resting = Math.abs(sim.v) < RESTING
    const pull =
      resting && notch !== LAND ? Math.sign(LAND - at) * (late ? CREEP * 2 : CREEP) : 0

    const a = -drag * sim.v - DETENT * Math.sin(TAU * at) + pull
    sim.v += a * dt
    const next = at + sim.v * dt
    p.set(next)

    if (notch === LAND && Math.abs(sim.v) < 0.3 && Math.abs(next - LAND) < 0.05) {
      p.set(LAND)
      sim.done = true
    }
  })

  useEffect(() => {
    if (settling) p.set(LAND)
  }, [settling, p])

  return (
    <motion.span
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      animate={{opacity: settling ? 0 : 1}}
      transition={{duration: settling ? 0.4 : 0, delay: settling ? 0.2 : 0}}
    >
      <motion.span className="absolute inset-x-0 top-0 flex flex-col" style={{y}}>
        {strip.map((colour, i) => (
          <Face key={i} colour={colour} />
        ))}
      </motion.span>

      {/* The window's own shadow, so faces arrive out of somewhere. */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,.55) 0%, transparent 22%, transparent 78%, rgba(0,0,0,.55) 100%)'
        }}
      />
    </motion.span>
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
  windupMs,
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
  reelColour: Colour | null
  windupMs: number
  dim: boolean
  spymaster: boolean
  interactive: boolean
  armed: boolean
  marks: ReadonlySet<PlayerId>
  avatars: Map<PlayerId, AvatarSpec>
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
          'type-plate relative z-20 px-1.5 transition-opacity duration-150',
          !faceUp && 'letterpress',
          // The stamp says what this card is; the word underneath it would only
          // be a second thing printed in the same place.
          (phase === 'windup' || phase === 'landing' || phase === 'aftermath') && 'opacity-0'
        )}
        style={{
          // Long words shrink rather than run off the card, which the wider
          // dyslexia-friendly face makes obvious.
          fontSize: `clamp(9px, ${Math.min(13, 66 / Math.max(5, card.word.length))}cqw, 28px)`,
          // A spent card keeps white type: dark ink on a faded plate is a
          // second thing to read past, not a card that has stopped mattering.
          color: spent ? 'var(--color-text)' : faceUp ? INK[shown] : key ? '#F5F1E6' : 'var(--color-text)'
        }}
      >
        {card.word}
      </span>

      {/* Held through the landing and faded out, so the face it stopped on does
          not blink into the word underneath it. */}
      {(phase === 'windup' || phase === 'landing') && (reelColour ?? shown) && (
        <Reel
          target={(reelColour ?? shown)!}
          ms={windupMs}
          settling={phase === 'landing'}
        />
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
              fontSize: 'clamp(11px, 17cqw, 34px)',
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

      {phase === 'aftermath' && shown && shown !== 'neutral' && <Burst colour={shown} />}

      {/* Sized against the card, not in pixels: on a big screen a 20px badge
          in the corner of a 200px plate is a speck. */}
      {!faceUp && marks.size > 0 && (
        <span className="pointer-events-none absolute -top-[2cqw] -right-[2cqw] z-20 flex -space-x-[3cqw]">
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
                <AvatarView
                  spec={avatar}
                  size={null}
                  className="size-[18cqw] max-h-9 min-h-4 max-w-9 min-w-4 rounded-full"
                />
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
    a.dim === b.dim &&
    a.spymaster === b.spymaster &&
    a.interactive === b.interactive &&
    a.armed === b.armed &&
    a.marks.size === b.marks.size &&
    [...a.marks].every(id => b.marks.has(id))
)
