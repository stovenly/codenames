import {motion} from 'motion/react'
import type {ComponentProps, ReactNode} from 'react'
import {spring, useReducedMotion} from './motion'

export const Panel = ({
  children,
  className = '',
  ...rest
}: {children: ReactNode; className?: string} & ComponentProps<'div'>) => (
  <div
    className={`relative rounded-lg border border-ink-600 bg-ink-800/80 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] ${className}`}
    {...rest}
  >
    {children}
  </div>
)

export const BrassRule = ({className = ''}: {className?: string}) => (
  <div
    className={`h-px w-full bg-gradient-to-r from-transparent via-brass-400/60 to-transparent ${className}`}
  />
)

type ButtonProps = {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'danger'
  className?: string
} & ComponentProps<typeof motion.button>

const VARIANTS = {
  primary:
    'bg-brass-400 text-ink-900 border-brass-200/40 hover:bg-brass-200 disabled:bg-ink-700 disabled:text-text-dim',
  ghost:
    'bg-ink-700/70 text-text border-ink-600 hover:border-brass-400/50 hover:bg-ink-700 disabled:text-text-dim',
  danger:
    'bg-void-rim/90 text-bone border-red-glow/40 hover:bg-void-rim disabled:bg-ink-700 disabled:text-text-dim'
}

/** Pressing feels like a lever, not a link: it sinks and the shadow collapses. */
export const Button = ({children, variant = 'primary', className = '', ...rest}: ButtonProps) => {
  const reduced = useReducedMotion()
  return (
    <motion.button
      type="button"
      whileHover={reduced || rest.disabled ? undefined : {y: -2}}
      whileTap={reduced || rest.disabled ? undefined : {y: 1, scale: 0.985}}
      transition={spring.firm}
      className={`type-display cursor-pointer rounded-md border px-5 py-3 text-sm shadow-[0_10px_24px_-14px_rgba(0,0,0,1)] transition-colors disabled:cursor-not-allowed disabled:shadow-none ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export const Pill = ({
  children,
  tone = 'neutral'
}: {
  children: ReactNode
  tone?: 'neutral' | 'brass' | 'red' | 'blue' | 'warn'
}) => {
  const tones = {
    neutral: 'border-ink-600 bg-ink-700/70 text-text-dim',
    brass: 'border-brass-400/50 bg-brass-400/10 text-brass-200',
    red: 'border-red-500/50 bg-red-500/10 text-red-glow',
    blue: 'border-blue-500/50 bg-blue-500/10 text-blue-glow',
    warn: 'border-brass-400/60 bg-brass-400/15 text-brass-200'
  }
  return (
    <span
      className={`type-mono inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

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
