import type {View} from '../../game/reducer'
import type {Player, PlayerId} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {cx} from '../cx'
import {INK, SURFACE, Symbol} from './symbols'

/**
 * The key, once the game is over: every card face up, with the ones nobody found
 * held back. Static and unmemoised — it renders once, and none of the live
 * board's vocabulary of sheen, marks and reels means anything here.
 */
export const FinalBoard = ({
  view,
  size,
  turnedBy
}: {
  view: View
  size: number
  turnedBy: Map<number, Player>
}) => (
  <div className="flex w-full flex-col gap-3">
    <div
      className="grid w-full"
      style={{gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: 'var(--board-gap)'}}
    >
      {view.cards.map((card, i) => {
        const who = turnedBy.get(i)
        return (
          <div
            key={`${card.word}-${i}`}
            className={cx(
              'relative grid aspect-[7/5] place-items-center rounded-sm border px-1 text-center',
              card.revealed ? 'border-black/30' : 'border-dashed border-white/25 opacity-55'
            )}
            style={{background: SURFACE[card.colour], containerType: 'inline-size'}}
          >
            <span
              className="type-plate max-w-full break-words"
              style={{
                fontSize: `clamp(7px, calc(var(--word-fit, 105) / ${Math.max(5, card.word.length)} * 1cqw), 22px)`,
                color: INK[card.colour]
              }}
            >
              {card.word}
            </span>
            <Symbol colour={card.colour} className="absolute top-0.5 left-0.5 size-[13cqw]" />
            {who && (
              <span className="absolute -right-1 -bottom-1 size-[22cqw] max-h-6 min-h-3.5 max-w-6 min-w-3.5 overflow-hidden rounded-full border border-stage-000/70 bg-stage-000">
                <AvatarView spec={who.avatar} size={null} className="size-full rounded-full" />
              </span>
            )}
          </div>
        )
      })}
    </div>

    <div className="flex justify-center gap-4">
      {(['red', 'blue'] as const).map(team => (
        <span key={team} className="type-label">
          <span className={team === 'red' ? 'text-red-lit' : 'text-blue-lit'}>{team}</span> found{' '}
          {view.totals[team] - view.remaining[team]} of {view.totals[team]}
        </span>
      ))}
    </div>
  </div>
)

/** Who turned each card, for the badges: the step log is the only record of it. */
export const turnedByFrom = (
  steps: Array<{t: string; card?: number; by?: PlayerId}>,
  players: Player[]
) => {
  const people = new Map(players.map(p => [p.id, p]))
  const out = new Map<number, Player>()
  for (const step of steps) {
    if (step.t !== 'guess' || step.card === undefined) continue
    const who = step.by ? people.get(step.by) : undefined
    if (who) out.set(step.card, who)
  }
  return out
}
