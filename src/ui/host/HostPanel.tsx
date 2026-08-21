import {AnimatePresence, motion} from 'motion/react'
import {useMemo, useState} from 'react'
import {derive} from '../../game/reducer'
import type {Step} from '../../game/steps'
import {validate} from '../../game/settings'
import {hasPassword, intend, setPassword, useRoom} from '../../state/room'
import * as words from '../../state/words'
import {Button, Chip, Heading, Label, Panel, Rule, input} from '../atoms'
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
    className={`type-label cursor-pointer rounded-sm px-2.5 py-1.5 transition-colors duration-[120ms] ${
      active ? 'bg-brass-400/12 text-brass-200' : 'hover:text-brass-200'
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
        className="type-label surface-1 fixed right-3 bottom-3 z-40 flex cursor-pointer items-center gap-2 rounded-full border border-brass-400/45 px-3 py-1.5 text-brass-200 shadow-2 backdrop-blur transition-colors duration-[120ms] hover:border-brass-400"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-brass-400" />
        host{rewound ? ' · rewound' : ''}
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
            <Panel level={2} className="flex h-full flex-col overflow-hidden border border-brass-400/30 backdrop-blur sm:my-3">
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
                <Button variant="quiet" size="sm" aria-label="Close" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>

              <Rule />

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
                      <Label className="ml-auto">
                        {shared.cursor} / {shared.steps.length}
                      </Label>
                    </div>

                    {rows.length === 0 ? (
                      <p className="type-body">No steps yet.</p>
                    ) : (
                      <ol className="flex flex-col border-l border-ink-600 pl-3">
                        {rows.map(row => {
                          const applied = row.index < shared.cursor
                          return (
                            <li key={row.index}>
                              <button
                                type="button"
                                onClick={() => intend({kind: 'jump', cursor: row.index + 1})}
                                className={`type-mono flex w-full cursor-pointer items-baseline justify-between gap-2 rounded-sm px-2 py-1 text-left text-[11px] transition-colors duration-[120ms] hover:bg-ink-700/60 ${
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
                      <Heading>Transfer host</Heading>
                      {others.length === 0 ? (
                        <p className="type-body">Nobody else is connected.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {others.map(p => (
                            <Chip key={p.id} onClick={() => intend({kind: 'transferHost', target: p.id})}>
                              {p.name}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>

                    <Rule />

                    <div className="flex flex-col gap-2">
                      <Heading>
                        Lobby password
                        {hasPassword() && <span className="ml-2 text-brass-400/70">· set</span>}
                      </Heading>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={pass}
                          onChange={e => setPass(e.target.value)}
                          placeholder="New password"
                          className={`${input} type-mono min-w-0 flex-1 text-xs`}
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
                      <p className="type-body text-[11px]">
                        Applies to new joiners. Nobody in the room is disconnected.
                      </p>
                    </div>

                    <Rule />

                    {view.phase !== 'setup' && (
                      <div className="flex flex-col gap-2">
                        <Heading>End this game</Heading>
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
                        <p className="type-body text-[11px]">
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
                      <p className="type-label text-brass-200">
                        Locked mid-game. End the game to change the board.
                      </p>
                    )}
                    <SettingsPanel
                      settings={shared.settings}
                      editable={view.phase === 'setup' || view.phase === 'gameover'}
                      wordCount={list.length}
                    />
                    {problems.map(p => (
                      <p key={p.field} className="type-label text-red-glow">
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
