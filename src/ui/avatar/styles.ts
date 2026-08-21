import type {Style} from '@dicebear/core'
import * as shapes from '@dicebear/shapes'

export type StyleId = 'shapes' | 'glass' | 'pixel-art' | 'thumbs' | 'lorelei' | 'open-peeps' | 'notionists'

type Entry = {
  id: StyleId
  name: string
  note: string
  load: () => Promise<Style<never>>
}

/**
 * Every style here is CC0 1.0, which keeps the licence story to one line. Bottts
 * and the CC-BY styles are deliberately excluded on that basis, not on quality.
 * Shapes is bundled eagerly as the fallback; the rest arrive on first use.
 */
export const STYLES: Entry[] = [
  {
    id: 'shapes',
    name: 'Shapes',
    note: 'Abstract, highest contrast',
    load: async () => shapes as unknown as Style<never>
  },
  {
    id: 'glass',
    name: 'Glass',
    note: 'Soft gradients',
    load: async () => (await import('@dicebear/glass')) as unknown as Style<never>
  },
  {
    id: 'pixel-art',
    name: 'Pixel',
    note: 'Retro, reads well small',
    load: async () => (await import('@dicebear/pixel-art')) as unknown as Style<never>
  },
  {
    id: 'thumbs',
    name: 'Thumbs',
    note: 'Simple figures',
    load: async () => (await import('@dicebear/thumbs')) as unknown as Style<never>
  },
  {
    id: 'lorelei',
    name: 'Lorelei',
    note: 'Illustrated portraits',
    load: async () => (await import('@dicebear/lorelei')) as unknown as Style<never>
  },
  {
    id: 'open-peeps',
    name: 'Peeps',
    note: 'Hand-drawn people',
    load: async () => (await import('@dicebear/open-peeps')) as unknown as Style<never>
  },
  {
    id: 'notionists',
    name: 'Notionists',
    note: 'Line-drawn characters',
    load: async () => (await import('@dicebear/notionists')) as unknown as Style<never>
  }
]

/** Deliberately excludes the two team colours, so an avatar never contradicts a team column. */
export const BACKGROUNDS = ['161D30', '232C44', 'D9A441', 'F0D18A', 'E8E3D6', '05060A']

const loaded = new Map<StyleId, Style<never>>()
const pending = new Map<StyleId, Promise<Style<never>>>()

loaded.set('shapes', shapes as unknown as Style<never>)

export const styleFor = (id: string): Style<never> | null =>
  loaded.get(id as StyleId) ?? null

/** Deferred to idle so seven picker previews never contend with the mesh chunk. */
const whenIdle = (fn: () => void) =>
  'requestIdleCallback' in window
    ? requestIdleCallback(fn, {timeout: 1500})
    : setTimeout(fn, 60)

export const ensureStyle = (id: string, onReady: () => void) => {
  const key = id as StyleId
  if (loaded.has(key) || pending.has(key)) return
  const entry = STYLES.find(s => s.id === key)
  if (!entry) return
  const job = new Promise<Style<never>>(resolve => whenIdle(() => resolve(entry.load()))).then(mod => {
    loaded.set(key, mod)
    pending.delete(key)
    onReady()
    return mod
  })
  pending.set(key, job)
}
