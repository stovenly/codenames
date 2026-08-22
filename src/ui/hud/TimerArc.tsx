import {motion} from 'motion/react'
import {useEffect, useRef, useState} from 'react'
import {hostNow} from '../../state/room'
import {sfx} from '../sound/audio'

const R = 22
const C = 2 * Math.PI * R

/** Clients display; only the host expires a timer. A countdown that hits zero waits. */
export const TimerArc = ({deadline, total}: {deadline: number; total: number}) => {
  const [left, setLeft] = useState(() => Math.max(0, deadline - hostNow()))
  const lastTick = useRef(-1)
  
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, deadline - hostNow())), 100)
    return () => clearInterval(id)
  }, [deadline])

  const seconds = Math.ceil(left / 1000)
  const urgent = left <= 10_000

  useEffect(() => {
    if (seconds === lastTick.current || seconds > 10 || seconds < 0) return
    lastTick.current = seconds
    if (seconds > 0) sfx.timerTick(seconds <= 3)
  }, [seconds])

  const fraction = total > 0 ? Math.max(0, Math.min(1, left / (total * 1000))) : 0

  return (
    <motion.span
      animate={urgent && seconds > 0 ? {scale: [1, 1.07, 1]} : {scale: 1}}
      transition={{duration: 0.5, repeat: urgent && seconds > 0 ? Infinity : 0, repeatDelay: 0.5}}
      className="relative grid size-16 shrink-0 place-items-center"
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90">
        <circle cx="26" cy="26" r={R} fill="none" stroke="var(--color-stage-600)" strokeWidth="3" />
        <circle
          cx="26"
          cy="26"
          r={R}
          fill="none"
          stroke={urgent ? 'var(--color-red-lit)' : 'var(--color-lamp-500)'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fraction)}
          style={{transition: 'stroke-dashoffset 120ms linear, stroke 300ms'}}
        />
      </svg>
      <span
        className={`type-read text-sm tabular-nums ${urgent ? 'text-red-lit' : 'text-text-dim'}`}
      >
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </span>
    </motion.span>
  )
}
