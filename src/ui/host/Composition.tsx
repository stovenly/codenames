import {AnimatePresence, motion} from 'motion/react'
import {composition, type Settings} from '../../game/settings'
import {spring, useReducedMotion} from '../motion'

const Agent = ({className = ''}: {className?: string}) => (
  <svg viewBox="0 0 12 12" aria-hidden className={`size-3 ${className}`}>
    <circle cx="6" cy="3.4" r="2.3" fill="currentColor" />
    <path d="M1.4 11.4c0-2.6 2.1-4.3 4.6-4.3s4.6 1.7 4.6 4.3Z" fill="currentColor" />
  </svg>
)

const Skull = ({className = ''}: {className?: string}) => (
  <svg viewBox="0 0 12 12" aria-hidden className={`size-3 ${className}`}>
    <path d="M6 0.8c-2.7 0-4.6 1.9-4.6 4.4 0 1.5.7 2.5 1.6 3.1v1.6c0 .7.6 1.3 1.3 1.3h3.4c.7 0 1.3-.6 1.3-1.3V8.3c.9-.6 1.6-1.6 1.6-3.1 0-2.5-1.9-4.4-4.6-4.4Z" fill="currentColor" />
    <circle cx="4.2" cy="5.2" r="1.1" fill="#05060A" />
    <circle cx="7.8" cy="5.2" r="1.1" fill="#05060A" />
  </svg>
)

const Blank = ({className = ''}: {className?: string}) => (
  <svg viewBox="0 0 12 12" aria-hidden className={`size-3 ${className}`}>
    <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

const Rolling = ({value}: {value: number}) => {
  const reduced = useReducedMotion()
  if (reduced) return <span className="type-mono tabular-nums">{value}</span>
  return (
    <span className="type-mono relative inline-block h-4 w-[2ch] overflow-hidden text-right tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{y: 14, opacity: 0}}
          animate={{y: 0, opacity: 1}}
          exit={{y: -14, opacity: 0}}
          transition={spring.firm}
          className="absolute inset-x-0"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

const Item = ({
  icon,
  value,
  label,
  tone,
  invalid
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone: string
  invalid?: boolean
}) => {
  const reduced = useReducedMotion()
  return (
    <motion.span
      animate={invalid && !reduced ? {x: [0, -5, 5, -3, 3, 0]} : {x: 0}}
      transition={{duration: 0.35}}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
        invalid ? 'border-void-rim bg-void-rim/15 text-red-glow' : tone
      }`}
    >
      {icon}
      <Rolling value={value} />
      <span className="text-text-dim">{label}</span>
    </motion.span>
  )
}

export const CompositionRow = ({settings}: {settings: Pick<Settings, 'size' | 'teamCards' | 'assassins'>}) => {
  const c = composition(settings)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Item
        icon={<Agent className="text-red-glow" />}
        value={c.perTeam}
        label="red"
        tone="border-red-500/40 bg-red-500/10 text-red-glow"
      />
      <Item
        icon={<Agent className="text-blue-glow" />}
        value={c.perTeam}
        label="blue"
        tone="border-blue-500/40 bg-blue-500/10 text-blue-glow"
      />
      <Item
        icon={<Skull className="text-bone" />}
        value={c.assassins}
        label={c.assassins === 1 ? 'assassin' : 'assassins'}
        tone="border-ink-600 bg-void text-bone"
        invalid={c.assassins < 1}
      />
      <Item
        icon={<Blank className="text-text-dim" />}
        value={Math.max(0, c.neutral)}
        label="bystanders"
        tone="border-ink-600 bg-ink-700/60 text-text"
        invalid={c.neutral < 0}
      />
    </div>
  )
}
