import {motion} from 'motion/react'
import {useCallback, useEffect, useState} from 'react'
import type {View} from '../../game/reducer'
import type {Avatar as AvatarSpec, PlayerId, Player} from '../../game/types'
import {armCard, myMark, useMarks} from '../../state/presence'
import {intend} from '../../state/room'
import type {Stage} from '../../state/theatre'
import {useReducedMotion} from '../motion'
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
  const reduced = useReducedMotion()
  const [focus, setFocus] = useState(0)
  const armedCard = myMark()

  const avatars = new Map<PlayerId, AvatarSpec>(players.map(p => [p.id, p.avatar]))
  const busy = stage.kind === 'windup' || stage.kind === 'landing' || stage.kind === 'aftermath'
  const dimmed = stage.kind === 'windup'

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
      <motion.div
        animate={{
          filter: dimmed && !reduced ? 'saturate(0.28) brightness(0.42)' : 'saturate(1) brightness(1)'
        }}
        transition={{duration: reduced ? 0.12 : 0.45}}
        className="grid w-full gap-1.5 sm:gap-2.5"
        style={{gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`}}
      >
        {view.cards.map((card, i) => {
          const phase = phaseFor(stage, i)
          return (
            <div key={`${card.word}-${i}`} style={{filter: phase !== 'idle' ? 'none' : undefined}}>
              <Card
                card={card}
                index={i}
                phase={phase}
                landedColour={
                  stage.kind === 'landing' || stage.kind === 'aftermath' ? stage.colour : null
                }
                spymaster={spymaster}
                interactive={canGuess && !card.revealed && !busy}
                armed={armedCard === i}
                marks={marks.get(i) ?? new Set()}
                avatars={avatars}
                onArm={() => arm(i)}
                onConfirm={() => confirm(i)}
                focused={focus === i && canGuess}
              />
            </div>
          )
        })}
      </motion.div>

      {dimmed && !reduced && (
        <motion.span
          aria-hidden
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: 'radial-gradient(60% 60% at 50% 50%, rgba(217,164,65,.10), transparent 70%)'
          }}
        />
      )}
    </div>
  )
}
