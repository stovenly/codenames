export type BoardSize = 3 | 4 | 5 | 6 | 7

export type Settings = {
  size: BoardSize
  /** Per team, before the bonus. */
  teamCards: number
  /** Extra agents for whichever side is dealt first. */
  bonusCards: number
  assassins: number
  wordListHash: string
  /** Label only, so every client can name the proposed deck without holding it. */
  wordListName: string
  clueTimer: number | null
  guessTimer: number | null
}

export const SIZES: BoardSize[] = [3, 4, 5, 6, 7]

export const CLUE_TIMERS = [null, 60, 120, 240] as const
export const GUESS_TIMERS = [null, 60, 120, 240] as const

const PRESETS: Record<BoardSize, {teamCards: number; bonusCards: number; assassins: number}> = {
  3: {teamCards: 3, bonusCards: 1, assassins: 1},
  4: {teamCards: 5, bonusCards: 1, assassins: 1},
  5: {teamCards: 8, bonusCards: 1, assassins: 1},
  6: {teamCards: 11, bonusCards: 1, assassins: 2},
  7: {teamCards: 15, bonusCards: 1, assassins: 2}
}

export const presetFor = (size: BoardSize) => PRESETS[size]

export const cardCount = (size: BoardSize) => size * size

export type Composition = {
  perTeam: number
  /** Dealt to whoever starts, on top of perTeam. */
  bonus: number
  assassins: number
  neutral: number
  total: number
}

export type Shape = Pick<Settings, 'size' | 'teamCards' | 'assassins'> & {bonusCards?: number}

/**
 * The starting team is dealt `bonusCards` more agents than the other, to offset
 * moving first. Everything left over is a bystander: the board absorbs the
 * remainder, never one of the teams.
 *
 * A state broadcast by a build that predates the setting has no `bonusCards`,
 * and reads as zero — the board is rebuilt from the seed on every client, so a
 * field two of them disagree about is two different boards.
 */
export const composition = (settings: Shape): Composition => {
  const total = cardCount(settings.size)
  const bonus = settings.bonusCards ?? 0
  return {
    perTeam: settings.teamCards,
    bonus,
    assassins: settings.assassins,
    neutral: total - 2 * settings.teamCards - bonus - settings.assassins,
    total
  }
}

export type Problem = {
  field: 'teamCards' | 'bonusCards' | 'assassins' | 'words' | 'neutral'
  message: string
}

export const validate = (settings: Shape, wordCount: number): Problem[] => {
  const problems: Problem[] = []
  const {neutral, total, bonus} = composition(settings)

  if (settings.teamCards < 1) problems.push({field: 'teamCards', message: 'Each team needs at least one agent'})
  if (bonus < 0) problems.push({field: 'bonusCards', message: 'The bonus cannot be negative'})
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
export const isDegenerate = (settings: Shape) => composition(settings).neutral === 0

export const maxTeamCards = (settings: Shape) =>
  Math.floor((cardCount(settings.size) - settings.assassins - (settings.bonusCards ?? 0)) / 2)

export const maxBonusCards = (settings: Shape) =>
  cardCount(settings.size) - 2 * settings.teamCards - settings.assassins

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
