import {useSyncExternalStore} from 'react'

export type Prefs = {
  motion: 'full' | 'reduced'
  colourblind: boolean
  muted: boolean
  name: string
}

const KEY = 'cn.prefs'

const DEFAULTS: Prefs = {
  motion: 'full',
  colourblind: false,
  muted: false,
  name: ''
}

/**
 * The OS preference seeds the default and nothing more. Once a choice has been
 * stored it is the only input, because a control that the OS can veto is a
 * control that does nothing when you turn it on.
 */
const seedMotion = (): Prefs['motion'] =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'reduced'
    : 'full'

const read = (): Prefs => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {...DEFAULTS, motion: seedMotion()}
    const saved = JSON.parse(raw) as Partial<Prefs> & {motion?: string}
    const motion =
      saved.motion === 'reduced' || saved.motion === 'full' ? saved.motion : seedMotion()
    return {...DEFAULTS, ...saved, motion}
  } catch {
    return DEFAULTS
  }
}

let current = read()
const listeners = new Set<() => void>()

const reflect = () => {
  const el = document.documentElement
  el.setAttribute('data-motion', current.motion)
  if (current.colourblind) el.setAttribute('data-cb', 'on')
  else el.removeAttribute('data-cb')
}

export const setPrefs = (patch: Partial<Prefs>) => {
  current = {...current, ...patch}
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* private mode; prefs are best-effort */
  }
  reflect()
  listeners.forEach(l => l())
}

export const getPrefs = () => current

export const usePrefs = () =>
  useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => DEFAULTS
  )

reflect()
