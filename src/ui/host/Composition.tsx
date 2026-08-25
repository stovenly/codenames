import type {Colour} from '../../game/board'
import {composition, type Shape} from '../../game/settings'
import {Contested, Symbol} from '../board/symbols'
import {cx} from '../cx'

/** The bonus card belongs to whoever starts, which nothing knows until the deal. */
type Cell = Colour | 'contested'

const TONE: Record<Cell, string> = {
  assassin: 'border-kill-lit/30 bg-kill',
  red: 'border-red-500/45 bg-red-500/15',
  blue: 'border-blue-500/45 bg-blue-500/15',
  neutral: 'border-[#D6C29A]/55 bg-[#D6C29A]/28',
  contested: 'border-lamp-500/45'
}

/** Deadly first, then the two teams either side of the card they are playing for. */
const ORDER: Cell[] = ['assassin', 'red', 'contested', 'blue', 'neutral']

/**
 * The board the settings describe, at a glance: one square per card, laid out
 * as the real grid so the ratio is a shape rather than four numbers to compare.
 *
 * Cell count is fixed by board size, so only the colours move. Animating cards
 * in and out kept them in flow while they left, which grew the grid by a row and
 * shoved everything below it down and back.
 */
export const CompositionRow = ({settings}: {settings: Shape}) => {
  const c = composition(settings)
  const counts: Record<Cell, number> = {
    assassin: Math.max(0, c.assassins),
    red: c.perTeam,
    contested: Math.max(0, c.bonus),
    blue: c.perTeam,
    neutral: Math.max(0, c.neutral)
  }

  const cards = ORDER.flatMap(colour => Array.from({length: counts[colour]}, () => colour)).slice(
    0,
    c.total
  )

  return (
    <div
      role="img"
      aria-label={
        `${counts.assassin} assassin, ${counts.red} red, ${counts.blue} blue, ` +
        `${counts.contested} either team, ${counts.neutral} neutral`
      }
      className="mx-auto grid w-fit gap-1"
      style={{gridTemplateColumns: `repeat(${settings.size}, minmax(0, 1fr))`}}
    >
      {cards.map((cell, i) => (
        <span
          key={i}
          title={cell === 'contested' ? 'Goes to whichever team starts' : undefined}
          className={cx(
            'grid h-6 w-8 place-items-center rounded-xs border transition-colors duration-200',
            TONE[cell]
          )}
          style={
            cell === 'contested'
              ? {
                  background:
                    'linear-gradient(90deg, color-mix(in oklab, var(--color-red-500) 22%, transparent) 0 50%,' +
                    ' color-mix(in oklab, var(--color-blue-500) 22%, transparent) 50% 100%)'
                }
              : undefined
          }
        >
          {cell === 'contested' ? (
            <Contested className="size-4" />
          ) : (
            <Symbol colour={cell} className="size-4" />
          )}
        </span>
      ))}
    </div>
  )
}
