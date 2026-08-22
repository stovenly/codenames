import manifest from './manifest.json'

export type PackId = 'original' | 'disney' | 'potter' | 'valorant' | 'countries'

export type Pack = {id: PackId; name: string; count: number; note: string}

export const PACKS: Pack[] = manifest as Pack[]

export const DEFAULT_PACKS: PackId[] = ['original']

const LOADERS: Record<PackId, () => Promise<{default: string[]}>> = {
  original: () => import('./original.json'),
  disney: () => import('./disney.json'),
  potter: () => import('./potter.json'),
  valorant: () => import('./valorant.json'),
  countries: () => import('./countries.json')
}

/** A saved selection can name a pack that no longer ships. */
export const knownPack = (id: string): id is PackId => id in LOADERS

const cache = new Map<PackId, string[]>()

export const loadPack = async (id: PackId): Promise<string[]> => {
  const hit = cache.get(id)
  if (hit) return hit
  const words = (await LOADERS[id]()).default
  cache.set(id, words)
  return words
}

/** Selected packs are unioned, then deduped and sorted exactly as a single pack is. */
export const resolvePacks = async (ids: PackId[]): Promise<string[]> => {
  const live = ids.filter(knownPack)
  const seen = new Set<string>()
  for (const id of (live.length ? live : DEFAULT_PACKS)) {
    for (const word of await loadPack(id)) seen.add(word)
  }
  return [...seen].sort()
}
