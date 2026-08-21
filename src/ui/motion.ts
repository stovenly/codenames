import {useEffect, useState} from 'react'
import {getPrefs, usePrefs} from '../state/prefs'

export const spring = {
  soft: {type: 'spring', stiffness: 260, damping: 26, mass: 0.9},
  firm: {type: 'spring', stiffness: 420, damping: 32, mass: 0.8},
  heavy: {type: 'spring', stiffness: 180, damping: 24, mass: 1.4}
} as const

export const duration = {feedback: 0.12, state: 0.25, set: 0.7}

const systemReduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const reducedMotion = () => {
  const {motion} = getPrefs()
  return motion === 'reduced' || (motion === 'system' && systemReduced())
}

export const useReducedMotion = () => {
  const {motion} = usePrefs()
  const [system, setSystem] = useState(systemReduced)

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setSystem(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  return motion === 'reduced' || (motion === 'system' && system)
}

/** Springs become instant, set pieces collapse to a fade. */
export const useTransition = () => {
  const reduced = useReducedMotion()
  return reduced ? {duration: duration.feedback} : spring.soft
}
