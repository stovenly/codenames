import {motion} from 'motion/react'
import NumberFlow from '@number-flow/react'
import {Minus, Plus} from 'lucide-react'
import {useEffect, useRef, useState} from 'react'
import type {View} from '../../game/reducer'
import type {Player, Team} from '../../game/types'
import {clearMyMark, useMyMark} from '../../state/presence'
import {intend} from '../../state/room'
import {previewGuess} from '../../state/theatre'
import {Bulbs, Button, Glyph, Label, Panel, input} from '../atoms'
import {cx} from '../cx'
import {spring} from '../motion'
import {HostLink} from './HostLink'
import {TimerArc} from './TimerArc'

const TONE: Record<Team, string> = {
  red: 'border-red-500/60 bg-red-500/15 text-red-lit',
  blue: 'border-blue-500/60 bg-blue-500/15 text-blue-lit'
}

/**
 * Lit bulbs say a side is active but not which side you are on, and half the
 * table loses track of that within two turns. This says both, in words.
 */
const Standing = ({view, me}: {view: View; me: Player | null}) => {
  const mine = me?.team === view.turn
  const waiting = view.phase === 'clue'

  const line = !me?.team
    ? `${view.turn} team's turn`
    : mine
      ? me.spymaster
        ? waiting
          ? 'Your turn — give your team a clue'
          : 'Your team is guessing'
        : waiting
          ? 'Your spymaster is thinking'
          : 'You are guessing'
      : `${view.turn} team's turn`

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cx(
          'type-marquee rounded-sm border px-2.5 py-1 text-[11px] tracking-[0.14em]',
          view.turn === 'red' ? TONE.red : TONE.blue
        )}
      >
        {line}
      </span>
      {me?.team && (
        <Label className={me.team === 'red' ? 'text-red-lit/70' : 'text-blue-lit/70'}>
          you are {me.spymaster ? 'spymaster' : 'a spy'} for {me.team}
        </Label>
      )}
    </div>
  )
}

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
        team === 'red' ? 'bg-red-500/15 text-red-lit' : 'bg-blue-500/15 text-blue-lit'
      )}
    >
      <Glyph team={team} className="size-2.5" />
      <span className="type-label">{team}</span>
    </span>
    <NumberFlow
      value={left}
      className={cx('type-marquee text-4xl leading-none', team === 'red' ? 'text-red-lit' : 'text-blue-lit')}
      style={{
        textShadow:
          team === 'red' ? '0 0 18px var(--glow-red-text)' : '0 0 18px rgba(111,182,255,.5)'
      }}
    />
    <Bulbs lit={active} chase={active} className="w-14" />
  </motion.div>
)

/**
 * `max` is what the team has left on the board, not the size of it. A clue for
 * five when four of yours remain is a number that cannot be right, and offering
 * it up to 49 made the dial a long scroll past every number nobody would pick.
 * Unlimited still sits one past the top, where it belongs.
 */
const LAST_CALL_MS = 700

const ClueComposer = ({max, deadline}: {max: number; deadline: number | null}) => {
  const [word, setWord] = useState('')
  const [count, setCount] = useState<number | 'unlimited'>(1)

  const submit = () => {
    const trimmed = word.trim()
    if (!trimmed) return
    intend({kind: 'clue', word: trimmed.toUpperCase(), count})
    setWord('')
    setCount(1)
  }

  // Whatever is in the box when the clock is nearly up is sent as though the
  // button had been pressed. Just before the deadline, not on it: the host
  // ends the phase itself the moment it passes.
  const latest = useRef(submit)
  latest.current = submit
  useEffect(() => {
    if (deadline === null) return
    const id = setTimeout(() => latest.current(), Math.max(0, deadline - LAST_CALL_MS - Date.now()))
    return () => clearTimeout(id)
  }, [deadline])

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
          'min-w-32 flex-1 border-lamp-500/40 text-lg tracking-[0.12em] uppercase placeholder:text-sm placeholder:tracking-normal placeholder:normal-case'
        )}
      />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" aria-label="Fewer" onClick={() => step(-1)}>
          <Minus className="size-3.5" />
        </Button>
        <span className="type-marquee w-10 text-center text-xl text-lamp-300">
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
  busy
}: {
  view: View
  me: Player | null
  deadline: number | null
  timerTotal: number
  busy: boolean
}) => {
    const armed = useMyMark()
  const myTurn = me?.team === view.turn
  const amSpymaster = !!me?.spymaster

  const canClue = myTurn && amSpymaster && view.phase === 'clue' && !busy
  const canAct = myTurn && !amSpymaster && view.phase === 'guess' && !busy

  return (
    <div className="flex w-full flex-col gap-3">
      <Panel level={2} glossy className="flex flex-col gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Score team="red" left={view.remaining.red} active={view.turn === 'red'} />

          {/* Everything that says whose turn it is lives between the two scores,
              which is where anyone looking for it already is. */}
          <div className="flex min-w-44 flex-1 flex-col items-center justify-center gap-1 text-center">
            <Standing view={view} me={me} />
          <HostLink />

            {view.clue ? (
              <>
                <motion.span
                  key={view.clue.word}
                  initial={{opacity: 0, y: 8}}
                  animate={{opacity: 1, y: 0}}
                  transition={spring.firm}
                  className={cx(
                    'type-marquee text-2xl leading-tight sm:text-3xl',
                    view.clue.word ? 'text-text' : 'text-text-dim'
                  )}
                  style={view.clue.word ? {textShadow: '0 0 20px rgba(255,197,61,.28)'} : undefined}
                >
                  {view.clue.word || 'NO CLUE'}
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
            ) : null}
          </div>

          {deadline !== null && timerTotal > 0 && <TimerArc deadline={deadline} total={timerTotal} />}

          <Score team="blue" left={view.remaining.blue} active={view.turn === 'blue'} />
        </div>

        {/* Its own row. Sharing one with the clue meant the clue slid sideways
            every time a button turned up beside it — and the clue is the thing
            everyone is reading. */}
      </Panel>

      {/* Outside the panel and beneath it. What you can do is not part of the
          readout of what is happening, and keeping it inside meant every button
          that turned up shoved the clue along. */}
      {(canClue || canAct) && (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
          {canClue && (
            <ClueComposer max={Math.max(1, view.remaining[view.turn])} deadline={deadline} />
          )}

          {canAct && (
            <>
              {/* Always present, disabled until a card is picked, rather than
                  appearing and shunting Pass across the row. */}
              <Button
                size="lg"
                disabled={armed === null}
                onClick={() => {
                  if (armed === null) return
                  previewGuess(armed)
                  intend({kind: 'guess', card: armed})
                  clearMyMark()
                }}
                className="max-w-[min(60vw,18rem)] truncate"
              >
                {armed === null ? 'Lock in' : `Lock in “${view.cards[armed]?.word}”`}
              </Button>

              <Button
                variant="ghost"
                disabled={view.guessedSinceClue < 1}
                title={view.guessedSinceClue < 1 ? 'Guess at least once before passing' : undefined}
                onClick={() => intend({kind: 'pass'})}
              >
                Pass
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
