import {motion} from 'motion/react'
import {useEffect, useRef} from 'react'
import type {View} from '../../game/reducer'
import type {Player, Team} from '../../game/types'
import {intend} from '../../state/room'
import {Button, Label, Panel, Rule} from '../atoms'
import {spring, useReducedMotion} from '../motion'
import {sfx} from '../sound/audio'

const Confetti = ({team}: {team: Team}) => {
  const bits = useRef(
    Array.from({length: 60}, (_, i) => ({
      x: Math.random() * 100,
      delay: Math.random() * 1.1,
      duration: 2.4 + Math.random() * 1.8,
      size: 4 + Math.random() * 6,
      spin: Math.random() * 900 - 450,
      tint: [team === 'red' ? '#FF6B57' : '#5FA8FF', '#D9A441', '#F0D18A', '#E8E3D6'][i % 4]!
    }))
  ).current

  return (
    <span aria-hidden className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          initial={{y: '-12vh', opacity: 0, rotate: 0}}
          animate={{y: '112vh', opacity: [0, 1, 1, 0.7], rotate: b.spin}}
          transition={{duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'linear'}}
          style={{
            left: `${b.x}%`,
            width: b.size,
            height: b.size * 1.9,
            background: b.tint,
            borderRadius: 1
          }}
          className="absolute"
        />
      ))}
    </span>
  )
}

export const GameOver = ({
  view,
  me,
  isHost
}: {
  view: View
  me: Player | null
  isHost: boolean
}) => {
  const reduced = useReducedMotion()
  const winner = view.winner ?? 'red'
  const iWon = me?.team === winner

  useEffect(() => {
    const t = setTimeout(() => (iWon || !me?.team ? sfx.victory() : sfx.defeat()), 350)
    return () => clearTimeout(t)
  }, [iWon, me?.team])

  return (
    <main className="relative grid min-h-full place-items-center px-6 py-16">
      {!reduced && <Confetti team={winner} />}

      <motion.span
        aria-hidden
        className="pointer-events-none fixed inset-0"
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{duration: 0.6}}
        style={{
          background: `radial-gradient(60% 50% at 50% 40%, ${
            winner === 'red' ? 'rgba(224,80,63,.20)' : 'rgba(61,139,232,.20)'
          }, transparent 70%)`
        }}
      />

      <Panel level={2} marks className="relative z-20 flex max-w-md flex-col items-center gap-6 px-10 py-12 text-center">
        <motion.span
          initial={reduced ? {opacity: 0} : {scale: 0.4, opacity: 0, rotate: -8}}
          animate={{scale: 1, opacity: 1, rotate: 0}}
          transition={reduced ? {duration: 0.12} : {type: 'spring', stiffness: 260, damping: 15}}
          className={`type-display text-5xl sm:text-6xl ${
            winner === 'red' ? 'text-red-glow' : 'text-blue-glow'
          }`}
          style={{
            textShadow: `0 0 40px ${winner === 'red' ? 'rgba(255,107,87,.55)' : 'rgba(95,168,255,.55)'}`
          }}
        >
          {winner === 'red' ? 'RED' : 'BLUE'} WINS
        </motion.span>

        <motion.p
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: reduced ? 0 : 0.35, ...spring.soft}}
          className="type-body"
        >
          {view.endReason === 'assassin'
            ? 'The other team found the assassin.'
            : 'Every agent accounted for.'}
        </motion.p>

        <Rule className="max-w-40" />

        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{delay: reduced ? 0 : 0.6}}
          className="flex items-center gap-4"
        >
          <span className="type-read text-xs text-text-dim">
            <span className="text-red-glow">{view.totals.red - view.remaining.red}</span>
            {' / '}
            <span className="text-red-glow/60">{view.totals.red}</span>
            <span className="mx-2 opacity-40">·</span>
            <span className="text-blue-glow">{view.totals.blue - view.remaining.blue}</span>
            {' / '}
            <span className="text-blue-glow/60">{view.totals.blue}</span>
          </span>
        </motion.div>

        {isHost ? (
          <Button onClick={() => intend({kind: 'endGame'})}>Back to the waiting room</Button>
        ) : (
          <Label>Waiting on the host to start another…</Label>
        )}
      </Panel>
    </main>
  )
}
