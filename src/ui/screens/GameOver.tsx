import confetti from 'canvas-confetti'
import {motion} from 'motion/react'
import NumberFlow from '@number-flow/react'
import {useEffect, useRef} from 'react'
import type {View} from '../../game/reducer'
import type {Player, Team} from '../../game/types'
import {intend} from '../../state/room'
import {Bulbs, Button, Label, Panel, Rule} from '../atoms'
import {cx} from '../cx'
import {spring} from '../motion'
import {sfx} from '../sound/audio'

/** Canvas wants literal colours, so the team's are read back off the document. */
const tintsFor = (team: Team) => {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string) => css.getPropertyValue(name).trim()
  return team === 'red'
    ? [token('--color-red-lit'), token('--color-red-500'), '#FFC53D', '#F2DCA0']
    : [token('--color-blue-lit'), token('--color-blue-500'), '#FFC53D', '#F2DCA0']
}

/**
 * Falls from the ceiling on its own canvas, which we own and can put behind the
 * result. The library's default canvas is fixed at the top of the stacking
 * order, so a shared one always rains in front of whatever you are reading.
 */
const dropConfetti = (team: Team, canvas: HTMLCanvasElement) => {
  const colors = tintsFor(team)
  const fire = confetti.create(canvas, {resize: true, useWorker: true})
  const end = Date.now() + 5200

  // One particle per call: a single call drops its whole count from one point,
  // which reads as clumps rather than as confetti.
  const fall = () => {
    for (let i = 0; i < 4; i++) {
      fire({
        particleCount: 1,
        startVelocity: 0,
        ticks: 420,
        gravity: 0.5 + Math.random() * 0.35,
        scalar: 0.8 + Math.random() * 0.6,
        spread: 90,
        colors,
        origin: {x: Math.random(), y: -0.05 - Math.random() * 0.15}
      })
    }
    if (Date.now() < end) setTimeout(fall, 70)
  }
  fall()
  return () => void fire.reset()
}

export const GameOver = ({view, me, isHost}: {view: View; me: Player | null; isHost: boolean}) => {
    const winner = view.winner ?? 'red'
  const iWon = me?.team === winner

  const sky = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const t = setTimeout(() => (iWon || !me?.team ? sfx.victory() : sfx.defeat()), 320)
    const stop = sky.current ? dropConfetti(winner, sky.current) : undefined
    return () => {
      clearTimeout(t)
      stop?.()
    }
  }, [iWon, me?.team, winner])

  return (
    <main className="relative grid min-h-full place-items-center px-6 py-16">
      <canvas ref={sky} aria-hidden className="pointer-events-none fixed inset-0 z-10 size-full" />

      <motion.span
        aria-hidden
        className="pointer-events-none fixed inset-0"
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{duration: 0.6}}
        style={{
          background: `radial-gradient(60% 50% at 50% 45%, ${
            winner === 'red' ? 'var(--glow-red-wash)' : 'rgba(46,134,255,.20)'
          }, transparent 70%)`
        }}
      />

      <Panel
        level={2}
        glossy
        className="relative z-20 flex w-full max-w-md flex-col items-center gap-6 px-8 py-9 text-center"
      >
        <Bulbs lit chase />

        <motion.span
          initial={{scale: 0.45, opacity: 0, rotate: -6}}
          animate={{scale: 1, opacity: 1, rotate: 0}}
          transition={{type: 'spring', stiffness: 250, damping: 14}}
          className={cx(
            'type-marquee text-4xl sm:text-5xl',
            winner === 'red' ? 'text-red-lit' : 'text-blue-lit'
          )}
          style={{
            textShadow: `0 0 44px ${winner === 'red' ? 'var(--glow-red-text)' : 'rgba(111,182,255,.6)'}`
          }}
        >
          {winner} wins
        </motion.span>

        <motion.p
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.3, ...spring.soft}}
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

        <Bulbs lit chase />
      </Panel>
    </main>
  )
}
