import type {Style} from '@dicebear/core'

export type StyleId = 'lorelei' | 'open-peeps' | 'notionists' | 'thumbs' | 'pixel-art'

type Entry = {
  id: StyleId
  name: string
  note: string
  load: () => Promise<Style<never>>
}

/**
 * Faces first — people pick a face. Every style is CC0 1.0, which keeps the
 * licence story to one line; Bottts and the CC-BY styles are excluded on that
 * basis rather than on quality.
 *
 * Nothing is bundled eagerly. A style that has not arrived yet renders as a
 * neutral placeholder rather than as some other style's avatar — showing a face
 * that is not the one you picked is worse than showing no face.
 */
export const STYLES: Entry[] = [
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
  },
  {
    id: 'thumbs',
    name: 'Thumbs',
    note: 'Simple figures',
    load: async () => (await import('@dicebear/thumbs')) as unknown as Style<never>
  },
  {
    id: 'pixel-art',
    name: 'Pixel',
    note: 'Retro, reads well small',
    load: async () => (await import('@dicebear/pixel-art')) as unknown as Style<never>
  }
]

/**
 * A spread rather than a palette lift: two darks to sit against the stage, then
 * hues far enough apart to be told apart at 40px. The two team colours are not
 * here, so an avatar can never contradict the column it is standing in.
 */
export const BACKGROUNDS = [
  '141C30',
  '2C3550',
  '6B7A99',
  'C9962C',
  'FFC53D',
  'F1ECE0',
  'C2410C',
  '9333EA',
  '0E7490',
  '15803D'
]

export {AVATAR_VARIANTS as VARIANTS} from '../../game/types'

const loaded = new Map<StyleId, Style<never>>()
const pending = new Map<StyleId, Promise<Style<never>>>()
/** Every view waiting on a style, not just the one that asked for it first. */
const waiting = new Map<StyleId, Set<() => void>>()

export const styleFor = (id: string): Style<never> | null =>
  loaded.get(id as StyleId) ?? null

/** Deferred to idle so seven picker previews never contend with the mesh chunk. */
const whenIdle = (fn: () => void) =>
  'requestIdleCallback' in window
    ? requestIdleCallback(fn, {timeout: 1500})
    : setTimeout(fn, 60)

/**
 * Returns an unsubscribe. Every waiter is kept, because the picker renders the
 * same style twice — once as the live preview and once as its own swatch — and
 * an earlier version handed the callback only to whichever mounted first. The
 * other one sat on the fallback for the rest of the session.
 */
export const ensureStyle = (id: string, onReady: () => void) => {
  const key = id as StyleId
  if (loaded.has(key)) return () => {}

  const listeners = waiting.get(key) ?? new Set<() => void>()
  listeners.add(onReady)
  waiting.set(key, listeners)

  if (!pending.has(key)) {
    const entry = STYLES.find(s => s.id === key)
    if (!entry) return () => listeners.delete(onReady)
    const job = new Promise<Style<never>>(resolve => whenIdle(() => resolve(entry.load()))).then(
      mod => {
        loaded.set(key, mod)
        pending.delete(key)
        waiting.get(key)?.forEach(fn => fn())
        waiting.delete(key)
        return mod
      }
    )
    pending.set(key, job)
  }

  return () => listeners.delete(onReady)
}
