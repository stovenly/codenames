import {cva, type VariantProps} from 'class-variance-authority'
import {motion} from 'motion/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import type {ComponentProps, ReactNode} from 'react'
import {cx} from './cx'
import {spring, useMotion} from './motion'

/* ------------------------------------------------------------------ stage */

export const Stage = () => (
  <>
    <div aria-hidden className="stage" />
    <div aria-hidden className="haze" />
  </>
)

export const Bulbs = ({
  lit = false,
  chase = false,
  className = ''
}: {
  lit?: boolean
  chase?: boolean
  className?: string
}) => {
  const {reduced} = useMotion()
  return (
    <span
      aria-hidden
      className={cx('bulbs block w-full', lit && 'bulbs-lit', chase && !reduced && 'bulbs-chase', className)}
    />
  )
}

/* --------------------------------------------------------------- surfaces */

const panel = cva('plate relative rounded-lg', {
  variants: {
    level: {1: 'shadow-2', 2: 'shadow-3'},
    glossy: {true: 'gloss', false: ''}
  },
  defaultVariants: {level: 1, glossy: false}
})

export const Panel = ({
  children,
  className,
  level,
  glossy,
  ...rest
}: {children: ReactNode; className?: string} & VariantProps<typeof panel> &
  Omit<ComponentProps<'div'>, 'ref'>) => (
  <div className={cx(panel({level, glossy}), className)} {...rest}>
    {children}
  </div>
)

export const Rule = ({className = '', lit = false}: {className?: string; lit?: boolean}) => (
  <span
    aria-hidden
    className={cx(
      'block h-px w-full',
      lit
        ? 'bg-gradient-to-r from-transparent via-gold-500/60 to-transparent'
        : 'bg-gradient-to-r from-transparent via-stage-600/80 to-transparent',
      className
    )}
  />
)

export const Label = ({children, className}: {children: ReactNode; className?: string}) => (
  <span className={cx('type-label', className)}>{children}</span>
)

export const Heading = ({children, className}: {children: ReactNode; className?: string}) => (
  <h2 className={cx('type-marquee text-[11px] tracking-[0.14em] text-gold-200', className)}>
    {children}
  </h2>
)

/* ---------------------------------------------------------------- buttons */

const button = cva(
  'type-marquee relative cursor-pointer rounded-md border transition-colors duration-[120ms] disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'border-lamp-300/40 bg-gradient-to-b from-lamp-300 to-lamp-500 text-stage-000 shadow-[0_8px_20px_-10px_rgba(255,197,61,.75)] hover:from-lamp-300 hover:to-lamp-300 disabled:border-stage-600 disabled:from-stage-700 disabled:to-stage-800 disabled:text-text-dim disabled:shadow-none',
        ghost:
          'border-stage-600 bg-stage-800/80 text-text hover:border-gold-500/60 hover:text-gold-200 disabled:text-text-dim/50',
        danger:
          'border-kill-lit/45 bg-gradient-to-b from-[#9C1B15] to-[#5E0F0B] text-bone hover:from-[#B92018] disabled:border-stage-600 disabled:from-stage-700 disabled:to-stage-800 disabled:text-text-dim',
        quiet: 'border-transparent text-text-dim hover:text-gold-200 disabled:text-text-dim/40'
      },
      size: {
        sm: 'px-3 py-1.5 text-[10px]',
        md: 'px-5 py-2.5 text-[11px]',
        lg: 'px-7 py-3.5 text-sm'
      }
    },
    defaultVariants: {variant: 'primary', size: 'md'}
  }
)

export const Button = ({
  children,
  className,
  variant,
  size,
  ...rest
}: {children: ReactNode; className?: string} & VariantProps<typeof button> &
  ComponentProps<typeof motion.button>) => {
  const {reduced} = useMotion()
  const still = reduced || rest.disabled
  return (
    <motion.button
      type="button"
      whileHover={still ? undefined : {y: -2}}
      whileTap={still ? undefined : {y: 1, scale: 0.98}}
      transition={spring.firm}
      className={cx(button({variant, size}), className)}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

const chip = cva(
  'type-read cursor-pointer rounded-sm border px-2.5 py-1.5 text-[11px] transition-colors duration-[120ms]',
  {
    variants: {
      active: {
        true: 'border-lamp-500/70 bg-lamp-500/12 text-lamp-300',
        false: 'border-stage-600 text-text-dim hover:border-gold-500/50 hover:text-text'
      },
      off: {true: 'cursor-not-allowed opacity-35 hover:border-stage-600', false: ''}
    },
    defaultVariants: {active: false, off: false}
  }
)

export const Chip = ({
  active,
  disabled,
  title,
  onClick,
  children,
  className
}: {
  active?: boolean
  disabled?: boolean
  title?: string
  onClick: () => void
  children: ReactNode
  className?: string
}) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    aria-pressed={active}
    onClick={onClick}
    className={cx(chip({active: !!active, off: !!disabled}), className)}
  >
    {children}
  </button>
)

/** Icon-only controls need a name on hover and on focus, not just a title attribute. */
export const IconButton = ({
  label,
  children,
  active = false,
  className,
  ...rest
}: {
  label: string
  children: ReactNode
  active?: boolean
  className?: string
} & ComponentProps<typeof motion.button>) => {
  const {reduced} = useMotion()
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <motion.button
          type="button"
          aria-label={label}
          whileHover={reduced || rest.disabled ? undefined : {y: -1}}
          whileTap={reduced || rest.disabled ? undefined : {scale: 0.92}}
          transition={spring.firm}
          className={cx(
            'grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-40',
            active
              ? 'border-lamp-500/70 bg-lamp-500/12 text-lamp-300'
              : 'border-stage-600 bg-stage-800/80 text-text-dim hover:border-gold-500/60 hover:text-gold-200',
            className
          )}
          {...rest}
        >
          {children}
        </motion.button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="type-label z-50 rounded-sm border border-stage-600 bg-stage-900 px-2 py-1 text-text shadow-3"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/* ------------------------------------------------------------------ forms */

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
  'type-read w-full rounded-md border border-stage-600 bg-stage-000/70 px-3 py-2.5 text-sm text-text transition-colors placeholder:text-text-dim/45 focus:border-lamp-500/60'

/* ----------------------------------------------------------------- glyphs */

export const Glyph = ({team, className}: {team: 'red' | 'blue'; className?: string}) =>
  team === 'red' ? (
    <svg viewBox="0 0 12 12" aria-hidden className={cx('size-3', className)}>
      <path d="M6 0.5 11.5 6 6 11.5 0.5 6Z" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 12 12" aria-hidden className={cx('size-3', className)}>
      <circle cx="6" cy="6" r="5.2" fill="currentColor" />
    </svg>
  )

/* ------------------------------------------------------------- entrances */

export const Enter = ({
  children,
  className
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
  className,
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
