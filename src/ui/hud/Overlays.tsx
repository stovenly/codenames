import {motion} from 'motion/react'
import {useReducedMotion} from '../motion'

/** A full takeover. Everything desaturates, the vignette pulses, and it holds. */
export const AssassinTakeover = () => {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: reduced ? 0.12 : 0.2}}
      className="pointer-events-none fixed inset-0 z-40"
    >
      <motion.span
        className="absolute inset-0"
        animate={
          reduced
            ? {opacity: 0.6}
            : {opacity: [0.25, 0.85, 0.4, 0.8, 0.35]}
        }
        transition={{duration: 2.2, times: [0, 0.2, 0.45, 0.7, 1]}}
        style={{
          background:
            'radial-gradient(120% 90% at 50% 50%, transparent 25%, rgba(196,30,30,.55) 75%, rgba(90,0,0,.92) 100%)'
        }}
      />
      {!reduced && (
        <motion.span
          className="absolute inset-x-0 top-1/2 h-px bg-void-rim"
          animate={{scaleX: [0, 1, 1], opacity: [0, 0.8, 0]}}
          transition={{duration: 1.1}}
        />
      )}
      <motion.span
        initial={reduced ? {opacity: 0} : {scale: 3, opacity: 0, rotate: -10}}
        animate={{scale: 1, opacity: 1, rotate: -4}}
        transition={reduced ? {duration: 0.12} : {type: 'spring', stiffness: 300, damping: 16}}
        className="type-display absolute inset-x-0 top-[42%] text-center text-4xl tracking-[0.2em] text-void-rim drop-shadow-[0_0_30px_rgba(196,30,30,.8)] sm:text-6xl"
      >
        ASSASSIN
      </motion.span>
    </motion.div>
  )
}

/** Fires with the correct-guess burst so the whole room feels the hit, not just the card. */
export const BoardBreath = ({team}: {team: 'red' | 'blue'}) => {
  const reduced = useReducedMotion()
  if (reduced) return null
  return (
    <motion.span
      aria-hidden
      initial={{opacity: 0}}
      animate={{opacity: [0, 0.5, 0]}}
      transition={{duration: 0.7, ease: 'easeOut'}}
      className="pointer-events-none fixed inset-0 z-30"
      style={{
        background: `radial-gradient(70% 55% at 50% 50%, ${
          team === 'red' ? 'rgba(255,107,87,.22)' : 'rgba(95,168,255,.22)'
        }, transparent 70%)`
      }}
    />
  )
}

export const SpymasterChrome = () => (
  <>
    {(['top-0', 'bottom-0'] as const).map(edge => (
      <span
        key={edge}
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 ${edge} z-30 flex h-6 items-center justify-center overflow-hidden`}
        style={{
          background:
            'repeating-linear-gradient(135deg, rgba(217,164,65,.85) 0 12px, rgba(7,10,20,.9) 12px 24px)'
        }}
      >
        <span className="type-mono rounded bg-ink-900/90 px-3 py-0.5 text-[10px] tracking-[0.35em] text-brass-200">
          EYES ONLY
        </span>
      </span>
    ))}
    <span
      aria-hidden
      className="type-display pointer-events-none fixed inset-0 z-20 grid select-none place-items-center overflow-hidden text-[18vw] leading-none text-brass-400/[0.045]"
      style={{transform: 'rotate(-22deg)'}}
    >
      SPYMASTER
    </span>
  </>
)
