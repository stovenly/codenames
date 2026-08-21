import {motion} from 'motion/react'
import type {ComponentProps, ReactNode} from 'react'
import {spring, useMotion} from './motion'

/** Trim marks, the way a printed form is cut. Dim enough to read as texture. */
const Marks = () => (
  <span aria-hidden className="pointer-events-none absolute inset-0 text-ink-600">
    {(
      [
        'top-1.5 left-1.5 border-t border-l',
        'top-1.5 right-1.5 border-t border-r',
        'bottom-1.5 left-1.5 border-b border-l',
        'bottom-1.5 right-1.5 border-b border-r'
      ] as const
    ).map(pos => (
      <span key={pos} className={`absolute size-2 border-current opacity-70 ${pos}`} />
    ))}
  </span>
)

export const Panel = ({
  children,
  className = '',
  level = 1,
  marks = false,
  tab,
  ...rest
}: {
  children: ReactNode
  className?: string
  /** 1 panel, 2 raised. Elevation, not decoration. */
  level?: 1 | 2
  marks?: boolean
  tab?: string
} & Omit<ComponentProps<'div'>, 'ref'>) => (
  <div
    className={`paper relative rounded-lg ${
      level === 1 ? 'surface-1 shadow-2' : 'surface-2 shadow-3'
    } ${tab ? 'rounded-tl-none' : ''} ${className}`}
    {...rest}
  >
    {tab && (
      <span className="type-label surface-1 absolute -top-[22px] left-0 rounded-t-md px-3 py-1 text-brass-200/80 shadow-2">
        {tab}
      </span>
    )}
    {marks && <Marks />}
    {children}
  </div>
)

export const Rule = ({className = '', brass = false}: {className?: string; brass?: boolean}) => (
  <span aria-hidden className={`${brass ? 'rule-brass' : 'rule'} block ${className}`} />
)

export const Label = ({children, className = ''}: {children: ReactNode; className?: string}) => (
  <span className={`type-label ${className}`}>{children}</span>
)

export const Heading = ({children, className = ''}: {children: ReactNode; className?: string}) => (
  <h2 className={`type-heading ${className}`}>{children}</h2>
)

type ButtonProps = {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'danger' | 'quiet'
  size?: 'sm' | 'md'
  className?: string
} & ComponentProps<typeof motion.button>

const VARIANTS = {
  primary:
    'border-brass-200/30 bg-brass-400 text-ink-900 hover:bg-brass-200 disabled:border-ink-600 disabled:bg-ink-700 disabled:text-text-dim',
  ghost:
    'surface-2 border-ink-600 text-text hover:border-brass-400/45 hover:text-brass-200 disabled:text-text-dim/50',
  danger:
    'border-red-glow/35 bg-void-rim/90 text-bone hover:bg-void-rim disabled:border-ink-600 disabled:bg-ink-700 disabled:text-text-dim',
  quiet:
    'border-transparent text-text-dim hover:text-brass-200 disabled:text-text-dim/40'
}

const SIZES = {sm: 'px-3 py-1.5 text-[11px]', md: 'px-5 py-2.5 text-xs'}

/** Pressing feels like a lever, not a link: it sinks and the shadow collapses. */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonProps) => {
  const {reduced} = useMotion()
  const still = reduced || rest.disabled
  return (
    <motion.button
      type="button"
      whileHover={still ? undefined : {y: -2}}
      whileTap={still ? undefined : {y: 1, scale: 0.985}}
      transition={spring.firm}
      className={`type-display cursor-pointer rounded-md border shadow-2 transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

/** Live status only. Anything that is not changing is a label, not a pill. */
export const Pill = ({
  children,
  tone = 'neutral'
}: {
  children: ReactNode
  tone?: 'neutral' | 'brass' | 'red' | 'blue' | 'warn'
}) => {
  const tones = {
    neutral: 'border-ink-600 text-text-dim',
    brass: 'border-brass-400/45 text-brass-200',
    red: 'border-red-500/45 text-red-glow',
    blue: 'border-blue-500/45 text-blue-glow',
    warn: 'border-brass-400/60 bg-brass-400/10 text-brass-200'
  }
  return (
    <span
      className={`type-label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export const Chip = ({
  active,
  disabled,
  title,
  onClick,
  children
}: {
  active?: boolean
  disabled?: boolean
  title?: string
  onClick: () => void
  children: ReactNode
}) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    aria-pressed={active}
    onClick={onClick}
    className={`type-mono rounded-sm border px-2.5 py-1.5 text-[11px] transition-colors duration-[120ms] ${
      active
        ? 'border-brass-400/70 bg-brass-400/12 text-brass-200'
        : 'border-ink-600 text-text-dim hover:border-brass-400/40 hover:text-text'
    } ${disabled ? 'cursor-not-allowed opacity-35 hover:border-ink-600' : 'cursor-pointer'}`}
  >
    {children}
  </button>
)

export const Field = ({
  label,
  children,
  hint
}: {
  label: string
  children: ReactNode
  hint?: ReactNode
}) => (
  <label className="flex flex-col gap-1.5">
    <Label>{label}</Label>
    {children}
    {hint}
  </label>
)

export const input =
  'w-full rounded-md border border-ink-600 bg-ink-900/80 px-3 py-2.5 text-sm text-text transition-colors placeholder:text-text-dim/45 hover:border-ink-600 focus:border-brass-400/50'

export const Glyph = ({team, className = ''}: {team: 'red' | 'blue'; className?: string}) =>
  team === 'red' ? (
    <svg viewBox="0 0 12 12" aria-hidden className={`size-3 ${className}`}>
      <path d="M6 0.5 11.5 6 6 11.5 0.5 6Z" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 12 12" aria-hidden className={`size-3 ${className}`}>
      <circle cx="6" cy="6" r="5.2" fill="currentColor" />
    </svg>
  )

export const Stack = ({
  children,
  className = ''
}: {
  children: ReactNode
  className?: string
}) => {
  const {stagger} = useMotion()
  return (
    <motion.div variants={stagger} initial="hidden" animate="shown" className={className}>
      {children}
    </motion.div>
  )
}

export const Item = ({
  children,
  className = '',
  variant = 'enter'
}: {
  children: ReactNode
  className?: string
  variant?: 'enter' | 'pop' | 'settle'
}) => {
  const m = useMotion()
  return (
    <motion.div variants={m[variant]} className={className}>
      {children}
    </motion.div>
  )
}
