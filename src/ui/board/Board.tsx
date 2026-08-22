import {useCallback, useEffect, useState} from 'react'
import type {View} from '../../game/reducer'
import type {Avatar as AvatarSpec, Player, PlayerId} from '../../game/types'
import {armCard, myMark, useMarks} from '../../state/presence'
import {intend} from '../../state/room'
import type {Stage} from '../../state/theatre'
import {Bulbs} from '../atoms'
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
  const [focus, setFocus] = useState(0)
  const armedCard = myMark()

  const avatars = new Map<PlayerId, AvatarSpec>(players.map(p => [p.id, p.avatar]))
  const busy = stage.kind === 'windup' || stage.kind === 'landing' || stage.kind === 'aftermath'

  const arm = useCallback(
    (index: number) => {
      if (!canGuess || busy) return
      if (armedCard !== null && armedCard !== index) armCard(armedCard, false)
      armCard(index, true)
      sfx.arm()
    },
    [canGuess, busy, armedCard]
  )

  const confirm = useCallback(
    (index: number) => {
      if (!canGuess || busy) return
      intend({kind: 'guess', card: index})
    },
    [canGuess, busy]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canGuess) return
      const total = view.cards.length
      if (!total) return
      const moves: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: size,
        ArrowUp: -size
      }
      if (e.key in moves) {
        e.preventDefault()
        setFocus(f => Math.max(0, Math.min(total - 1, f + moves[e.key]!)))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (view.cards[focus]?.revealed) return
        if (armedCard === focus) confirm(focus)
        else arm(focus)
        return
      }
      if (e.key === 'Escape' && armedCard !== null) {
        e.preventDefault()
        armCard(armedCard, false)
        sfx.disarm()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [canGuess, focus, armedCard, size, view.cards, arm, confirm])

  return (
    <div className="relative w-full">
      <Bulbs lit={view.phase === 'guess'} chase={view.phase === 'guess'} className="mb-2" />

      {/* Overflow visible: the card being guessed grows out of its cell. */}
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
            windupUntil={stage.kind === 'windup' ? stage.until : 0}
            dim={stage.kind === 'windup' && stage.card !== i}
            spymaster={spymaster}
            interactive={canGuess && !card.revealed && !busy}
            armed={armedCard === i}
            marks={marks.get(i) ?? new Set()}
            avatars={avatars}
            onArm={() => arm(i)}
            onConfirm={() => confirm(i)}
            focused={focus === i && canGuess}
          />
        ))}
      </div>

      <Bulbs lit={view.phase === 'guess'} chase={view.phase === 'guess'} className="mt-2" />
    </div>
  )
}
