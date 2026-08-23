import {motion} from 'motion/react'
import {VenetianMask} from 'lucide-react'
import type {Team} from '../../game/types'
import {cx} from '../cx'

/**
 * The assassin kills the stage lights: true black first, then the emergency
 * wash. The blackout is what makes the red arrive as a shock rather than a
 * colour change.
 */
export const AssassinTakeover = () => {
    return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.1}}
      className="pointer-events-none fixed inset-0 z-40"
    >
      <motion.span
        className="absolute inset-0 bg-stage-000"
        animate={{opacity: [1, 1, 0.55, 0.7, 0.5]}}
        transition={{duration: 2.2, times: [0, 0.08, 0.3, 0.6, 1]}}
      />
      <motion.span
        className="absolute inset-0"
        animate={{opacity: [0, 0.9, 0.4, 0.85, 0.45]}}
        transition={{duration: 2.2, times: [0, 0.18, 0.42, 0.68, 1]}}
        style={{
          background:
            'radial-gradient(125% 90% at 50% 50%, transparent 18%, var(--glow-kill) 70%, var(--glow-kill-deep) 100%)'
        }}
      />
      {(
        <motion.span
          aria-hidden
          className="absolute inset-x-0 top-0 h-2 bg-kill-lit"
          animate={{opacity: [0, 1, 0.2, 1, 0.3]}}
          transition={{duration: 2.2, repeat: 0}}
          style={{filter: 'blur(6px)'}}
        />
      )}
      <motion.span
        initial={{scale: 2.8, opacity: 0, rotate: -8}}
        animate={{scale: 1, opacity: 1, rotate: -3}}
        transition={
          {type: 'spring', stiffness: 280, damping: 15, delay: 0.16}
        }
        className="type-marquee absolute inset-x-0 top-[42%] text-center text-4xl tracking-[0.16em] text-kill-lit sm:text-6xl"
        style={{textShadow: '0 0 46px var(--glow-kill-hot)'}}
      >
        Assassin
      </motion.span>
    </motion.div>
  )
}

/** Fires with the correct-guess burst so the whole room feels it, not just the plate. */
export const BoardBreath = ({team}: {team: 'red' | 'blue'}) => {
  return (
    <motion.span
      aria-hidden
      initial={{opacity: 0}}
      animate={{opacity: [0, 0.55, 0]}}
      transition={{duration: 0.7, ease: 'easeOut'}}
      className="pointer-events-none fixed inset-0 z-30"
      style={{
        background: `radial-gradient(70% 55% at 50% 50%, ${
          team === 'red' ? 'var(--glow-red-soft)' : 'rgba(111,182,255,.26)'
        }, transparent 70%)`
      }}
    />
  )
}

const WASH: Record<'red' | 'blue' | 'neutral', string> = {
  red: 'var(--glow-red-wash)',
  blue: 'rgba(46,134,255,.34)',
  neutral: 'rgba(214,199,166,.22)'
}

/**
 * A card that was not theirs. The wash comes in from the edges in the colour of
 * whatever they actually turned over, so the mistake is legible from across the
 * room before anyone reads the plate — and it clears in a second, because this
 * is a bad turn, not the end of the game.
 */
export const MissFlare = ({colour}: {colour: 'red' | 'blue' | 'neutral'}) => (
  <motion.span
    aria-hidden
    initial={{opacity: 0}}
    animate={{opacity: [0, 0.95, 0.3, 0.62, 0]}}
    transition={{duration: 1.15, times: [0, 0.07, 0.32, 0.5, 1], ease: 'easeOut'}}
    className="pointer-events-none fixed inset-0 z-30"
    style={{
      background: `radial-gradient(125% 90% at 50% 50%, transparent 32%, ${WASH[colour]} 100%)`
    }}
  />
)

/** The spymaster is in the booth: hazard bands, and a watermark a screen-share cannot hide. */
const BAND: Record<Team, string> = {
  red: 'from-red-500 to-red-deep',
  blue: 'from-blue-500 to-blue-deep'
}

/**
 * The same band a player card wears, run across the top of the screen: team
 * gradient, the mask, the word in marquee caps. Saying "spymaster" one way in
 * the roster and another way here would be two vocabularies for one fact.
 *
 * Sticky rather than fixed, so it takes its own space at the top of the page
 * instead of sitting on whatever was already there.
 */
export const SpymasterChrome = ({team}: {team: Team}) => (
  <span
    aria-hidden
    className={cx(
      'pointer-events-none sticky top-0 z-30 flex h-6 items-center justify-center gap-2 bg-gradient-to-r pt-[3px] text-white/95',
      BAND[team]
    )}
  >
    <VenetianMask className="size-3.5" />
    <span className="type-marquee text-[10px] tracking-[0.16em] drop-shadow-[0_1px_2px_rgba(0,0,0,.55)]">
      Spymaster
    </span>
  </span>
)
