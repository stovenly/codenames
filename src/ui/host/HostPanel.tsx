import {AnimatePresence, motion} from 'motion/react'
import {useMemo, useState} from 'react'
import {derive} from '../../game/reducer'
import type {Step} from '../../game/steps'
import {validate} from '../../game/settings'
import {hasPassword, intend, setPassword, useRoom} from '../../state/room'
import * as words from '../../state/words'
import {Button, BrassRule, Panel, Pill} from '../atoms'
import {spring, useReducedMotion} from '../motion'
import {SettingsPanel} from './SettingsPanel'

const describe = (step: Step, cards: {word: string; colour: string}[]): string => {
  switch (step.t) {
    case 'start':
      return 'Game start'
    case 'clue':
      return `${step.team === 'red' ? 'Red' : 'Blue'} spymaster: "${step.word} ${
        step.count === 'unlimited' ? '∞' : step.count
      }"`
    case 'guess': {
      const card = cards[step.card]
      const outcome =
        card?.colour === step.team ? 'correct' : card?.colour === 'assassin' ? 'ASSASSIN' : card?.colour ?? ''
      return `${step.team === 'red' ? 'Red' : 'Blue'} guessed ${card?.word ?? '?'} — ${outcome}`
    }
    case 'endTurn':
      return `Turn passed to ${step.team === 'red' ? 'Blue' : 'Red'} (${step.reason})`
    case 'end':
      return `${step.winner === 'red' ? 'Red' : 'Blue'} wins on ${step.reason}`
  }
}

const Tab = ({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`type-mono cursor-pointer rounded-md px-2.5 py-1.5 text-[11px] transition-colors ${
      active ? 'bg-brass-400/15 text-brass-200' : 'text-text-dim hover:text-brass-200'
    }`}
  >
    {children}
  </button>
)

export const HostPanel = () => {
  const {shared, me} = useRoom()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'history' | 'room' | 'config'>('history')
  const [pass, setPass] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const reduced = useReducedMotion()
  words.useWords()

  const list = shared ? words.get(shared.settings.wordListHash) : []

  const rows = useMemo(() => {
    if (!shared) return []
    return shared.steps.map((step, i) => {
      const before = derive(shared.settings, list, shared.steps, i)
      const after = derive(shared.settings, list, shared.steps, i + 1)
      return {
        step,
        index: i,
        label: describe(step, before.cards),
        score: `${after.remaining.red} – ${after.remaining.blue}`
      }
    })
  }, [shared, list])

  if (!shared) return null

  const view = derive(shared.settings, list, shared.steps, shared.cursor)
  const rewound = shared.cursor < shared.steps.length
  const problems = validate(shared.settings, list.length)
  const others = shared.players.filter(p => p.id !== me && p.connected)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="type-mono fixed right-3 bottom-3 z-40 cursor-pointer rounded-full border border-brass-400/50 bg-ink-800/90 px-3 py-1.5 text-[11px] text-brass-200 backdrop-blur hover:bg-ink-700"
      >
        host {rewound ? '· rewound' : ''}
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={reduced ? {opacity: 0} : {opacity: 0, x: 40}}
            animate={{opacity: 1, x: 0}}
            exit={reduced ? {opacity: 0} : {opacity: 0, x: 40}}
            transition={spring.firm}
            className="fixed right-0 bottom-0 z-40 max-h-[85vh] w-full sm:top-0 sm:right-3 sm:bottom-3 sm:max-h-none sm:w-96"
          >
            <Panel className="flex h-full flex-col overflow-hidden border-brass-400/40 backdrop-blur sm:my-3">
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="flex gap-1">
                  <Tab active={tab === 'history'} onClick={() => setTab('history')}>
                    History
                  </Tab>
                  <Tab active={tab === 'room'} onClick={() => setTab('room')}>
                    Room
                  </Tab>
                  <Tab active={tab === 'config'} onClick={() => setTab('config')}>
                    Board
                  </Tab>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="type-mono cursor-pointer px-2 text-text-dim hover:text-brass-200"
                >
                  ×
                </button>
              </div>

              <BrassRule />

              <div className="flex-1 overflow-y-auto p-3">
                {tab === 'history' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        disabled={shared.cursor <= 0}
                        onClick={() => intend({kind: 'undo'})}
                      >
                        Undo
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={shared.cursor >= shared.steps.length}
                        onClick={() => intend({kind: 'redo'})}
                      >
                        Redo
                      </Button>
                      <span className="type-mono ml-auto text-[10px] text-text-dim">
                        {shared.cursor}/{shared.steps.length}
                      </span>
                    </div>

                    {rows.length === 0 ? (
                      <p className="text-xs text-text-dim">No steps yet.</p>
                    ) : (
                      <ol className="flex flex-col border-l border-ink-600 pl-3">
                        {rows.map(row => {
                          const applied = row.index < shared.cursor
                          return (
                            <li key={row.index}>
                              <button
                                type="button"
                                onClick={() => intend({kind: 'jump', cursor: row.index + 1})}
                                className={`type-mono flex w-full cursor-pointer items-baseline justify-between gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors hover:bg-ink-700/60 ${
                                  applied ? 'text-text' : 'text-text-dim/45'
                                } ${row.index + 1 === shared.cursor ? 'bg-brass-400/10 text-brass-200' : ''}`}
                              >
                                <span className="flex-1">
                                  <span className="mr-2 opacity-40">{row.index + 1}</span>
                                  {row.label}
                                </span>
                                <span className="shrink-0 opacity-60">{row.score}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </div>
                )}

                {tab === 'room' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="type-mono text-[11px] text-text-dim">Transfer host</span>
                      {others.length === 0 ? (
                        <p className="text-xs text-text-dim">Nobody else is connected.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {others.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => intend({kind: 'transferHost', target: p.id})}
                              className="type-mono cursor-pointer rounded-md border border-ink-600 px-2.5 py-1.5 text-[11px] text-text-dim hover:border-brass-400/50 hover:text-brass-200"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <BrassRule />

                    <div className="flex flex-col gap-2">
                      <span className="type-mono text-[11px] text-text-dim">
                        Lobby password {hasPassword() && <Pill tone="brass">set</Pill>}
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={pass}
                          onChange={e => setPass(e.target.value)}
                          placeholder="New password"
                          className="type-mono min-w-0 flex-1 rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-xs text-text placeholder:text-text-dim/50"
                        />
                        <Button
                          variant="ghost"
                          onClick={() => {
                            void setPassword(pass.trim() || null)
                            setPass('')
                          }}
                        >
                          {pass.trim() ? 'Set' : 'Clear'}
                        </Button>
                      </div>
                      <p className="text-[11px] text-text-dim">
                        Applies to new joiners. Nobody in the room is disconnected.
                      </p>
                    </div>

                    <BrassRule />

                    {view.phase !== 'setup' && (
                      <div className="flex flex-col gap-2">
                        <span className="type-mono text-[11px] text-text-dim">End this game</span>
                        {confirmEnd ? (
                          <div className="flex gap-2">
                            <Button
                              variant="danger"
                              onClick={() => {
                                intend({kind: 'endGame'})
                                setConfirmEnd(false)
                                setOpen(false)
                              }}
                            >
                              Discard it
                            </Button>
                            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
                              Keep playing
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" onClick={() => setConfirmEnd(true)}>
                            End game now
                          </Button>
                        )}
                        <p className="text-[11px] text-text-dim">
                          Discards the current game and returns everyone to the waiting room with
                          teams and settings intact.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'config' && (
                  <div className="flex flex-col gap-3">
                    {view.phase !== 'setup' && view.phase !== 'gameover' && (
                      <p className="type-mono text-[11px] text-brass-200">
                        Locked mid-game. End the game to change the board.
                      </p>
                    )}
                    <SettingsPanel
                      settings={shared.settings}
                      editable={view.phase === 'setup' || view.phase === 'gameover'}
                      wordCount={list.length}
                    />
                    {problems.map(p => (
                      <p key={p.field} className="type-mono text-[11px] text-red-glow">
                        {p.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
