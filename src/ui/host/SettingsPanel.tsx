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
import {BrassRule, Panel} from '../atoms'
import {CompositionRow} from './Composition'
import {CustomWordList} from './CustomWordList'

const Row = ({label, children}: {label: string; children: React.ReactNode}) => (
  <div className="flex flex-col gap-2">
    <span className="type-mono text-[11px] tracking-wide text-text-dim">{label}</span>
    {children}
  </div>
)

const Segmented = <T,>({
  options,
  value,
  format,
  onPick,
  editable
}: {
  options: readonly T[]
  value: T
  format: (v: T) => string
  onPick: (v: T) => void
  editable: boolean
}) => (
  <div className="flex flex-wrap gap-1">
    {options.map((option, i) => {
      const active = option === value
      return (
        <button
          key={i}
          type="button"
          disabled={!editable}
          onClick={() => onPick(option)}
          className={`type-mono rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
            active
              ? 'border-brass-400 bg-brass-400/15 text-brass-200'
              : 'border-ink-600 text-text-dim'
          } ${editable ? 'cursor-pointer hover:border-brass-400/50' : 'cursor-default'}`}
        >
          {format(option)}
        </button>
      )
    })}
  </div>
)

const Slider = ({
  min,
  max,
  value,
  onChange,
  editable
}: {
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  editable: boolean
}) => (
  <input
    type="range"
    min={min}
    max={max}
    value={value}
    disabled={!editable}
    onChange={e => onChange(Number(e.target.value))}
    className="w-full accent-[var(--color-brass-400)] disabled:opacity-60"
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
  const selected: PackId[] =
    remembered?.source.kind === 'packs' ? remembered.source.packs : ['original']
  const total = cardCount(settings.size)
  const problems = validate(settings, wordCount)
  const maxTeam = Math.floor((total - 1 - settings.assassins) / 2)

  const patch = (p: Partial<Settings>) => editable && intend({kind: 'updateSettings', patch: p})

  const pickSize = (size: BoardSize) => patch({size, ...presetFor(size)})

  const togglePack = (id: PackId) => {
    if (!editable) return
    const next = selected.includes(id) ? selected.filter(p => p !== id) : [...selected, id]
    const packs = next.length ? next : (['original'] as PackId[])
    const label = packs.map(p => PACKS.find(x => x.id === p)?.name ?? p).join(' + ')
    void setWordSource({kind: 'packs', packs}, label)
  }

  return (
    <Panel className="flex flex-col gap-5 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="type-display text-sm text-brass-200">
          {editable ? 'Configuration' : 'Proposed'}
        </h2>
        {!editable && <span className="type-mono text-[10px] text-text-dim">host decides</span>}
      </div>

      <Row label={`Board — ${settings.size} × ${settings.size}, ${total} cards`}>
        <Segmented
          options={[3, 4, 5, 6, 7] as BoardSize[]}
          value={settings.size}
          format={s => `${s}×${s}`}
          onPick={pickSize}
          editable={editable}
        />
      </Row>

      <div className="flex flex-col gap-3">
        <CompositionRow settings={settings} />
        {editable && (
          <>
            <Row label={`Agents per team — ${settings.teamCards}`}>
              <Slider
                min={1}
                max={Math.max(1, maxTeam)}
                value={settings.teamCards}
                onChange={teamCards => patch({teamCards})}
                editable
              />
            </Row>
            <Row label={`Assassins — ${settings.assassins}`}>
              <Slider
                min={1}
                max={Math.max(1, total - 2 * settings.teamCards - 1)}
                value={settings.assassins}
                onChange={assassins => patch({assassins})}
                editable
              />
            </Row>
          </>
        )}
        {problems.map(p => (
          <p key={p.field} className="type-mono text-[11px] text-red-glow">
            {p.message}
          </p>
        ))}
        {!problems.length && composition(settings).neutral === 0 && (
          <p className="type-mono text-[11px] text-brass-200">
            No bystanders at all — playable, but it will be brutal.
          </p>
        )}
      </div>

      <BrassRule />

      <Row label="Clue timer">
        <Segmented
          options={CLUE_TIMERS}
          value={settings.clueTimer}
          format={v => (v === null ? 'off' : `${v}s`)}
          onPick={clueTimer => patch({clueTimer})}
          editable={editable}
        />
      </Row>

      <Row label="Guessing timer">
        <Segmented
          options={GUESS_TIMERS}
          value={settings.guessTimer}
          format={v => (v === null ? 'off' : `${v}s`)}
          onPick={guessTimer => patch({guessTimer})}
          editable={editable}
        />
      </Row>

      <BrassRule />

      <Row label={`Word list — ${settings.wordListName}, ${wordCount} words`}>
        {editable ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              {PACKS.map(pack => {
                const tooSmall = pack.count < total
                const active = selected.includes(pack.id)
                return (
                  <button
                    key={pack.id}
                    type="button"
                    disabled={tooSmall}
                    title={
                      tooSmall
                        ? `${pack.count} words, ${settings.size}×${settings.size} needs ${total}`
                        : pack.note
                    }
                    onClick={() => togglePack(pack.id)}
                    className={`type-mono rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
                      active
                        ? 'border-brass-400 bg-brass-400/15 text-brass-200'
                        : 'border-ink-600 text-text-dim hover:border-brass-400/50'
                    } disabled:cursor-not-allowed disabled:border-ink-700 disabled:text-text-dim/40`}
                  >
                    {pack.name}
                    {pack.adult ? ' 18+' : ''}
                    <span className="ml-1 opacity-60">{pack.count}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowCustom(v => !v)}
              className="type-mono cursor-pointer self-start text-[11px] text-brass-200 underline-offset-4 hover:underline"
            >
              {showCustom ? 'Close custom list' : 'Custom list…'}
            </button>
            {showCustom && <CustomWordList size={settings.size} />}
          </div>
        ) : (
          <p className="type-mono text-[11px] text-text-dim">
            {wordCount < total ? `Needs ${total} for this board` : 'Ready'}
          </p>
        )}
      </Row>
    </Panel>
  )
}
