import type {Transition, Variants} from 'motion/react'
import {getPrefs, usePrefs} from '../state/prefs'

export const spring = {
  soft: {type: 'spring', stiffness: 260, damping: 26, mass: 0.9},
  firm: {type: 'spring', stiffness: 420, damping: 32, mass: 0.8},
  heavy: {type: 'spring', stiffness: 180, damping: 24, mass: 1.4}
} as const

export const duration = {feedback: 0.12, state: 0.25, set: 0.7}

/**
 * The effects control is the source of truth. The OS preference seeds it on a
 * first visit and is never consulted again, because a control the OS can veto
 * is a control that does nothing when you turn it on.
 */
export const reducedMotion = () => getPrefs().motion === 'reduced'

export const useReducedMotion = () => usePrefs().motion === 'reduced'

/**
 * One vocabulary, used everywhere. A duration or easing that appears in exactly
 * one component file is what makes a UI drift, so components pick a name here
 * rather than inventing a number.
 */
const FULL: Record<'enter' | 'pop' | 'settle', Variants> = {
  enter: {
    hidden: {opacity: 0, y: 12},
    shown: {opacity: 1, y: 0, transition: spring.soft}
  },
  pop: {
    hidden: {opacity: 0, scale: 0.94},
    shown: {opacity: 1, scale: 1, transition: spring.firm}
  },
  settle: {
    hidden: {opacity: 0, y: 20},
    shown: {opacity: 1, y: 0, transition: spring.heavy}
  }
}

const FLAT: Variants = {
  hidden: {opacity: 0},
  shown: {opacity: 1, transition: {duration: duration.feedback}}
}

/** 40ms between siblings; anything longer and a full roster crawls in. */
const staggerFor = (reduced: boolean): Variants => ({
  hidden: {},
  shown: {
    transition: reduced ? {} : {staggerChildren: 0.04, delayChildren: 0.02, when: 'beforeChildren'}
  }
})

export const useMotion = () => {
  const reduced = useReducedMotion()
  return {
    reduced,
    enter: reduced ? FLAT : FULL.enter,
    pop: reduced ? FLAT : FULL.pop,
    settle: reduced ? FLAT : FULL.settle,
    stagger: staggerFor(reduced),
    /** Springs become instant; anything physical becomes a fade. */
    transition: (reduced ? {duration: duration.feedback} : spring.soft) as Transition
  }
}
