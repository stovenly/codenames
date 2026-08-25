import type {Colour} from '../../game/board'
import {cx} from '../cx'

/** One symbol set, used on the reels, the composition row and the revealed plate. */
/**
 * One silhouette: a pinched fedora over a jaw, and a coat with the collar
 * turned up. It was a circle with a rule through it, which is a person wearing
 * a line — the brim has to overhang the head and the crown has to have a dent
 * in it before any of it says hat, let alone spy.
 *
 * Drawn as solid shapes with the gaps left open, so it reads at 14px on a
 * roster row and at a third of a card on the wheel.
 */
const AgentShapes = () => (
  <>
    {/* Coat, with the lapels meeting under the chin. */}
    <path d="M2.4 22.6c0-3.9 2.6-6.6 6.3-7.5l3.3 3.6 3.3-3.6c3.7.9 6.3 3.6 6.3 7.5Z" />
    {/* Jaw, under the brim. */}
    <path d="M8.5 10.2h7v2.6a3.5 3.5 0 0 1-7 0Z" />
    {/* Crown, dented along the top the way a felt hat sits. */}
    <path d="M7.2 9.9c-.5-3.9 1-6.1 2.5-6.6.9-.3 1.4.6 2.3.6s1.4-.9 2.3-.6c1.5.5 3 2.7 2.5 6.6Z" />
    {/* Brim, wide enough to put the eyes in shadow. */}
    <ellipse cx="12" cy="10" rx="9.5" ry="2.05" />
  </>
)

export const Agent = ({className}: {className?: string}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx('size-6', className)} fill="currentColor">
    <AgentShapes />
  </svg>
)

/**
 * The same figure with the hat taken off: somebody watching rather than playing.
 * One difference from `Agent`, because one difference is what it reports.
 */
export const Onlooker = ({className}: {className?: string}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx('size-6', className)} fill="currentColor">
    <circle cx="12" cy="8.2" r="4.6" />
    {/* Shoulders, as wide as the agent's coat so the two sit at the same weight. */}
    <path d="M2.4 22.6c0-4.4 4.3-7.4 9.6-7.4s9.6 3 9.6 7.4Z" />
  </svg>
)

export const Skull = ({className}: {className?: string}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx('size-6', className)} fill="currentColor">
    <path d="M12 1.4C6.4 1.4 2.4 5.4 2.4 10.7c0 3 1.3 5.4 3.4 6.9l.5 3c.15.85.9 1.5 1.8 1.5h7.8c.9 0 1.65-.65 1.8-1.5l.5-3c2.1-1.5 3.4-3.9 3.4-6.9 0-5.3-4-9.3-9.6-9.3Z" />
    <ellipse cx="8" cy="10.6" rx="3.1" ry="3.4" fill="#05060B" />
    <ellipse cx="16" cy="10.6" rx="3.1" ry="3.4" fill="#05060B" />
    <path d="M12 13.1l1.7 3.1h-3.4Z" fill="#05060B" />
    <path
      d="M9 18.1v3.9M12 18.1v3.9M15 18.1v3.9"
      stroke="#05060B"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

export const Blank = ({className}: {className?: string}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx('size-6', className)}>
    <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2.6" />
  </svg>
)

/**
 * The same agent wearing both colours: a card whose side nobody knows until the
 * coin is flipped. Clipped down the middle rather than drawn twice, so the two
 * halves meet on one silhouette.
 */
export const Contested = ({className}: {className?: string}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx('size-6', className)}>
    <defs>
      <clipPath id="contested-left">
        <rect x="0" y="0" width="12" height="24" />
      </clipPath>
      <clipPath id="contested-right">
        <rect x="12" y="0" width="12" height="24" />
      </clipPath>
    </defs>
    <g clipPath="url(#contested-left)" fill="var(--color-red-lit)">
      <AgentShapes />
    </g>
    <g clipPath="url(#contested-right)" fill="var(--color-blue-lit)">
      <AgentShapes />
    </g>
  </svg>
)

export const SYMBOL_TINT: Record<Colour, string> = {
  red: 'text-red-lit',
  blue: 'text-blue-lit',
  neutral: 'text-bone',
  assassin: 'text-kill-lit'
}

export const Symbol = ({colour, className}: {colour: Colour; className?: string}) => {
  const tint = SYMBOL_TINT[colour]
  if (colour === 'assassin') return <Skull className={cx(tint, className)} />
  if (colour === 'neutral') return <Blank className={cx(tint, className)} />
  return <Agent className={cx(tint, className)} />
}

export const SURFACE: Record<Colour, string> = {
  red: 'linear-gradient(168deg, var(--card-red-hi) 0%, var(--card-red-lo) 100%)',
  blue: 'linear-gradient(168deg, #2E86FF 0%, #14477F 100%)',
  neutral: 'linear-gradient(168deg, #F1ECE0 0%, #C3B9A3 100%)',
  assassin: 'linear-gradient(168deg, #1A1A20 0%, #06060A 100%)'
}

export const INK: Record<Colour, string> = {
  red: 'var(--card-red-ink)',
  blue: '#061C36',
  neutral: '#241F13',
  assassin: 'var(--color-kill-lit)'
}

/** Short, because this is set in the biggest type a card can carry. */
export const STAMP: Record<Colour, string> = {
  red: 'RED',
  blue: 'BLUE',
  neutral: 'NEUTRAL',
  assassin: 'ASSASSIN'
}
