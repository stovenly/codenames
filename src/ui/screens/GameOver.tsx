import confetti from 'canvas-confetti'
import {motion} from 'motion/react'
import NumberFlow from '@number-flow/react'
import {useEffect} from 'react'
import type {View} from '../../game/reducer'
import type {Player, Team} from '../../game/types'
import {intend} from '../../state/room'
import {Bulbs, Button, Label, Panel, Rule} from '../atoms'
import {cx} from '../cx'
import {spring, useMotion} from '../motion'
import {sfx} from '../sound/audio'

const TINTS: Record<Team, string[]> = {
  red: ['#FF7A5C', '#F04438', '#FFC53D', '#F2DCA0'],
  blue: ['#6FB6FF', '#2E86FF', '#FFC53D', '#F2DCA0']
}

/** Two cannons from the bottom corners, the way a studio actually fires them. */
const fireCannons = (team: Team) => {
  const colors = TINTS[team]
  const end = Date.now() + 2600
  const shot = () => {
    confetti({particleCount: 5, angle: 62, spread: 60, origin: {x: 0, y: 0.98}, colors, ticks: 260})
    confetti({particleCount: 5, angle: 118, spread: 60, origin: {x: 1, y: 0.98}, colors, ticks: 260})
    if (Date.now() < end) requestAnimationFrame(shot)
  }
  shot()
  confetti({particleCount: 90, spread: 100, origin: {y: 0.7}, colors, startVelocity: 42})
}

export const GameOver = ({view, me, isHost}: {view: View; me: Player | null; isHost: boolean}) => {
  const {reduced} = useMotion()
  const winner = view.winner ?? 'red'
  const iWon = me?.team === winner

  useEffect(() => {
    const t = setTimeout(() => (iWon || !me?.team ? sfx.victory() : sfx.defeat()), 320)
    if (!reduced) fireCannons(winner)
    return () => {
      clearTimeout(t)
      confetti.reset()
    }
  }, [iWon, me?.team, winner, reduced])

  return (
    <main className="relative grid min-h-full place-items-center px-6 py-16">
      <motion.span
        aria-hidden
        className="pointer-events-none fixed inset-0"
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{duration: 0.6}}
        style={{
          background: `radial-gradient(60% 50% at 50% 45%, ${
            winner === 'red' ? 'rgba(240,68,56,.20)' : 'rgba(46,134,255,.20)'
          }, transparent 70%)`
        }}
      />

      <Panel
        level={2}
        glossy
        className="relative z-20 flex w-full max-w-md flex-col items-center gap-6 px-8 py-9 text-center"
      >
        <Bulbs lit chase={!reduced} />

        <motion.span
          initial={reduced ? {opacity: 0} : {scale: 0.45, opacity: 0, rotate: -6}}
          animate={{scale: 1, opacity: 1, rotate: 0}}
          transition={reduced ? {duration: 0.12} : {type: 'spring', stiffness: 250, damping: 14}}
          className={cx(
            'type-marquee text-4xl sm:text-5xl',
            winner === 'red' ? 'text-red-lit' : 'text-blue-lit'
          )}
          style={{
            textShadow: `0 0 44px ${winner === 'red' ? 'rgba(255,122,92,.6)' : 'rgba(111,182,255,.6)'}`
          }}
        >
          {winner} wins
        </motion.span>

        <motion.p
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: reduced ? 0 : 0.3, ...spring.soft}}
          className="type-body"
        >
          {view.endReason === 'assassin'
            ? 'The other team found the assassin.'
            : 'Every agent accounted for.'}
        </motion.p>

        <Rule className="max-w-40" lit />

        <div className="flex items-center gap-6">
          {(['red', 'blue'] as Team[]).map(team => (
            <span key={team} className="flex flex-col items-center gap-1">
              <NumberFlow
                value={view.totals[team] - view.remaining[team]}
                className={cx(
                  'type-marquee text-2xl',
                  team === 'red' ? 'text-red-lit' : 'text-blue-lit'
                )}
              />
              <Label>
                of {view.totals[team]} {team}
              </Label>
            </span>
          ))}
        </div>

        {isHost ? (
          <Button size="lg" onClick={() => intend({kind: 'endGame'})}>
            Play again
          </Button>
        ) : (
          <Label>Waiting on the host…</Label>
        )}

        <Bulbs lit chase={!reduced} />
      </Panel>
    </main>
  )
}
