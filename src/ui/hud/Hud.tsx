import {AnimatePresence, motion} from 'motion/react'
import {useState} from 'react'
import type {View} from '../../game/reducer'
import type {Player, Team} from '../../game/types'
import {myMark} from '../../state/presence'
import {getPrefs, setPrefs, usePrefs} from '../../state/prefs'
import {intend} from '../../state/room'
import {Button, Glyph, Panel} from '../atoms'
import {spring, useReducedMotion} from '../motion'
import {sfx} from '../sound/audio'
import {TimerArc} from './TimerArc'

const Score = ({team, left, total, active}: {team: Team; left: number; total: number; active: boolean}) => {
  const reduced = useReducedMotion()
  return (
    <motion.div
      animate={{opacity: active ? 1 : 0.55, scale: active && !reduced ? 1.04 : 1}}
      transition={spring.firm}
      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${
        team === 'red' ? 'pattern-red border-red-500/45' : 'pattern-blue border-blue-500/45'
      }`}
    >
      <span className={team === 'red' ? 'text-red-glow' : 'text-blue-glow'}>
        <Glyph team={team} />
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={left}
          initial={reduced ? {opacity: 0} : {y: 12, opacity: 0}}
          animate={{y: 0, opacity: 1}}
          exit={reduced ? {opacity: 0} : {y: -12, opacity: 0}}
          transition={spring.firm}
          className={`type-display text-xl ${team === 'red' ? 'text-red-glow' : 'text-blue-glow'}`}
        >
          {left}
        </motion.span>
      </AnimatePresence>
      <span className="type-mono text-[10px] text-text-dim">/ {total}</span>
    </motion.div>
  )
}

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

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <input
        value={word}
        onChange={e => setWord(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Your clue"
        maxLength={40}
        className="type-mono min-w-32 flex-1 rounded-md border border-brass-400/40 bg-ink-900 px-3 py-2 text-sm tracking-wider text-text uppercase placeholder:normal-case placeholder:text-text-dim/50"
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCount(c => (c === 'unlimited' ? max : Math.max(0, Number(c) - 1)))}
          className="type-mono size-8 cursor-pointer rounded-md border border-ink-600 text-text-dim hover:border-brass-400/50"
        >
          −
        </button>
        <span className="type-mono w-8 text-center text-sm text-brass-200">
          {count === 'unlimited' ? '∞' : count}
        </span>
        <button
          type="button"
          onClick={() => setCount(c => (c === 'unlimited' ? 'unlimited' : Number(c) + 1 > max ? 'unlimited' : Number(c) + 1))}
          className="type-mono size-8 cursor-pointer rounded-md border border-ink-600 text-text-dim hover:border-brass-400/50"
        >
          +
        </button>
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
  const {muted} = usePrefs()
  const armed = myMark()
  const myTurn = me?.team === view.turn
  const amSpymaster = !!me?.spymaster

  const canClue = myTurn && amSpymaster && view.phase === 'clue' && !busy
  const canAct = myTurn && !amSpymaster && view.phase === 'guess' && !busy

  return (
    <Panel className="flex flex-wrap items-center gap-3 p-3">
      <Score team="red" left={view.remaining.red} total={view.totals.red} active={view.turn === 'red'} />
      <Score team="blue" left={view.remaining.blue} total={view.totals.blue} active={view.turn === 'blue'} />

      {deadline !== null && timerTotal > 0 && <TimerArc deadline={deadline} total={timerTotal} />}

      <div className="flex min-w-40 flex-1 flex-col">
        {view.clue ? (
          <>
            <span className="type-mono text-base tracking-widest text-text">
              {view.clue.word}{' '}
              <span className="text-brass-200">
                {view.clue.count === 'unlimited' || view.clue.count === 0 ? '∞' : view.clue.count}
              </span>
            </span>
            <span className="type-mono text-[10px] text-text-dim">
              {view.unlimited
                ? 'unlimited guesses'
                : `${Math.max(0, view.guessesLeft)} guess${view.guessesLeft === 1 ? '' : 'es'} left`}
            </span>
          </>
        ) : (
          <span
            className="type-mono text-xs text-text-dim"
            aria-live="polite"
          >
            {view.phase === 'clue'
              ? `Waiting on the ${view.turn} spymaster`
              : view.phase === 'gameover'
                ? 'Game over'
                : ''}
          </span>
        )}
      </div>

      {canClue && <ClueComposer size={size} />}

      {canAct && (
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {armed !== null && (
              <motion.div
                initial={{opacity: 0, scale: 0.9}}
                animate={{opacity: 1, scale: 1}}
                exit={{opacity: 0, scale: 0.9}}
                transition={spring.firm}
              >
                <Button onClick={() => intend({kind: 'guess', card: armed})}>
                  Confirm {view.cards[armed]?.word}
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

      <button
        type="button"
        aria-label={muted ? 'Unmute' : 'Mute'}
        onClick={() => {
          setPrefs({muted: !getPrefs().muted})
          if (muted) sfx.arm()
        }}
        className="type-mono ml-auto cursor-pointer rounded-md border border-ink-600 px-2.5 py-1.5 text-[11px] text-text-dim hover:border-brass-400/50 hover:text-brass-200"
      >
        {muted ? 'muted' : 'sound'}
      </button>
    </Panel>
  )
}
