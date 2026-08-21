import {motion} from 'motion/react'
import {useEffect, useState} from 'react'
import type {Clue} from '../../game/reducer'
import {spring, useReducedMotion} from '../motion'
import {sfx} from '../sound/audio'

/** The gameshow beat: the clue takes the whole screen before it docks. */
export const ClueReveal = ({clue}: {clue: Clue}) => {
  const reduced = useReducedMotion()
  const [typed, setTyped] = useState(reduced ? clue.word : '')
  const [showCount, setShowCount] = useState(reduced)

  useEffect(() => {
    if (reduced) return
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(clue.word.slice(0, i))
      sfx.type()
      if (i >= clue.word.length) {
        clearInterval(id)
        setTimeout(() => setShowCount(true), 140)
      }
    }, 55)
    return () => clearInterval(id)
  }, [clue.word, reduced])

  const tint = clue.team === 'red' ? 'text-red-lit' : 'text-blue-lit'

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0, scale: reduced ? 1 : 0.94}}
      transition={{duration: reduced ? 0.12 : 0.28}}
      className="fixed inset-0 z-50 grid place-items-center bg-stage-000/92 backdrop-blur-sm"
    >
      <motion.span
        aria-hidden
        className="absolute inset-x-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${
            clue.team === 'red' ? '#FF7A5C' : '#6FB6FF'
          }, transparent)`
        }}
        initial={{top: '50%', opacity: 0}}
        animate={{top: ['50%', '12%'], opacity: [0, 1, 0.35]}}
        transition={{duration: 0.6, ease: [0.16, 1, 0.3, 1]}}
      />

      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <span className={`type-read text-xs tracking-[0.4em] ${tint}`}>
          {clue.team === 'red' ? 'RED' : 'BLUE'} SPYMASTER
        </span>

        <div className="flex flex-wrap items-center justify-center gap-5">
          <span className="type-marquee text-3xl tracking-wider text-text sm:text-5xl">
            {typed}
            {!reduced && typed.length < clue.word.length && (
              <motion.span
                animate={{opacity: [1, 0]}}
                transition={{duration: 0.5, repeat: Infinity}}
                className="text-lamp-500"
              >
                _
              </motion.span>
            )}
          </span>

          {showCount && (
            <motion.span
              initial={reduced ? {opacity: 0} : {scale: 2.6, opacity: 0, rotate: -14}}
              animate={{scale: 1, opacity: 1, rotate: 0}}
              transition={reduced ? {duration: 0.12} : {type: 'spring', stiffness: 620, damping: 18}}
              className="type-marquee grid size-16 place-items-center rounded-lg border-2 border-lamp-500 bg-lamp-500/10 text-3xl text-lamp-300 sm:size-20 sm:text-4xl"
            >
              {clue.count === 'unlimited' ? '∞' : clue.count}
            </motion.span>
          )}
        </div>

        <motion.span
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{delay: reduced ? 0 : 0.5}}
          className="type-label"
        >
          {clue.count === 'unlimited' || clue.count === 0
            ? 'unlimited guesses'
            : `${clue.count} card${clue.count === 1 ? '' : 's'}, ${Number(clue.count) + 1} guesses`}
        </motion.span>
      </div>
    </motion.div>
  )
}

export const TurnBand = ({team}: {team: 'red' | 'blue'}) => {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.15}}
      className="pointer-events-none fixed inset-0 z-40 grid place-items-center overflow-hidden"
    >
      <motion.div
        initial={reduced ? {opacity: 0} : {x: '-120%'}}
        animate={reduced ? {opacity: 1} : {x: '0%'}}
        exit={reduced ? {opacity: 0} : {x: '120%'}}
        transition={reduced ? {duration: 0.12} : spring.heavy}
        className="flex w-[160%] -skew-y-3 items-center justify-center py-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,1)]"
        style={{
          background:
            team === 'red'
              ? 'linear-gradient(90deg, rgba(240,68,56,0), #F04438 20%, #7A1A12 80%, rgba(122,26,18,0))'
              : 'linear-gradient(90deg, rgba(46,134,255,0), #2E86FF 20%, #10305E 80%, rgba(16,48,94,0))'
        }}
      >
        <span className="type-marquee text-3xl text-[#05060B] sm:text-5xl">
          {team === 'red' ? 'RED' : 'BLUE'} TO PLAY
        </span>
      </motion.div>
    </motion.div>
  )
}
