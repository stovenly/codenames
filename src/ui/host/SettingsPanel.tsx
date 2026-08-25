import * as Slider from '@radix-ui/react-slider'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {useState} from 'react'
import {PACKS, knownPack, type PackId} from '../../data/wordlists'
import {
  CLUE_TIMERS,
  GUESS_TIMERS,
  cardCount,
  composition,
  maxBonusCards,
  maxTeamCards,
  presetFor,
  validate,
  type BoardSize,
  type Settings
} from '../../game/settings'
import {intend, setWordSource} from '../../state/room'
import * as words from '../../state/words'
import {Button, Chip, Heading, Label, Panel, Rule} from '../atoms'
import {cx} from '../cx'
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
    <span className="type-read text-sm text-text">{value}</span>
  </div>
)

/** Radix rather than `input[type=range]`: keyboard-operable and actually styleable. */
const Dial = ({
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
  <Slider.Root
    min={min}
    max={max}
    step={1}
    value={[value]}
    onValueChange={([v]) => onChange(v ?? min)}
    className="relative flex h-5 w-full touch-none items-center select-none"
  >
    <Slider.Track className="relative h-1 w-full grow rounded-full bg-stage-600">
      <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-gold-500 to-lamp-500" />
    </Slider.Track>
    <Slider.Thumb
      aria-label="Value"
      className="block size-4 cursor-grab rounded-full border border-lamp-300/60 bg-gradient-to-b from-lamp-300 to-lamp-500 shadow-[0_2px_8px_-2px_rgba(255,197,61,.8)] active:cursor-grabbing"
    />
  </Slider.Root>
)

/** Roving tabindex and group semantics, which a row of buttons does not have. */
const Picker = <T extends string>({
  value,
  options,
  onPick
}: {
  value: T
  options: Array<{value: T; label: string}>
  onPick: (v: T) => void
}) => (
  <ToggleGroup.Root
    type="single"
    value={value}
    onValueChange={v => v && onPick(v as T)}
    className="flex flex-wrap gap-1.5"
  >
    {options.map(o => (
      <ToggleGroup.Item
        key={o.value}
        value={o.value}
        className={cx(
          'type-read cursor-pointer rounded-sm border px-3 py-2 text-sm transition-colors duration-[120ms]',
          'border-stage-600 text-text-dim hover:border-gold-500/50 hover:text-text',
          'data-[state=on]:border-lamp-500/70 data-[state=on]:bg-lamp-500/12 data-[state=on]:text-lamp-300'
        )}
      >
        {o.label}
      </ToggleGroup.Item>
    ))}
  </ToggleGroup.Root>
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
  const picked: PackId =
    (remembered?.source.kind === 'packs'
      ? remembered.source.packs.filter(knownPack)[0]
      : undefined) ?? 'original'
  const total = cardCount(settings.size)
  const problems = validate(settings, wordCount)
  const c = composition(settings)

  const patch = (p: Partial<Settings>) => editable && intend({kind: 'updateSettings', patch: p})

  /** One bank at a time. Unioning decks mostly produced a soup nobody chose. */
  const choosePack = (id: PackId) => {
    void setWordSource({kind: 'packs', packs: [id]}, PACKS.find(p => p.id === id)?.name ?? id)
  }

  // Non-hosts get a readout, not a panel of dead controls.
  if (!editable) {
    return (
      <Panel className="h-fit p-5">
        <Heading>Board settings</Heading>
        <Rule className="mt-3 mb-1" />
        <Readout label="Board" value={`${settings.size} × ${settings.size} · ${total} cards`} />
        <Readout label="Team cards" value={`${c.perTeam} each`} />
        <Readout label="First team's bonus" value={c.bonus ? `+${c.bonus}` : 'none'} />
        <Readout label="Assassins" value={String(c.assassins)} />
        <Readout label="Neutral cards" value={String(Math.max(0, c.neutral))} />
        <div className="my-3">
          <CompositionRow settings={settings} />
        </div>
        <Rule className="my-1" />
        <Readout label="Clue timer" value={settings.clueTimer ? `${settings.clueTimer}s` : 'off'} />
        <Readout label="Guess timer" value={settings.guessTimer ? `${settings.guessTimer}s` : 'off'} />
        <Rule className="my-1" />
        <Readout label="Word bank" value={settings.wordListName} />
      </Panel>
    )
  }

  return (
    <Panel className="flex h-fit flex-col gap-6 p-5">
      <Heading>Board settings</Heading>

      <div className="flex flex-col gap-3">
        <Row label={`Board size — ${settings.size} × ${settings.size}, ${total} cards`}>
          <Picker
            value={String(settings.size)}
            options={([3, 4, 5, 6, 7] as BoardSize[]).map(s => ({
              value: String(s),
              label: `${s}×${s}`
            }))}
            onPick={v => patch({size: Number(v) as BoardSize, ...presetFor(Number(v) as BoardSize)})}
          />
        </Row>

        <Row label={`Team cards — ${settings.teamCards}`}>
          <Dial
            min={1}
            max={Math.max(1, maxTeamCards(settings))}
            value={settings.teamCards}
            onChange={teamCards => patch({teamCards})}
          />
        </Row>

        <Row label={`First team's bonus cards — ${c.bonus}`}>
          <Dial
            min={0}
            max={Math.max(0, maxBonusCards(settings))}
            value={c.bonus}
            onChange={bonusCards => patch({bonusCards})}
          />
        </Row>

        <Row label={`Assassins — ${settings.assassins}`}>
          <Dial
            min={1}
            max={Math.max(1, total - 2 * settings.teamCards - c.bonus)}
            value={settings.assassins}
            onChange={assassins => patch({assassins})}
          />
        </Row>

        <CompositionRow settings={settings} />

        {problems.map(p => (
          <p key={p.field} className="type-label text-kill-lit">
            {p.message}
          </p>
        ))}
        {!problems.length && c.neutral === 0 && (
          <p className="type-label text-lamp-300">No neutral cards — playable, but brutal.</p>
        )}
      </div>

      <Rule />

      <Row label="Clue timer">
        <Picker
          value={String(settings.clueTimer)}
          options={CLUE_TIMERS.map(v => ({value: String(v), label: v === null ? 'off' : `${v}s`}))}
          onPick={v => patch({clueTimer: v === 'null' ? null : Number(v)})}
        />
      </Row>

      <Row label="Guessing timer">
        <Picker
          value={String(settings.guessTimer)}
          options={GUESS_TIMERS.map(v => ({value: String(v), label: v === null ? 'off' : `${v}s`}))}
          onPick={v => patch({guessTimer: v === 'null' ? null : Number(v)})}
        />
      </Row>

      <Rule />

      <Row label="Word bank">
        <div className="flex flex-wrap gap-1.5">
          {PACKS.map(pack => (
            <Chip
              key={pack.id}
              active={picked === pack.id}
              disabled={pack.count < total}
              title={
                pack.count < total
                  ? `${pack.count} words, ${settings.size}×${settings.size} needs ${total}`
                  : pack.note
              }
              onClick={() => choosePack(pack.id)}
            >
              {pack.name}
            </Chip>
          ))}
        </div>
        <Button variant="quiet" size="sm" className="self-start" onClick={() => setShowCustom(v => !v)}>
          {showCustom ? 'Close custom word bank' : 'Custom word bank…'}
        </Button>
        {showCustom && <CustomWordList size={settings.size} />}
      </Row>
    </Panel>
  )
}
