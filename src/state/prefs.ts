import {useSyncExternalStore} from 'react'
import type {Avatar} from '../game/types'

export type Prefs = {
  colourblind: boolean
  muted: boolean
  /** Carried between rooms and between visits, so you are not rebuilt each time. */
  name: string
  avatar: Avatar | null
}

const KEY = 'cn.prefs'

const DEFAULTS: Prefs = {
  colourblind: false,
  muted: false,
  name: '',
  avatar: null
}

const read = (): Prefs => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return {...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>)}
  } catch {
    return DEFAULTS
  }
}

let current = read()
const listeners = new Set<() => void>()

const reflect = () => {
  const el = document.documentElement
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
