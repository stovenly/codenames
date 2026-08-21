import {useSyncExternalStore} from 'react'
import {DEFAULT_PACKS, resolvePacks, type PackId} from '../data/wordlists'
import {hashWords} from '../game/wordlist'

export type Source = {kind: 'packs'; packs: PackId[]} | {kind: 'custom'; name: string}

export type CustomList = {name: string; words: string[]}

const CUSTOM_KEY = 'cn.customLists'

const listeners = new Set<() => void>()
const byHash = new Map<string, string[]>()
let revision = 0

const publish = () => {
  revision++
  listeners.forEach(l => l())
}

export const have = (hash: string) => byHash.has(hash)

export const get = (hash: string): string[] => byHash.get(hash) ?? []

export const put = (hash: string, words: string[]) => {
  if (!words.length || byHash.get(hash)?.length === words.length) return
  byHash.set(hash, words)
  publish()
}

export const remember = (words: string[]) => {
  const hash = hashWords(words)
  byHash.set(hash, words)
  publish()
  return hash
}

export const readCustom = (): CustomList[] => {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]') as CustomList[]
  } catch {
    return []
  }
}

export const writeCustom = (lists: CustomList[]) => {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(lists))
  } catch {
    /* private mode; the list lives for this session only */
  }
  publish()
}

export const saveCustom = (name: string, words: string[]) => {
  const lists = readCustom().filter(l => l.name !== name)
  writeCustom([...lists, {name, words}])
  return remember(words)
}

export const deleteCustom = (name: string) => writeCustom(readCustom().filter(l => l.name !== name))

/** Host-side: turn a source into the words themselves, caching under their hash. */
export const resolve = async (source: Source): Promise<{hash: string; words: string[]}> => {
  const words =
    source.kind === 'custom'
      ? (readCustom().find(l => l.name === source.name)?.words ?? [])
      : await resolvePacks(source.packs.length ? source.packs : DEFAULT_PACKS)
  return {hash: remember(words), words}
}

export const useWords = () =>
  useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => revision,
    () => revision
  )

const SOURCE_KEY = 'cn.wordSource'

/** Host-local: which packs or custom list produced the current hash, so the picker reopens where it was. */
export const rememberSource = (source: Source, label: string) => {
  try {
    localStorage.setItem(SOURCE_KEY, JSON.stringify({source, label}))
  } catch {
    /* private mode; the picker just starts from the default */
  }
}

export const lastSource = (): {source: Source; label: string} | null => {
  try {
    const raw = localStorage.getItem(SOURCE_KEY)
    return raw ? (JSON.parse(raw) as {source: Source; label: string}) : null
  } catch {
    return null
  }
}
