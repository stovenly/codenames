import {motion} from 'motion/react'
import type {Team} from '../../game/types'
import {Bulbs, Label} from '../atoms'
import {cx} from '../cx'

/**
 * The board does not simply appear. Cutting from the lobby straight to
 * twenty-five live cards gives nobody a moment to notice the game started, or
 * to find out whose turn it is before the clock is already running.
 */
export const Curtain = ({team}: {team: Team}) => (
  <motion.div
    initial={{opacity: 0}}
    animate={{opacity: 1}}
    exit={{opacity: 0}}
    transition={{duration: 0.45}}
    className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-stage-000/94 backdrop-blur-sm"
  >
    <motion.span
      aria-hidden
      className="absolute inset-x-0 h-px"
      style={{
        background: `linear-gradient(90deg, transparent, ${
          team === 'red' ? 'var(--color-red-lit)' : 'var(--color-blue-lit)'
        }, transparent)`
      }}
      initial={{top: '38%', opacity: 0}}
      animate={{top: ['38%', '50%', '62%'], opacity: [0, 1, 0]}}
      transition={{duration: 1.6, times: [0, 0.4, 1]}}
    />

    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <Bulbs lit chase className="w-56" />

      <motion.span
        initial={{opacity: 0, scale: 0.86, filter: 'blur(10px)'}}
        animate={{opacity: 1, scale: 1, filter: 'blur(0px)'}}
        transition={{type: 'spring', stiffness: 180, damping: 18, delay: 0.15}}
        className="type-marquee text-4xl text-lamp-300 sm:text-6xl"
        style={{textShadow: '0 0 40px rgba(255,197,61,.4)'}}
      >
        Board is set
      </motion.span>

      <motion.span
        initial={{opacity: 0, y: 10}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.9, duration: 0.5}}
        className={cx(
          'type-marquee text-xl tracking-[0.14em] sm:text-2xl',
          team === 'red' ? 'text-red-lit' : 'text-blue-lit'
        )}
      >
        {team} goes first
      </motion.span>

      <motion.span
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{delay: 1.4, duration: 0.5}}
      >
        <Label>{team} spymaster is on the clock</Label>
      </motion.span>

      <Bulbs lit chase className="w-56" />
    </div>
  </motion.div>
)
