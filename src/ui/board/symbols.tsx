import type {Colour} from '../../game/board'
import {cx} from '../cx'

/** One symbol set, used on the reels, the composition row and the revealed plate. */
export const Agent = ({className}: {className?: string}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx('size-6', className)}>
    <circle cx="12" cy="7.2" r="4.4" fill="currentColor" />
    <path d="M2.6 22.6c0-5 4.2-8.4 9.4-8.4s9.4 3.4 9.4 8.4Z" fill="currentColor" />
    <path d="M4.4 8.6h15.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const Skull = ({className}: {className?: string}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx('size-6', className)}>
    <path
      d="M12 1.6C6.6 1.6 2.8 5.4 2.8 10.4c0 3 1.4 5 3.2 6.2v2.9c0 1.4 1.2 2.6 2.6 2.6h6.8c1.4 0 2.6-1.2 2.6-2.6v-2.9c1.8-1.2 3.2-3.2 3.2-6.2 0-5-3.8-8.8-9.2-8.8Z"
      fill="currentColor"
    />
    <circle cx="8.4" cy="10.4" r="2.4" fill="#05060B" />
    <circle cx="15.6" cy="10.4" r="2.4" fill="#05060B" />
    <path d="M10.6 16.4h2.8" stroke="#05060B" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const Blank = ({className}: {className?: string}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx('size-6', className)}>
    <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2.6" />
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
  red: 'linear-gradient(168deg, #F04438 0%, #A32419 100%)',
  blue: 'linear-gradient(168deg, #2E86FF 0%, #14477F 100%)',
  neutral: 'linear-gradient(168deg, #F1ECE0 0%, #C3B9A3 100%)',
  assassin: 'linear-gradient(168deg, #1A1A20 0%, #06060A 100%)'
}

export const INK: Record<Colour, string> = {
  red: '#2B0A06',
  blue: '#061C36',
  neutral: '#241F13',
  assassin: '#FF2D2D'
}

export const STAMP: Record<Colour, string> = {
  red: 'RED AGENT',
  blue: 'BLUE AGENT',
  neutral: 'BYSTANDER',
  assassin: 'ASSASSIN'
}
