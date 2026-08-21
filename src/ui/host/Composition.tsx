import NumberFlow from '@number-flow/react'
import {motion} from 'motion/react'
import type {ReactNode} from 'react'
import {composition, type Settings} from '../../game/settings'
import {cx} from '../cx'
import {useMotion} from '../motion'
import {Agent, Blank, Skull} from '../board/symbols'

const Item = ({
  icon,
  value,
  label,
  tone,
  invalid
}: {
  icon: ReactNode
  value: number
  label: string
  tone: string
  invalid?: boolean
}) => {
  const {reduced} = useMotion()
  return (
    <motion.span
      animate={invalid && !reduced ? {x: [0, -5, 5, -3, 3, 0]} : {x: 0}}
      transition={{duration: 0.35}}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm',
        invalid ? 'border-kill-lit bg-kill-lit/12 text-kill-lit' : tone
      )}
    >
      {icon}
      <NumberFlow value={value} className="type-read" />
      <span className="type-label">{label}</span>
    </motion.span>
  )
}

export const CompositionRow = ({
  settings
}: {
  settings: Pick<Settings, 'size' | 'teamCards' | 'assassins'>
}) => {
  const c = composition(settings)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Item
        icon={<Agent className="size-3.5 text-red-lit" />}
        value={c.perTeam}
        label="red"
        tone="border-red-500/40 bg-red-500/10 text-red-lit"
      />
      <Item
        icon={<Agent className="size-3.5 text-blue-lit" />}
        value={c.perTeam}
        label="blue"
        tone="border-blue-500/40 bg-blue-500/10 text-blue-lit"
      />
      <Item
        icon={<Skull className="size-3.5 text-kill-lit" />}
        value={c.assassins}
        label={c.assassins === 1 ? 'assassin' : 'assassins'}
        tone="border-stage-600 bg-kill text-bone"
        invalid={c.assassins < 1}
      />
      <Item
        icon={<Blank className="size-3.5 text-text-dim" />}
        value={Math.max(0, c.neutral)}
        label="bystanders"
        tone="border-stage-600 bg-stage-800 text-text"
        invalid={c.neutral < 0}
      />
    </div>
  )
}
