export type BoardSize = 3 | 4 | 5 | 6 | 7

export type Settings = {
  size: BoardSize
  teamCards: number
  assassins: number
  wordListHash: string
  /** Label only, so every client can name the proposed deck without holding it. */
  wordListName: string
  clueTimer: number | null
  guessTimer: number | null
}

export const SIZES: BoardSize[] = [3, 4, 5, 6, 7]

export const CLUE_TIMERS = [null, 30, 60, 90, 120] as const
export const GUESS_TIMERS = [null, 60, 90, 120, 180] as const

const PRESETS: Record<BoardSize, {teamCards: number; assassins: number}> = {
  3: {teamCards: 3, assassins: 1},
  4: {teamCards: 5, assassins: 1},
  5: {teamCards: 8, assassins: 1},
  6: {teamCards: 11, assassins: 2},
  7: {teamCards: 15, assassins: 2}
}

export const presetFor = (size: BoardSize) => PRESETS[size]

export const cardCount = (size: BoardSize) => size * size

export type Composition = {
  perTeam: number
  assassins: number
  neutral: number
  total: number
}

/**
 * Both teams always get the same number of agents. Every other card is a
 * bystander — the board absorbs the remainder, never one of the teams.
 */
export const composition = (settings: Pick<Settings, 'size' | 'teamCards' | 'assassins'>): Composition => {
  const total = cardCount(settings.size)
  return {
    perTeam: settings.teamCards,
    assassins: settings.assassins,
    neutral: total - 2 * settings.teamCards - settings.assassins,
    total
  }
}

export type Problem = {field: 'teamCards' | 'assassins' | 'words' | 'neutral'; message: string}

export const validate = (
  settings: Pick<Settings, 'size' | 'teamCards' | 'assassins'>,
  wordCount: number
): Problem[] => {
  const problems: Problem[] = []
  const {neutral, total} = composition(settings)

  if (settings.teamCards < 1) problems.push({field: 'teamCards', message: 'Each team needs at least one agent'})
  if (settings.assassins < 1) problems.push({field: 'assassins', message: 'The board needs at least one assassin'})
  if (neutral < 0)
    problems.push({
      field: 'neutral',
      message: `That is ${-neutral} more card${neutral === -1 ? '' : 's'} than the board holds`
    })
  if (wordCount < total)
    problems.push({
      field: 'words',
      message: `Word list has ${wordCount} words, ${settings.size}x${settings.size} needs ${total}`
    })

  return problems
}

/** Allowed, but the board has no bystanders at all, which plays badly. */
export const isDegenerate = (settings: Pick<Settings, 'size' | 'teamCards' | 'assassins'>) =>
  composition(settings).neutral === 0

export const defaultSettings = (
  wordListHash: string,
  wordListName = 'Original',
  size: BoardSize = 5
): Settings => ({
  size,
  ...presetFor(size),
  wordListHash,
  wordListName,
  clueTimer: null,
  guessTimer: null
})
