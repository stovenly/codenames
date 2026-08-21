import {useSyncExternalStore} from 'react'

export type Prefs = {
  motion: 'system' | 'full' | 'reduced'
  colourblind: boolean
  muted: boolean
  name: string
}

const KEY = 'cn.prefs'

const DEFAULTS: Prefs = {
  motion: 'system',
  colourblind: false,
  muted: false,
  name: ''
}

const read = (): Prefs => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? {...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>)} : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let current = read()
const listeners = new Set<() => void>()

const reflect = () => {
  const el = document.documentElement
  if (current.motion === 'system') el.removeAttribute('data-motion')
  else el.setAttribute('data-motion', current.motion)
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
