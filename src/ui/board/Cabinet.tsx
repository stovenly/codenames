import {motion} from 'motion/react'
import {useEffect, useState} from 'react'
import type {Colour} from '../../game/board'
import {Bulbs} from '../atoms'
import {cx} from '../cx'
import {useMotion} from '../motion'
import {sfx} from '../sound/audio'
import {STAMP, Symbol} from './symbols'

/**
 * The reel cabinet is a prop on the set, not a second visual language: same
 * lacquer, same gold bevel, same marquee lamps as everything else. It rises out
 * of the stage floor, spins, and drops away.
 *
 * All three reels land on the same symbol, because there is only ever one
 * outcome. That is the point — watching the first reel stop on a skull and then
 * waiting for the other two is a far worse way to find the assassin than seeing
 * the card flip.
 */
const STRIP: Colour[] = ['red', 'neutral', 'blue', 'neutral', 'assassin', 'red', 'blue', 'neutral']

const CELL = 74
const RISE_MS = 400
const SPINS = [900, 1350, 1800]

const Reel = ({
  colour,
  index,
  onStop
}: {
  colour: Colour
  index: number
  onStop: () => void
}) => {
  const target = STRIP.indexOf(colour)
  const loops = 6 + index * 2
  const cells = loops * STRIP.length + target

  return (
    <span className="relative block h-[74px] w-[70px] overflow-hidden rounded-sm border border-gold-500/25 bg-stage-000 shadow-[inset_0_10px_14px_-8px_rgba(0,0,0,1),inset_0_-10px_14px_-8px_rgba(0,0,0,1)]">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        initial={{y: 0}}
        animate={{y: -cells * CELL}}
        transition={{duration: SPINS[index]! / 1000, ease: [0.1, 0.62, 0.16, 1]}}
        onAnimationComplete={onStop}
      >
        {Array.from({length: cells + 1}, (_, i) => (
          <span key={i} className="grid h-[74px] w-[70px] shrink-0 place-items-center">
            <Symbol colour={STRIP[i % STRIP.length]!} className="size-9" />
          </span>
        ))}
      </motion.span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-sm"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,.75) 0%, transparent 26%, transparent 74%, rgba(0,0,0,.75) 100%)'
        }}
      />
    </span>
  )
}

export const Cabinet = ({word, colour}: {word: string; colour: Colour}) => {
  const {reduced} = useMotion()
  const [stopped, setStopped] = useState(0)
  const settled = stopped >= 3

  useEffect(() => {
    if (reduced) return
    const t = setTimeout(() => sfx.cabinet(), 0)
    return () => clearTimeout(t)
  }, [reduced])

  if (reduced) return null

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.18}}
    >
      <span aria-hidden className="absolute inset-0 bg-stage-000/88" />

      <motion.div
        initial={{y: '55vh', rotateX: 14, opacity: 0}}
        animate={{y: 0, rotateX: 0, opacity: 1}}
        exit={{y: '40vh', opacity: 0}}
        transition={{type: 'spring', stiffness: 150, damping: 20, mass: 1.1}}
        style={{perspective: 900}}
        className="relative"
      >
        <div className="plate gloss rounded-lg px-5 pt-3 pb-4 shadow-4">
          <Bulbs lit chase={!settled} className="mb-3" />

          <div className="mb-3 flex justify-center">
            <span className="type-plate letterpress rounded-sm border border-gold-500/40 bg-stage-000/70 px-4 py-1.5 text-lg text-gold-200">
              {word}
            </span>
          </div>

          <div className="relative flex gap-2 rounded-md border border-gold-500/30 bg-stage-000/60 p-2">
            {[0, 1, 2].map(i => (
              <Reel
                key={i}
                index={i}
                colour={colour}
                onStop={() => {
                  setStopped(n => n + 1)
                  sfx.detent(i)
                }}
              />
            ))}

            <motion.span
              aria-hidden
              className={cx(
                'pointer-events-none absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full',
                settled ? 'bg-lamp-300' : 'bg-gold-500/35'
              )}
              animate={settled ? {opacity: [1, 0.25, 1], scaleX: [1, 1.03, 1]} : {opacity: 0.5}}
              transition={settled ? {duration: 0.28, repeat: 3} : {duration: 0.2}}
            />
          </div>

          <motion.div
            className="mt-3 grid h-5 place-items-center"
            initial={{opacity: 0}}
            animate={{opacity: settled ? 1 : 0}}
            transition={{duration: 0.2}}
          >
            <span
              className={cx(
                'type-marquee text-[11px] tracking-[0.24em]',
                colour === 'assassin' ? 'text-kill-lit' : 'text-gold-200'
              )}
            >
              {STAMP[colour]}
            </span>
          </motion.div>

          <Bulbs lit={settled} chase={!settled} className="mt-3" />
        </div>

        <span
          aria-hidden
          className="absolute -inset-x-8 -bottom-10 h-16 rounded-[100%] blur-2xl"
          style={{background: 'radial-gradient(closest-side, rgba(255,197,61,.28), transparent)'}}
        />
      </motion.div>
    </motion.div>
  )
}

export const RISE = RISE_MS
