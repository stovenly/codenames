import manifest from './manifest.json'

export type PackId =
  | 'original'
  | 'duet'
  | 'everything'
  | 'undercover'
  | 'disney'
  | 'potter'
  | 'simpsons'
  | 'mtg'

export type Pack = {id: PackId; name: string; count: number; note: string; adult: boolean}

export const PACKS: Pack[] = (manifest as Omit<Pack, 'adult'>[]).map(p => ({
  ...p,
  adult: p.id === 'undercover'
}))

export const DEFAULT_PACKS: PackId[] = ['original']

const LOADERS: Record<PackId, () => Promise<{default: string[]}>> = {
  original: () => import('./original.json'),
  duet: () => import('./duet.json'),
  everything: () => import('./everything.json'),
  undercover: () => import('./undercover.json'),
  disney: () => import('./disney.json'),
  potter: () => import('./potter.json'),
  simpsons: () => import('./simpsons.json'),
  mtg: () => import('./mtg.json')
}

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
  const seen = new Set<string>()
  for (const id of ids) for (const word of await loadPack(id)) seen.add(word)
  return [...seen].sort()
}
