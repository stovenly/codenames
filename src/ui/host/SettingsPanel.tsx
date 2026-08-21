import {useState} from 'react'
import {PACKS, type PackId} from '../../data/wordlists'
import {
  CLUE_TIMERS,
  GUESS_TIMERS,
  cardCount,
  composition,
  presetFor,
  validate,
  type BoardSize,
  type Settings
} from '../../game/settings'
import {intend, setWordSource} from '../../state/room'
import * as words from '../../state/words'
import {Button, Chip, Heading, Label, Panel, Rule} from '../atoms'
import {CompositionRow} from './Composition'
import {CustomWordList} from './CustomWordList'

const Row = ({label, children}: {label: string; children: React.ReactNode}) => (
  <div className="flex flex-col gap-2">
    <Label>{label}</Label>
    {children}
  </div>
)

const Readout = ({label, value}: {label: string; value: string}) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <Label>{label}</Label>
    <span className="type-read text-xs text-text">{value}</span>
  </div>
)

const Slider = ({
  min,
  max,
  value,
  onChange
}: {
  min: number
  max: number
  value: number
  onChange: (v: number) => void
}) => (
  <input
    type="range"
    min={min}
    max={max}
    value={value}
    onChange={e => onChange(Number(e.target.value))}
    className="w-full accent-[var(--color-brass-400)]"
  />
)

export const SettingsPanel = ({
  settings,
  editable,
  wordCount
}: {
  settings: Settings
  editable: boolean
  wordCount: number
}) => {
  const [showCustom, setShowCustom] = useState(false)
  words.useWords()

  const remembered = words.lastSource()
  const selected: PackId[] = remembered?.source.kind === 'packs' ? remembered.source.packs : ['original']
  const total = cardCount(settings.size)
  const problems = validate(settings, wordCount)
  const maxTeam = Math.floor((total - 1 - settings.assassins) / 2)
  const c = composition(settings)

  const patch = (p: Partial<Settings>) => editable && intend({kind: 'updateSettings', patch: p})

  const togglePack = (id: PackId) => {
    const next = selected.includes(id) ? selected.filter(p => p !== id) : [...selected, id]
    const packs = next.length ? next : (['original'] as PackId[])
    void setWordSource(
      {kind: 'packs', packs},
      packs.map(p => PACKS.find(x => x.id === p)?.name ?? p).join(' + ')
    )
  }

  // Non-hosts get a readout, not a set of dead controls.
  if (!editable) {
    return (
      <Panel className="h-fit p-5" tab="Proposed">
        <Heading>Briefing</Heading>
        <Rule className="mt-3 mb-1" />
        <Readout label="Board" value={`${settings.size} × ${settings.size} · ${total} cards`} />
        <Readout label="Agents" value={`${c.perTeam} each`} />
        <Readout label="Assassins" value={String(c.assassins)} />
        <Readout label="Bystanders" value={String(Math.max(0, c.neutral))} />
        <Rule className="my-1" />
        <Readout label="Clue timer" value={settings.clueTimer ? `${settings.clueTimer}s` : 'off'} />
        <Readout label="Guess timer" value={settings.guessTimer ? `${settings.guessTimer}s` : 'off'} />
        <Rule className="my-1" />
        <Readout label="Word list" value={settings.wordListName} />
        <Readout
          label="Words"
          value={wordCount < total ? `${wordCount} — needs ${total}` : String(wordCount)}
        />
        <div className="mt-4">
          <CompositionRow settings={settings} />
        </div>
      </Panel>
    )
  }

  return (
    <Panel className="flex h-fit flex-col gap-6 p-5" tab="Configuration">
      <div className="flex flex-col gap-3">
        <Row label={`Board — ${settings.size} × ${settings.size}, ${total} cards`}>
          <div className="flex flex-wrap gap-1.5">
            {([3, 4, 5, 6, 7] as BoardSize[]).map(size => (
              <Chip
                key={size}
                active={settings.size === size}
                onClick={() => patch({size, ...presetFor(size)})}
              >
                {size}×{size}
              </Chip>
            ))}
          </div>
        </Row>

        <CompositionRow settings={settings} />

        <Row label={`Agents per team — ${settings.teamCards}`}>
          <Slider
            min={1}
            max={Math.max(1, maxTeam)}
            value={settings.teamCards}
            onChange={teamCards => patch({teamCards})}
          />
        </Row>

        <Row label={`Assassins — ${settings.assassins}`}>
          <Slider
            min={1}
            max={Math.max(1, total - 2 * settings.teamCards - 1)}
            value={settings.assassins}
            onChange={assassins => patch({assassins})}
          />
        </Row>

        {problems.map(p => (
          <p key={p.field} className="type-label text-red-glow">
            {p.message}
          </p>
        ))}
        {!problems.length && c.neutral === 0 && (
          <p className="type-label text-brass-200">No bystanders — playable, but brutal.</p>
        )}
      </div>

      <Rule />

      <Row label="Clue timer">
        <div className="flex flex-wrap gap-1.5">
          {CLUE_TIMERS.map((v, i) => (
            <Chip key={i} active={settings.clueTimer === v} onClick={() => patch({clueTimer: v})}>
              {v === null ? 'off' : `${v}s`}
            </Chip>
          ))}
        </div>
      </Row>

      <Row label="Guessing timer">
        <div className="flex flex-wrap gap-1.5">
          {GUESS_TIMERS.map((v, i) => (
            <Chip key={i} active={settings.guessTimer === v} onClick={() => patch({guessTimer: v})}>
              {v === null ? 'off' : `${v}s`}
            </Chip>
          ))}
        </div>
      </Row>

      <Rule />

      <Row label={`Word list — ${wordCount} words`}>
        <div className="flex flex-wrap gap-1.5">
          {PACKS.map(pack => (
            <Chip
              key={pack.id}
              active={selected.includes(pack.id)}
              disabled={pack.count < total}
              title={
                pack.count < total
                  ? `${pack.count} words, ${settings.size}×${settings.size} needs ${total}`
                  : pack.note
              }
              onClick={() => togglePack(pack.id)}
            >
              {pack.name}
              {pack.adult ? ' 18+' : ''}
              <span className="ml-1.5 opacity-50">{pack.count}</span>
            </Chip>
          ))}
        </div>
        <Button variant="quiet" size="sm" className="self-start" onClick={() => setShowCustom(v => !v)}>
          {showCustom ? 'Close custom list' : 'Custom list…'}
        </Button>
        {showCustom && <CustomWordList size={settings.size} />}
      </Row>
    </Panel>
  )
}
