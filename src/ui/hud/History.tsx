import {useEffect, useRef} from 'react'
import type {Entry} from '../../game/log'
import type {Player, PlayerId} from '../../game/types'
import {Label} from '../atoms'
import {Hand, VenetianMask} from 'lucide-react'
import {Agent, Symbol} from '../board/symbols'
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
  const who = (id: PlayerId) => players.find(p => p.id === id)

  /** The mask or the agent, in their colour — the same pair the roster uses. */
  const Who = ({id, team}: {id: PlayerId; team: string}) => {
    const player = who(id)
    const Mark = player?.spymaster ? VenetianMask : Agent
    return (
      <span className={cx('flex w-24 shrink-0 items-center gap-1.5', tint(team))}>
        <Mark className="size-3.5 shrink-0" />
        <Label className="truncate">{player?.name ?? 'someone'}</Label>
      </span>
    )
  }

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
            <div key={entry.index} className="flex items-center gap-2">
              <Who id={entry.by} team={entry.team} />
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
              <Who id={entry.by} team={entry.team} />
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

        if (entry.kind === 'pass') {
          return (
            <div key={entry.index} className="flex items-center gap-2 pl-2">
              <Who id={entry.by} team={entry.team} />
              <Hand className="size-3.5 shrink-0 text-text-dim" />
              <span className="type-read text-sm text-text-dim">passed</span>
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
