import * as Dialog from '@radix-ui/react-dialog'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {Redo2, Settings2, Undo2, X} from 'lucide-react'
import {useMemo, useState} from 'react'
import {derive} from '../../game/reducer'
import {validate} from '../../game/settings'
import type {Step} from '../../game/steps'
import {hasPassword, intend, setPassword, useRoom} from '../../state/room'
import * as words from '../../state/words'
import {Button, Chip, Heading, IconButton, Label, Rule, input} from '../atoms'
import {cx} from '../cx'
import {SettingsPanel} from './SettingsPanel'

const describe = (step: Step, cards: {word: string; colour: string}[]): string => {
  switch (step.t) {
    case 'start':
      return 'Game start'
    case 'clue':
      return `${step.team} clue "${step.word} ${step.count === 'unlimited' ? '∞' : step.count}"`
    case 'guess': {
      const card = cards[step.card]
      const outcome =
        card?.colour === step.team ? 'hit' : card?.colour === 'assassin' ? 'ASSASSIN' : (card?.colour ?? '')
      return `${step.team} picked ${card?.word ?? '?'} — ${outcome}`
    }
    case 'endTurn':
      return `Turn to ${step.team === 'red' ? 'blue' : 'red'} (${step.reason})`
    case 'end':
      return `${step.winner} wins on ${step.reason}`
  }
}

const TABS = [
  {value: 'history', label: 'History'},
  {value: 'room', label: 'Room'},
  {value: 'board', label: 'Board'}
] as const

type Tab = (typeof TABS)[number]['value']

export const HostPanel = () => {
  const {shared, me} = useRoom()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('history')
  const [pass, setPass] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  words.useWords()

  const list = shared ? words.get(shared.settings.wordListHash) : []

  const rows = useMemo(() => {
    if (!shared) return []
    return shared.steps.map((step, i) => ({
      index: i,
      label: describe(step, derive(shared.settings, list, shared.steps, i).cards),
      score: (() => {
        const after = derive(shared.settings, list, shared.steps, i + 1)
        return `${after.remaining.red}–${after.remaining.blue}`
      })()
    }))
  }, [shared, list])

  if (!shared) return null

  const view = derive(shared.settings, list, shared.steps, shared.cursor)
  const rewound = shared.cursor < shared.steps.length
  const problems = validate(shared.settings, list.length)
  const others = shared.players.filter(p => p.id !== me && p.connected)
  const editable = view.phase === 'setup' || view.phase === 'gameover'

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cx(
            'type-label fixed right-4 bottom-4 z-40 flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 backdrop-blur transition-colors duration-[120ms]',
            rewound
              ? 'border-kill-lit/60 bg-kill-lit/10 text-kill-lit'
              : 'border-lamp-500/50 bg-stage-800/85 text-lamp-300 hover:border-lamp-500'
          )}
        >
          <Settings2 className="size-3.5" />
          {rewound ? 'Rewound' : 'Host'}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-stage-000/70 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="plate fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-lg sm:inset-y-3 sm:right-3 sm:left-auto sm:w-[24rem] sm:rounded-lg"
        >
          <div className="flex items-center justify-between gap-2 p-3">
            <Dialog.Title asChild>
              <Heading className="sr-only">Host controls</Heading>
            </Dialog.Title>

            <ToggleGroup.Root
              type="single"
              value={tab}
              onValueChange={v => v && setTab(v as Tab)}
              className="flex gap-1"
            >
              {TABS.map(t => (
                <ToggleGroup.Item
                  key={t.value}
                  value={t.value}
                  className="type-label cursor-pointer rounded-sm px-2.5 py-1.5 transition-colors duration-[120ms] hover:text-lamp-300 data-[state=on]:bg-lamp-500/12 data-[state=on]:text-lamp-300"
                >
                  {t.label}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>

            <Dialog.Close asChild>
              <IconButton label="Close" className="size-7">
                <X className="size-3.5" />
              </IconButton>
            </Dialog.Close>
          </div>

          <Rule />

          <div className="flex-1 overflow-y-auto p-3">
            {tab === 'history' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={shared.cursor <= 0}
                    onClick={() => intend({kind: 'undo'})}
                    className="flex items-center gap-1.5"
                  >
                    <Undo2 className="size-3.5" /> Undo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={shared.cursor >= shared.steps.length}
                    onClick={() => intend({kind: 'redo'})}
                    className="flex items-center gap-1.5"
                  >
                    <Redo2 className="size-3.5" /> Redo
                  </Button>
                  <Label className="ml-auto">
                    {shared.cursor} / {shared.steps.length}
                  </Label>
                </div>

                {rows.length === 0 ? (
                  <p className="type-body">Nothing has happened yet.</p>
                ) : (
                  <ol className="flex flex-col border-l border-stage-600 pl-3">
                    {rows.map(row => (
                      <li key={row.index}>
                        <button
                          type="button"
                          onClick={() => intend({kind: 'jump', cursor: row.index + 1})}
                          className={cx(
                            'type-read flex w-full cursor-pointer items-baseline justify-between gap-2 rounded-sm px-2 py-1 text-left text-[11px] transition-colors duration-[120ms] hover:bg-stage-700/60',
                            row.index < shared.cursor ? 'text-text' : 'text-text-dim/40',
                            row.index + 1 === shared.cursor && 'bg-lamp-500/10 text-lamp-300'
                          )}
                        >
                          <span className="flex-1">
                            <span className="mr-2 opacity-40">{row.index + 1}</span>
                            {row.label}
                          </span>
                          <span className="shrink-0 opacity-60">{row.score}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {tab === 'room' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Heading>Hand over the room</Heading>
                  {others.length === 0 ? (
                    <p className="type-body">Nobody else is connected.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {others.map(p => (
                        <Chip
                          key={p.id}
                          onClick={() => intend({kind: 'transferHost', target: p.id})}
                        >
                          {p.name}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>

                <Rule />

                <div className="flex flex-col gap-2">
                  <Heading>
                    Password
                    {hasPassword() && <span className="ml-2 text-lamp-500/70">· set</span>}
                  </Heading>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      placeholder="New password"
                      className={cx(input, 'min-w-0 flex-1 text-xs')}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void setPassword(pass.trim() || null)
                        setPass('')
                      }}
                    >
                      {pass.trim() ? 'Set' : 'Clear'}
                    </Button>
                  </div>
                  <p className="type-body">Applies to new players only.</p>
                </div>

                {view.phase !== 'setup' && (
                  <>
                    <Rule />
                    <div className="flex flex-col gap-2">
                      <Heading>End this game</Heading>
                      {confirmEnd ? (
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              intend({kind: 'endGame'})
                              setConfirmEnd(false)
                              setOpen(false)
                            }}
                          >
                            Discard it
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(false)}>
                            Keep playing
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>
                          End game now
                        </Button>
                      )}
                      <p className="type-body">Everyone goes back to the waiting room.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'board' && (
              <div className="flex flex-col gap-3">
                {!editable && (
                  <p className="type-label text-lamp-300">
                    Locked while a game is running.
                  </p>
                )}
                <SettingsPanel
                  settings={shared.settings}
                  editable={editable}
                  wordCount={list.length}
                />
                {problems.map(p => (
                  <p key={p.field} className="type-label text-kill-lit">
                    {p.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
