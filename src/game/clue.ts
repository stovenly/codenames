import type {Card} from './reducer'

/**
 * Letters only, and a trailing S off each side, so APPLES does not get past
 * APPLE and PAN does not get past PANS. Nothing more: a stemmer would reject
 * legal clues, and arguing with a false rejection while the clock runs is worse
 * than being told off by the table.
 */
const key = (word: string) => {
  const letters = word.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '')
  return letters.length > 1 && letters.endsWith('S') ? letters.slice(0, -1) : letters
}

/**
 * A clue may not be a word the table can see. Every card counts, turned over or
 * not: a spent card keeps its word legible here, and the rule is about what is
 * visible.
 */
export const clueProblem = (word: string, cards: Card[]): string | null => {
  const wanted = key(word)
  if (!wanted) return null
  const clash = cards.find(card => key(card.word) === wanted)
  return clash ? `${clash.word} is on the board` : null
}
