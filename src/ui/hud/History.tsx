import {useEffect, useRef} from 'react'
import type {Entry} from '../../game/log'
import type {Player, PlayerId} from '../../game/types'
import {Label} from '../atoms'
import {Symbol} from '../board/symbols'
import {cx} from '../cx'

const why = (reason: string) =>
  reason === 'pass'
    ? 'passed'
    : reason === 'wrong'
      ? 'wrong pick'
      : reason === 'timeout'
        ? 'out of time'
        : 'out of guesses'

const tint = (team: string) => (team === 'red' ? 'text-red-lit' : 'text-blue-lit')

/**
 * What has already been tried, for a table that has stopped being able to
 * remember it. Read-only: a rewind control on a player's screen is a rewind
 * control somebody presses.
 */
export const History = ({entries, players}: {entries: Entry[]; players: Player[]}) => {
  const foot = useRef<HTMLDivElement>(null)
  const name = (id: PlayerId) => players.find(p => p.id === id)?.name ?? 'someone'

  useEffect(() => {
    foot.current?.scrollIntoView({block: 'end'})
  }, [entries.length])

  if (!entries.length) {
    return <p className="type-body text-text-dim">Nothing has happened yet.</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(entry => {
        if (entry.kind === 'clue') {
          return (
            <div key={entry.index} className="flex items-baseline gap-2">
              <Label className={cx('w-16 shrink-0 truncate', tint(entry.team))}>
                {name(entry.by)}
              </Label>
              <span className="type-plate text-lg text-text">
                {entry.word}
                <span className="ml-2 text-lamp-300">
                  {entry.count === 'unlimited' || entry.count === 0 ? '∞' : entry.count}
                </span>
              </span>
            </div>
          )
        }

        if (entry.kind === 'guess') {
          return (
            <div key={entry.index} className="flex items-center gap-2 pl-2">
              <Label className={cx('w-16 shrink-0 truncate', tint(entry.team))}>
                {name(entry.by)}
              </Label>
              <Symbol colour={entry.colour} className="size-3.5 shrink-0" />
              <span
                className={cx(
                  'type-read truncate text-sm',
                  entry.correct ? 'text-text' : 'text-text-dim'
                )}
              >
                {entry.word}
              </span>
              {entry.ended && <Label className="text-kill-lit">turn over</Label>}
            </div>
          )
        }

        return (
          <div key={entry.index} className="flex items-center gap-2 py-0.5">
            <span aria-hidden className="h-px flex-1 bg-stage-600" />
            <Label>{why(entry.reason)}</Label>
            <span aria-hidden className="h-px flex-1 bg-stage-600" />
          </div>
        )
      })}
      <div ref={foot} />
    </div>
  )
}
