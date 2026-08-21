import {AnimatePresence, motion} from 'motion/react'
import NumberFlow from '@number-flow/react'
import {Minus, Plus} from 'lucide-react'
import {useState} from 'react'
import type {View} from '../../game/reducer'
import type {Player, Team} from '../../game/types'
import {myMark} from '../../state/presence'
import {intend} from '../../state/room'
import {Bulbs, Button, Glyph, Label, Panel, input} from '../atoms'
import {cx} from '../cx'
import {spring, useMotion} from '../motion'
import {TimerArc} from './TimerArc'

/** The scoreboard is an odometer, so a card landing reads as a count, not a swap. */
const Score = ({team, left, active}: {team: Team; left: number; active: boolean}) => (
  <motion.div
    animate={{opacity: active ? 1 : 0.42}}
    transition={spring.firm}
    className="flex shrink-0 flex-col items-center gap-1"
  >
    <span
      className={cx(
        'flex items-center gap-1.5 rounded-sm px-2 py-0.5',
        team === 'red' ? 'pattern-red text-red-lit' : 'pattern-blue text-blue-lit'
      )}
    >
      <Glyph team={team} className="size-2.5" />
      <span className="type-label">{team}</span>
    </span>
    <NumberFlow
      value={left}
      className={cx('type-marquee text-3xl leading-none', team === 'red' ? 'text-red-lit' : 'text-blue-lit')}
      style={{
        textShadow:
          team === 'red' ? '0 0 18px rgba(255,122,92,.5)' : '0 0 18px rgba(111,182,255,.5)'
      }}
    />
    <Bulbs lit={active} chase={active} className="w-14" />
  </motion.div>
)

const ClueComposer = ({size}: {size: number}) => {
  const [word, setWord] = useState('')
  const [count, setCount] = useState<number | 'unlimited'>(1)
  const max = size * size

  const submit = () => {
    const trimmed = word.trim()
    if (!trimmed) return
    intend({kind: 'clue', word: trimmed.toUpperCase(), count})
    setWord('')
    setCount(1)
  }

  const step = (delta: 1 | -1) =>
    setCount(c => {
      if (delta === -1) return c === 'unlimited' ? max : Math.max(0, Number(c) - 1)
      return c === 'unlimited' || Number(c) + 1 > max ? 'unlimited' : Number(c) + 1
    })

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
      <input
        value={word}
        onChange={e => setWord(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Your clue"
        maxLength={40}
        className={cx(
          input,
          'min-w-32 flex-1 border-lamp-500/40 text-base tracking-[0.14em] uppercase placeholder:text-xs placeholder:tracking-normal placeholder:normal-case'
        )}
      />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" aria-label="Fewer" onClick={() => step(-1)}>
          <Minus className="size-3.5" />
        </Button>
        <span className="type-marquee w-9 text-center text-lg text-lamp-300">
          {count === 'unlimited' ? '∞' : count}
        </span>
        <Button variant="ghost" size="sm" aria-label="More" onClick={() => step(1)}>
          <Plus className="size-3.5" />
        </Button>
      </div>
      <Button onClick={submit} disabled={!word.trim()}>
        Give clue
      </Button>
    </div>
  )
}

export const Hud = ({
  view,
  me,
  deadline,
  timerTotal,
  busy,
  size
}: {
  view: View
  me: Player | null
  deadline: number | null
  timerTotal: number
  busy: boolean
  size: number
}) => {
  const {reduced} = useMotion()
  const armed = myMark()
  const myTurn = me?.team === view.turn
  const amSpymaster = !!me?.spymaster

  const canClue = myTurn && amSpymaster && view.phase === 'clue' && !busy
  const canAct = myTurn && !amSpymaster && view.phase === 'guess' && !busy

  return (
    <Panel level={2} glossy className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
      <Score team="red" left={view.remaining.red} active={view.turn === 'red'} />

      <div className="flex min-w-44 flex-1 flex-col items-center justify-center gap-0.5 text-center">
        {view.clue ? (
          <>
            <motion.span
              key={view.clue.word}
              initial={reduced ? {opacity: 0} : {opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              transition={spring.firm}
              className="type-marquee text-xl leading-tight text-text sm:text-2xl"
              style={{textShadow: '0 0 20px rgba(255,197,61,.28)'}}
            >
              {view.clue.word}
              <span className="ml-3 text-lamp-300">
                {view.clue.count === 'unlimited' || view.clue.count === 0 ? '∞' : view.clue.count}
              </span>
            </motion.span>
            <Label>
              {view.unlimited
                ? 'unlimited guesses'
                : `${Math.max(0, view.guessesLeft)} guess${view.guessesLeft === 1 ? '' : 'es'} left`}
            </Label>
          </>
        ) : (
          <Label>
            <span aria-live="polite">
              {view.phase === 'clue'
                ? `${view.turn} spymaster is thinking`
                : view.phase === 'gameover'
                  ? 'Game over'
                  : ''}
            </span>
          </Label>
        )}
      </div>

      {deadline !== null && timerTotal > 0 && <TimerArc deadline={deadline} total={timerTotal} />}

      {canClue && <ClueComposer size={size} />}

      {canAct && (
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {armed !== null && (
              <motion.div
                initial={{opacity: 0, scale: 0.92}}
                animate={{opacity: 1, scale: 1}}
                exit={{opacity: 0, scale: 0.92}}
                transition={spring.firm}
              >
                <Button size="lg" onClick={() => intend({kind: 'guess', card: armed})}>
                  Lock in {view.cards[armed]?.word}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            disabled={view.guessedSinceClue < 1}
            title={view.guessedSinceClue < 1 ? 'Guess at least once before passing' : undefined}
            onClick={() => intend({kind: 'pass'})}
          >
            Pass
          </Button>
        </div>
      )}

      <Score team="blue" left={view.remaining.blue} active={view.turn === 'blue'} />
    </Panel>
  )
}
