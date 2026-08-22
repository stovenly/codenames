import {motion} from 'motion/react'

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
            'radial-gradient(125% 90% at 50% 50%, transparent 18%, rgba(255,45,45,.42) 70%, rgba(90,0,0,.95) 100%)'
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
        style={{textShadow: '0 0 46px rgba(255,45,45,.9)'}}
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
          team === 'red' ? 'rgba(255,122,92,.26)' : 'rgba(111,182,255,.26)'
        }, transparent 70%)`
      }}
    />
  )
}

/** The spymaster is in the booth: hazard bands, and a watermark a screen-share cannot hide. */
export const SpymasterChrome = () => (
  <>
    {(['top-0', 'bottom-0'] as const).map(edge => (
      <span
        key={edge}
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 ${edge} z-30 flex h-5 items-center justify-center overflow-hidden`}
        style={{
          background:
            'repeating-linear-gradient(135deg, rgba(255,197,61,.8) 0 12px, rgba(5,6,11,.92) 12px 24px)'
        }}
      >
        <span className="type-marquee rounded-xs bg-stage-000/92 px-3 py-0.5 text-[9px] tracking-[0.3em] text-lamp-300">
          Spymaster
        </span>
      </span>
    ))}
    <span
      aria-hidden
      className="type-marquee pointer-events-none fixed inset-0 z-20 grid select-none place-items-center overflow-hidden text-[16vw] leading-none text-lamp-500/[0.04]"
      style={{transform: 'rotate(-20deg)'}}
    >
      Spymaster
    </span>
  </>
)
