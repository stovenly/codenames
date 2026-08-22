import type {Transition, Variants} from 'motion/react'

export const spring = {
  soft: {type: 'spring', stiffness: 260, damping: 26, mass: 0.9},
  firm: {type: 'spring', stiffness: 420, damping: 32, mass: 0.8},
  heavy: {type: 'spring', stiffness: 180, damping: 24, mass: 1.4}
} as const

export const duration = {feedback: 0.12, state: 0.25, set: 0.7}

/**
 * One vocabulary, used everywhere. A duration or easing that appears in exactly
 * one component file is what makes a UI drift, so components pick a name here
 * rather than inventing a number.
 */
const VARIANTS: Record<'enter' | 'pop' | 'settle', Variants> = {
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

/** 40ms between siblings; anything longer and a full roster crawls in. */
const STAGGER: Variants = {
  hidden: {},
  shown: {transition: {staggerChildren: 0.04, delayChildren: 0.02, when: 'beforeChildren'}}
}

/**
 * Everyone gets the same show. There is no reduced setting and the OS one is
 * not consulted: four friends looking at the same game should be looking at the
 * same game.
 */
export const useMotion = () => ({
  enter: VARIANTS.enter,
  pop: VARIANTS.pop,
  settle: VARIANTS.settle,
  stagger: STAGGER,
  transition: spring.soft as Transition
})
