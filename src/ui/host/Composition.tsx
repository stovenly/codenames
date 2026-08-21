import {AnimatePresence, motion} from 'motion/react'
import type {Colour} from '../../game/board'
import {composition, type Settings} from '../../game/settings'
import {Symbol} from '../board/symbols'
import {cx} from '../cx'
import {useMotion} from '../motion'

const TONE: Record<Colour, string> = {
  assassin: 'border-kill-lit/30 bg-kill',
  red: 'border-red-500/45 bg-red-500/15',
  blue: 'border-blue-500/45 bg-blue-500/15',
  neutral: 'border-[#D6C29A]/55 bg-[#D6C29A]/28'
}

/** Deadly first, then the two teams, then the filler — the order it is dealt out on screen. */
const ORDER: Colour[] = ['assassin', 'red', 'blue', 'neutral']

/**
 * The board the settings describe, at a glance: one square per card, laid out
 * as the real grid so the ratio is a shape rather than four numbers to compare.
 */
export const CompositionRow = ({
  settings
}: {
  settings: Pick<Settings, 'size' | 'teamCards' | 'assassins'>
}) => {
  const {reduced} = useMotion()
  const c = composition(settings)
  const counts: Record<Colour, number> = {
    assassin: Math.max(0, c.assassins),
    red: c.perTeam,
    blue: c.perTeam,
    neutral: Math.max(0, c.neutral)
  }

  const cards = ORDER.flatMap(colour => Array.from({length: counts[colour]}, () => colour))

  return (
    <div
      role="img"
      aria-label={`${counts.assassin} assassin, ${counts.red} red, ${counts.blue} blue, ${counts.neutral} neutral`}
      className="grid w-fit gap-1"
      style={{gridTemplateColumns: `repeat(${settings.size}, minmax(0, 1fr))`}}
    >
      <AnimatePresence initial={false}>
        {cards.map((colour, i) => (
          <motion.span
            key={i}
            layout={!reduced}
            initial={reduced ? {opacity: 0} : {opacity: 0, scale: 0.4}}
            animate={{opacity: 1, scale: 1}}
            exit={reduced ? {opacity: 0} : {opacity: 0, scale: 0.4}}
            transition={{type: 'spring', stiffness: 460, damping: 32, delay: reduced ? 0 : i * 0.008}}
            className={cx(
              'grid size-6 place-items-center rounded-xs border transition-colors duration-200',
              TONE[colour]
            )}
          >
            <Symbol colour={colour} className="size-4" />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
