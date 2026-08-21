import * as Popover from '@radix-ui/react-popover'
import * as Slider from '@radix-ui/react-slider'
import {Dices, Pipette} from 'lucide-react'
import {useEffect, useState} from 'react'
import {HexColorPicker} from 'react-colorful'
import type {Avatar as AvatarSpec} from '../../game/types'
import {IconButton, Label, Panel, input} from '../atoms'
import {cx} from '../cx'
import {AvatarView} from './Avatar'
import {BACKGROUNDS, STYLES, VARIANTS} from './styles'

/** A style that is no longer offered — an old session, a removed pack — lands on the first. */
const styleIndex = (id: string) => {
  const i = STYLES.findIndex(s => s.id === id)
  return i < 0 ? 0 : i
}

/** The seed is the variant index, so the slider can always find its way back to it. */
const variantIndex = (seed: string) => {
  const n = Number(seed)
  return Number.isInteger(n) && n >= 0 && n < VARIANTS ? n : 0
}

const clean = (hex: string) => hex.replace('#', '').toUpperCase()

const CustomColour = ({value, onPick}: {value: string; onPick: (hex: string) => void}) => {
  const [draft, setDraft] = useState(`#${value}`)

  useEffect(() => setDraft(`#${value}`), [value])

  const commit = (hex: string) => {
    setDraft(hex)
    if (/^#[0-9a-f]{6}$/i.test(hex)) onPick(clean(hex))
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Custom backdrop colour"
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-xs border border-stage-600 text-text-dim transition-colors hover:border-gold-500/60 hover:text-lamp-300"
          style={{background: `#${value}`}}
        >
          <Pipette className="size-3.5 mix-blend-difference" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={10}
          className="plate z-50 rounded-md p-3 shadow-4"
        >
          <div className="flex flex-col gap-3">
            <HexColorPicker color={draft} onChange={commit} style={{width: 190, height: 150}} />
            <input
              value={draft}
              onChange={e => commit(e.target.value)}
              spellCheck={false}
              aria-label="Hex colour"
              className={cx(input, 'py-2 text-center text-sm uppercase')}
            />
          </div>
          <Popover.Arrow className="fill-stage-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const AvatarPicker = ({
  value,
  onChange
}: {
  value: AvatarSpec
  onChange: (next: AvatarSpec) => void
}) => {
  const style = STYLES[styleIndex(value.style)]!
  const variant = variantIndex(value.seed)

  /** Never lands on the one already showing, which reads as a broken button. */
  const roll = () => {
    const next = (variant + 1 + Math.floor(Math.random() * (VARIANTS - 1))) % VARIANTS
    onChange({...value, seed: String(next)})
  }

  return (
    <Panel className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-4">
        <span className="shrink-0 rounded-md bg-stage-000 p-1.5 ring-1 ring-gold-500/35">
          <AvatarView spec={value} size={84} />
        </span>

        <div className="flex flex-1 flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <Label>
              {style.name} · {variant + 1} of {VARIANTS}
            </Label>
            <IconButton label="Roll a random one" onClick={roll} className="size-8">
              <Dices className="size-4" />
            </IconButton>
          </div>

          {/* Scrubs the variants inside the chosen style, not the styles themselves. */}
          <Slider.Root
            min={0}
            max={VARIANTS - 1}
            step={1}
            value={[variant]}
            onValueChange={([i]) => onChange({...value, seed: String(i ?? 0)})}
            aria-label={`${style.name} variant`}
            className="relative flex h-5 w-full touch-none items-center select-none"
          >
            <Slider.Track className="relative h-1 w-full grow rounded-full bg-stage-600">
              <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-gold-500 to-lamp-500" />
            </Slider.Track>
            <Slider.Thumb className="block size-4 cursor-grab rounded-full border border-lamp-300/60 bg-gradient-to-b from-lamp-300 to-lamp-500 shadow-[0_2px_8px_-2px_rgba(255,197,61,.8)] active:cursor-grabbing" />
          </Slider.Root>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {STYLES.map(s => (
          <button
            key={s.id}
            type="button"
            title={s.note}
            aria-pressed={value.style === s.id}
            onClick={() => onChange({...value, style: s.id})}
            className={cx(
              'flex cursor-pointer flex-col items-center gap-1 rounded-sm border p-1.5 transition-colors duration-[120ms]',
              value.style === s.id
                ? 'border-lamp-500/70 bg-lamp-500/10'
                : 'border-stage-600 hover:border-gold-500/50'
            )}
          >
            <AvatarView spec={{...value, style: s.id}} size={38} />
            <Label>{s.name}</Label>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label>Backdrop</Label>
        <CustomColour value={value.bg} onPick={bg => onChange({...value, bg})} />
        {BACKGROUNDS.map(bg => (
          <button
            key={bg}
            type="button"
            aria-label={`Backdrop ${bg}`}
            aria-pressed={value.bg === bg}
            onClick={() => onChange({...value, bg})}
            className={cx(
              'size-7 cursor-pointer rounded-xs border transition-transform duration-[120ms] hover:scale-110',
              value.bg === bg ? 'border-lamp-300' : 'border-stage-600'
            )}
            style={{background: `#${bg}`}}
          />
        ))}
      </div>
    </Panel>
  )
}
