import {useCallback} from 'react'
import type {View} from '../../game/reducer'
import type {Player, PlayerId} from '../../game/types'
import {myMark, setMyMark, useMarks} from '../../state/presence'
import {settleNow, type Stage} from '../../state/theatre'
import {sfx} from '../sound/audio'
import {Card, type CardPhase} from './Card'

const phaseFor = (stage: Stage, index: number): CardPhase => {
  if (stage.kind === 'windup' && stage.card === index) return 'windup'
  if (stage.kind === 'landing' && stage.card === index) return 'landing'
  if (stage.kind === 'aftermath' && stage.card === index) return 'aftermath'
  return 'idle'
}

export const Board = ({
  view,
  stage,
  size,
  players,
  canGuess,
  spymaster
}: {
  view: View
  stage: Stage
  size: number
  players: Player[]
  canGuess: boolean
  spymaster: boolean
}) => {
  const marks = useMarks()
  const armedCard = myMark()

  const people = new Map<PlayerId, Player>(players.map(p => [p.id, p]))
  const busy = stage.kind === 'windup' || stage.kind === 'landing' || stage.kind === 'aftermath'

  /** Picking is reversible; only the lock-in button spends the guess. */
  const toggle = useCallback(
    (index: number) => {
      if (!canGuess || busy) return
      const dropping = myMark() === index
      setMyMark(dropping ? null : index)
      if (dropping) sfx.disarm()
      else sfx.arm()
    },
    [canGuess, busy]
  )

  return (
    <div className="relative w-full">
      <div
        className="grid w-full gap-1.5 sm:gap-2.5"
        style={{gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`}}
      >
        {view.cards.map((card, i) => (
          <Card
            key={`${card.word}-${i}`}
            card={card}
            index={i}
            phase={phaseFor(stage, i)}
            landedColour={stage.kind === 'landing' || stage.kind === 'aftermath' ? stage.colour : null}
            reelColour={stage.kind === 'windup' && stage.card === i ? stage.colour : null}
            reelTeam={
              (stage.kind === 'windup' || stage.kind === 'landing') && stage.card === i
                ? stage.team
                : null
            }
            windupMs={stage.kind === 'windup' ? stage.until - stage.from : 0}
            dim={stage.kind === 'windup' && stage.card !== i}
            spymaster={spymaster}
            interactive={canGuess && !card.revealed && !busy}
            armed={armedCard === i}
            marks={marks.get(i) ?? new Set()}
            people={people}
            onPick={() => toggle(i)}
            onSettled={() => settleNow(i)}
          />
        ))}
      </div>
    </div>
  )
}
