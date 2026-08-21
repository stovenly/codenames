import {mulberry32, seedFrom, shuffle} from './prng'
import {cardCount, composition, type Settings} from './settings'
import type {Team} from './types'

export type Colour = Team | 'neutral' | 'assassin'

export type Slot = {word: string; colour: Colour}

/**
 * Never stored — regenerated from the seed on every derive, which is what makes
 * undo restore the identical board rather than a fresh one.
 */
export const buildBoard = (settings: Settings, words: string[], seed: string, startTeam: Team): Slot[] => {
  const rand = mulberry32(seedFrom(seed))
  const picked = shuffle([...words], rand).slice(0, cardCount(settings.size))

  const {starting, second, assassins, neutral} = composition(settings)
  const other: Team = startTeam === 'red' ? 'blue' : 'red'

  const bag: Colour[] = [
    ...Array<Colour>(starting).fill(startTeam),
    ...Array<Colour>(Math.max(0, second)).fill(other),
    ...Array<Colour>(Math.max(0, assassins)).fill('assassin'),
    ...Array<Colour>(Math.max(0, neutral)).fill('neutral')
  ]
  shuffle(bag, rand)

  return picked.map((word, i) => ({word, colour: bag[i] ?? 'neutral'}))
}
