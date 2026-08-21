import {motion} from 'motion/react'
import {useEffect, useRef, useState} from 'react'
import type {Avatar as AvatarSpec} from '../../game/types'
import {Button, Label, Panel} from '../atoms'
import {spring, useReducedMotion} from '../motion'
import {AvatarView} from './Avatar'
import {BACKGROUNDS, STYLES} from './styles'

const randomSeed = () => Math.random().toString(36).slice(2, 10)

export const AvatarPicker = ({
  value,
  onChange
}: {
  value: AvatarSpec
  onChange: (next: AvatarSpec) => void
}) => {
  const [spinning, setSpinning] = useState(false)
  const [preview, setPreview] = useState(value)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const reduced = useReducedMotion()

  useEffect(() => {
    setPreview(value)
  }, [value])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  /** The reroll is the fun part, so it lands rather than snapping. */
  const reroll = () => {
    const landing = {...value, seed: randomSeed()}
    if (reduced) {
      onChange(landing)
      return
    }
    setSpinning(true)
    timers.current.forEach(clearTimeout)
    timers.current = []

    const gaps = [0, 90, 200, 340, 500]
    gaps.forEach((gap, i) => {
      timers.current.push(
        setTimeout(() => {
          if (i === gaps.length - 1) {
            setSpinning(false)
            onChange(landing)
          } else {
            setPreview({...value, seed: randomSeed()})
          }
        }, gap)
      )
    })
  }

  return (
    <Panel className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <motion.div
          animate={spinning && !reduced ? {rotate: [0, -4, 4, 0], scale: [1, 1.06, 1]} : {}}
          transition={{duration: 0.18, repeat: spinning ? Infinity : 0}}
          className="rounded-md bg-stage-000 p-1.5 ring-1 ring-gold-500/35"
        >
          <AvatarView spec={spinning ? preview : value} size={72} />
        </motion.div>
        <div className="flex flex-1 flex-col gap-2">
          <Button variant="ghost" onClick={reroll} className="w-full">
            Reroll
          </Button>
          <div className="flex flex-wrap gap-1.5">
            {BACKGROUNDS.map(bg => (
              <button
                key={bg}
                type="button"
                aria-label={`Background ${bg}`}
                onClick={() => onChange({...value, bg})}
                className={`size-6 cursor-pointer rounded-xs border transition-transform duration-[120ms] hover:scale-110 ${
                  value.bg === bg ? 'border-gold-200' : 'border-stage-600'
                }`}
                style={{background: `#${bg}`}}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {STYLES.map(style => (
          <motion.button
            key={style.id}
            type="button"
            title={style.note}
            whileTap={reduced ? undefined : {scale: 0.94}}
            transition={spring.firm}
            onClick={() => onChange({...value, style: style.id})}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-sm border p-1.5 transition-colors duration-[120ms] ${
              value.style === style.id
                ? 'border-gold-500/70 bg-lamp-500/10'
                : 'border-stage-600 hover:border-gold-500/40'
            }`}
          >
            <AvatarView spec={{...value, style: style.id}} size={34} />
            <Label>{style.name}</Label>
          </motion.button>
        ))}
      </div>
    </Panel>
  )
}
