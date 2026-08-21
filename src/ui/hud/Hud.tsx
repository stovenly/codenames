import {AnimatePresence, motion} from 'motion/react'
import {useState} from 'react'
import type {View} from '../../game/reducer'
import type {Player, Team} from '../../game/types'
import {myMark} from '../../state/presence'
import {getPrefs, setPrefs, usePrefs} from '../../state/prefs'
import {intend} from '../../state/room'
import {Button, Glyph, Label, Panel, input} from '../atoms'
import {spring, useMotion} from '../motion'
import {sfx} from '../sound/audio'
import {TimerArc} from './TimerArc'

const Score = ({team, left, total, active}: {team: Team; left: number; total: number; active: boolean}) => {
  const {reduced} = useMotion()
  return (
    <motion.div
      animate={{opacity: active ? 1 : 0.4}}
      transition={spring.firm}
      className="flex shrink-0 items-center gap-2"
    >
      <span
        className={`grid size-7 place-items-center rounded-sm ${
          team === 'red' ? 'pattern-red text-red-glow' : 'pattern-blue text-blue-glow'
        }`}
      >
        <Glyph team={team} />
      </span>
      <span className="flex items-baseline gap-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={left}
            initial={reduced ? {opacity: 0} : {y: 14, opacity: 0}}
            animate={{y: 0, opacity: 1}}
            exit={reduced ? {opacity: 0} : {y: -14, opacity: 0}}
            transition={spring.firm}
            className={`type-display text-2xl leading-none ${
              team === 'red' ? 'text-red-glow' : 'text-blue-glow'
            }`}
          >
            {left}
          </motion.span>
        </AnimatePresence>
        <Label>/{total}</Label>
      </span>
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
        className={`${input} type-read min-w-32 flex-1 border-brass-400/30 text-base tracking-[0.12em] uppercase placeholder:text-xs placeholder:tracking-normal placeholder:normal-case`}
      />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" aria-label="Fewer" onClick={() => step(-1)}>
          −
        </Button>
        <span className="type-display w-9 text-center text-lg text-brass-200">
          {count === 'unlimited' ? '∞' : count}
        </span>
        <Button variant="ghost" size="sm" aria-label="More" onClick={() => step(1)}>
          +
        </Button>
      </div>
      <Button onClick={submit} disabled={!word.trim()}>
        Give clue
      </Button>
    </div>
  )
}

const Divider = () => <span aria-hidden className="hidden h-8 w-px bg-ink-600 sm:block" />

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
    <Panel level={2} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
      <Score team="red" left={view.remaining.red} total={view.totals.red} active={view.turn === 'red'} />

      <Divider />

      <div className="flex min-w-44 flex-1 flex-col justify-center">
        {view.clue ? (
          <>
            <span className="type-read text-xl leading-tight text-text">
              {view.clue.word}
              <span className="ml-2 text-brass-200">
                {view.clue.count === 'unlimited' || view.clue.count === 0 ? '∞' : view.clue.count}
              </span>
            </span>
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
                ? `Waiting on the ${view.turn} spymaster`
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

      <Divider />

      <Score team="blue" left={view.remaining.blue} total={view.totals.blue} active={view.turn === 'blue'} />

      <Button
        variant="quiet"
        size="sm"
        aria-label={muted ? 'Unmute' : 'Mute'}
        onClick={() => {
          setPrefs({muted: !getPrefs().muted})
          if (muted) sfx.arm()
        }}
      >
        {muted ? 'Muted' : 'Sound'}
      </Button>
    </Panel>
  )
}
