import type {ComponentProps, ReactNode} from 'react'
import {motion} from 'motion/react'
import {spring, useMotion} from './motion'

/** All icons share one 24-unit grid and take their colour from the text. */
const Svg = ({children, ...rest}: {children: ReactNode} & ComponentProps<'svg'>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className="size-4"
    {...rest}
  >
    {children}
  </svg>
)

const CONE = 'M11 5 6.5 9H3v6h3.5L11 19z'

export const SoundOn = () => (
  <Svg>
    <path d={CONE} />
    <path d="M15.6 8.4a5 5 0 0 1 0 7.2" />
    <path d="M18.4 5.6a9 9 0 0 1 0 12.8" />
  </Svg>
)

export const SoundOff = () => (
  <Svg>
    <path d={CONE} />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </Svg>
)

export const Copy = () => (
  <Svg>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Svg>
)

export const Check = () => (
  <Svg>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
)

export const Close = () => (
  <Svg>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const Signal = () => (
  <Svg>
    <path d="M4 18v-3M9 18v-7M14 18V8M19 18V5" />
  </Svg>
)

export const Undo = () => (
  <Svg>
    <path d="M4 9h11a5 5 0 0 1 0 10h-6" />
    <path d="m8 5-4 4 4 4" />
  </Svg>
)

export const Redo = () => (
  <Svg>
    <path d="M20 9H9a5 5 0 0 0 0 10h6" />
    <path d="m16 5 4 4-4 4" />
  </Svg>
)

export const Mask = () => (
  <Svg>
    <path d="M3 8c3-1.5 15-1.5 18 0 0 5-2.5 8-4.5 8-1.6 0-2.4-1.4-4.5-1.4S9.1 16 7.5 16C5.5 16 3 13 3 8Z" />
    <path d="M8 11h1.5M14.5 11H16" />
  </Svg>
)

export const Drag = () => (
  <Svg>
    <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" strokeWidth="2.6" />
  </Svg>
)

export const IconButton = ({
  label,
  children,
  active = false,
  className = '',
  ...rest
}: {
  label: string
  children: ReactNode
  active?: boolean
  className?: string
} & ComponentProps<typeof motion.button>) => {
  const {reduced} = useMotion()
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileHover={reduced || rest.disabled ? undefined : {y: -1}}
      whileTap={reduced || rest.disabled ? undefined : {scale: 0.92}}
      transition={spring.firm}
      className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-brass-400/70 bg-brass-400/12 text-brass-200'
          : 'border-ink-600 text-text-dim hover:border-brass-400/45 hover:text-brass-200'
      } ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
