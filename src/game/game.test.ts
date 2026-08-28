import {describe, expect, it} from 'vitest'
import {buildBoard} from './board'
import {advance, derive, followUps} from './reducer'
import {clueProblem} from './clue'
import {
  composition,
  defaultSettings,
  isDegenerate,
  presetFor,
  validate,
  type BoardSize,
  type Settings
} from './settings'
import {mulberry32, seedFrom, shuffle} from './prng'
import {hashWords, normalize, validateCustom} from './wordlist'
import {readLog} from './log'
import type {Step} from './steps'
import {dealTeams, rosterProblems, seatOf, type Player, type Team} from './types'

const WORDS = Array.from({length: 80}, (_, i) => `WORD${String(i).padStart(2, '0')}`)
const settings = (over: Partial<ReturnType<typeof defaultSettings>> = {}) => ({
  ...defaultSettings('test-hash'),
  ...over
})

const firstOf = (cards: ReturnType<typeof buildBoard>, colour: string, skip = 0) => {
  let seen = 0
  for (let i = 0; i < cards.length; i++) {
    if (cards[i]!.colour !== colour) continue
    if (seen++ === skip) return i
  }
  throw new Error(`no ${colour} card at offset ${skip}`)
}

describe('prng', () => {
  it('is deterministic for a seed', () => {
    const a = Array.from({length: 5}, mulberry32(seedFrom('abc')))
    const b = Array.from({length: 5}, mulberry32(seedFrom('abc')))
    expect(a).toEqual(b)
  })

  it('diverges on a different seed', () => {
    const a = Array.from({length: 5}, mulberry32(seedFrom('abc')))
    const b = Array.from({length: 5}, mulberry32(seedFrom('abd')))
    expect(a).not.toEqual(b)
  })

  it('shuffles without losing or duplicating items', () => {
    const items = [...WORDS]
    const out = shuffle([...items], mulberry32(1))
    expect([...out].sort()).toEqual([...items].sort())
  })
})

describe('settings', () => {
  it('matches the documented default composition at every size', () => {
    const table: Record<BoardSize, [number, number, number]> = {
      3: [9, 3, 1],
      4: [16, 5, 4],
      5: [25, 8, 7],
      6: [36, 11, 11],
      7: [49, 15, 16]
    }
    for (const size of [3, 4, 5, 6, 7] as BoardSize[]) {
      const c = composition({size, ...presetFor(size)})
      const [total, perTeam, neutral] = table[size]
      expect([c.total, c.perTeam, c.neutral]).toEqual([total, perTeam, neutral])
      expect(c.bonus).toBe(1)
      expect(2 * c.perTeam + c.bonus + c.assassins + c.neutral).toBe(c.total)
    }
  })

  it('gives the extra agents to whoever starts and nobody else', () => {
    for (const size of [3, 4, 5, 6, 7] as BoardSize[]) {
      for (let teamCards = 1; teamCards <= 4; teamCards++) {
        for (const bonusCards of [0, 1, 3]) {
          const cfg = {size, teamCards, bonusCards, assassins: 1}
          if (composition(cfg).neutral < 0) continue
          for (const start of ['red', 'blue'] as Team[]) {
            const board = buildBoard(settings(cfg), WORDS, 'seed', start)
            const other = start === 'red' ? 'blue' : 'red'
            expect(board.filter(c => c.colour === start)).toHaveLength(teamCards + bonusCards)
            expect(board.filter(c => c.colour === other)).toHaveLength(teamCards)
          }
        }
      }
    }
  })

  it('deals the board today’s build deals when the bonus is off', () => {
    const cfg = {size: 5 as BoardSize, teamCards: 8, bonusCards: 0, assassins: 1}
    const board = buildBoard(settings(cfg), WORDS, 'seed', 'red')
    expect(board.filter(c => c.colour === 'red')).toHaveLength(8)
    expect(board.filter(c => c.colour === 'blue')).toHaveLength(8)
    expect(board.filter(c => c.colour === 'neutral')).toHaveLength(8)
  })

  it('reads a board from a build that had no bonus setting as having none', () => {
    const {bonusCards, ...older} = settings()
    expect(composition(older).bonus).toBe(0)
    expect(buildBoard(older as Settings, WORDS, 'seed', 'red')).toEqual(
      buildBoard(settings({bonusCards: 0}), WORDS, 'seed', 'red')
    )
  })

  it('rejects a composition that overflows the board', () => {
    const problems = validate({size: 3, teamCards: 5, assassins: 1}, 100)
    expect(problems.some(p => p.field === 'neutral')).toBe(true)
  })

  it('absorbs the remainder into bystanders, not into a team', () => {
    const c = composition({size: 5, teamCards: 4, assassins: 1})
    expect(c.perTeam).toBe(4)
    expect(c.neutral).toBe(25 - 8 - 1)
  })

  it('rejects a word list shorter than the board', () => {
    const problems = validate({size: 7, teamCards: 15, assassins: 2}, 47)
    expect(problems.find(p => p.field === 'words')?.message).toContain('47 words')
  })

  it('flags a bystander-free board as degenerate but valid', () => {
    const cfg = {size: 3 as BoardSize, teamCards: 3, assassins: 3}
    expect(composition(cfg).neutral).toBe(0)
    expect(isDegenerate(cfg)).toBe(true)
    expect(validate(cfg, 100)).toEqual([])
  })
})

describe('board', () => {
  it('is identical for the same seed and settings', () => {
    const a = buildBoard(settings(), WORDS, 'seed-1', 'red')
    const b = buildBoard(settings(), WORDS, 'seed-1', 'red')
    expect(a).toEqual(b)
  })

  it('differs for a different seed', () => {
    const a = buildBoard(settings(), WORDS, 'seed-1', 'red')
    const b = buildBoard(settings(), WORDS, 'seed-2', 'red')
    expect(a).not.toEqual(b)
  })

  it('deals the bonus to whichever side starts', () => {
    for (const start of ['red', 'blue'] as Team[]) {
      const board = buildBoard(settings(), WORDS, 'seed', start)
      const other = start === 'red' ? 'blue' : 'red'
      expect(board.filter(c => c.colour === start)).toHaveLength(9)
      expect(board.filter(c => c.colour === other)).toHaveLength(8)
    }
  })

  it('lays out exactly size squared cards with no repeats', () => {
    const board = buildBoard(settings({size: 7, teamCards: 15, assassins: 2}), WORDS, 's', 'red')
    expect(board).toHaveLength(49)
    expect(new Set(board.map(c => c.word)).size).toBe(49)
  })
})

describe('derive', () => {
  /** Even sides, so a count in here is about the rule under test and not the deal. */
  const cfg = settings({bonusCards: 0})
  const start: Step = {t: 'start', seed: 'seed-1', startTeam: 'red'}
  const board = buildBoard(cfg, WORDS, 'seed-1', 'red')
  const run = (steps: Step[]) => derive(cfg, WORDS, steps, steps.length)

  it('is setup with no start step', () => {
    expect(run([]).phase).toBe('setup')
  })

  it('opens on the starting team awaiting a clue', () => {
    const view = run([start])
    expect(view.phase).toBe('clue')
    expect(view.turn).toBe('red')
    expect(view.remaining).toEqual({red: 8, blue: 8})
  })

  it('grants count plus one guesses', () => {
    const view = run([start, {t: 'clue', team: 'red', by: 'p1', word: 'OCEAN', count: 3}])
    expect(view.phase).toBe('guess')
    expect(view.guessesLeft).toBe(4)
    expect(view.unlimited).toBe(false)
  })

  it('treats zero and unlimited alike', () => {
    for (const count of [0, 'unlimited'] as const) {
      const view = run([start, {t: 'clue', team: 'red', by: 'p1', word: 'X', count}])
      expect(view.unlimited).toBe(true)
      expect(view.guessesLeft).toBe(Infinity)
    }
  })

  it('decrements on a correct guess and keeps the turn', () => {
    const view = run([
      start,
      {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 2},
      {t: 'guess', team: 'red', by: 'p2', card: firstOf(board, 'red')}
    ])
    expect(view.turn).toBe('red')
    expect(view.guessesLeft).toBe(2)
    expect(view.remaining.red).toBe(7)
    expect(view.lastGuess?.correct).toBe(true)
  })

  it('ignores a guess on an already revealed card', () => {
    const card = firstOf(board, 'red')
    const view = run([
      start,
      {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 3},
      {t: 'guess', team: 'red', by: 'p2', card},
      {t: 'guess', team: 'red', by: 'p2', card}
    ])
    expect(view.remaining.red).toBe(7)
    expect(view.guessesLeft).toBe(3)
  })

  it('hands the turn over after an endTurn step', () => {
    const view = run([
      start,
      {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 1},
      {t: 'endTurn', team: 'red', reason: 'pass'}
    ])
    expect(view.turn).toBe('blue')
    expect(view.phase).toBe('clue')
    expect(view.clue).toBeNull()
  })

  it('ends the game on the assassin, and the guessing team loses', () => {
    const view = run([
      start,
      {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 1},
      {t: 'guess', team: 'red', by: 'p2', card: firstOf(board, 'assassin')}
    ])
    expect(view.phase).toBe('gameover')
    expect(view.winner).toBe('blue')
    expect(view.endReason).toBe('assassin')
  })

  it('awards the win when the opposing team reveals your last card', () => {
    const steps: Step[] = [start, {t: 'clue', team: 'blue', by: 'p1', word: 'X', count: 'unlimited'}]
    for (let i = 0; i < 8; i++) {
      steps.push({t: 'guess', team: 'blue', by: 'p2', card: firstOf(board, 'red', i)})
    }
    const view = derive(cfg, WORDS, steps, steps.length)
    expect(view.winner).toBe('red')
    expect(view.endReason).toBe('cards')
  })

  it('rewinds exactly, restoring the identical board', () => {
    const steps: Step[] = [
      start,
      {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 2},
      {t: 'guess', team: 'red', by: 'p2', card: firstOf(board, 'red')}
    ]
    const before = derive(cfg, WORDS, steps, 2)
    const after = derive(cfg, WORDS, steps, 3)
    const back = derive(cfg, WORDS, steps, 2)
    expect(back).toEqual(before)
    expect(back.cards.map(c => c.word)).toEqual(after.cards.map(c => c.word))
    expect(back.remaining.red).toBe(8)
  })

  it('ignores steps past the cursor', () => {
    const steps: Step[] = [start, {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 2}]
    expect(derive(cfg, WORDS, steps, 1).phase).toBe('clue')
    expect(derive(cfg, WORDS, steps, 99).phase).toBe('guess')
  })
})

describe('followUps', () => {
  const cfg = settings()
  const seed = 'seed-1'
  const board = buildBoard(cfg, WORDS, seed, 'red')
  const start: Step = {t: 'start', seed, startTeam: 'red'}

  it('ends the turn on a wrong colour', () => {
    const steps: Step[] = [
      start,
      {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 2},
      {t: 'guess', team: 'red', by: 'p2', card: firstOf(board, 'neutral')}
    ]
    expect(followUps(cfg, WORDS, steps)).toEqual([{t: 'endTurn', team: 'red', reason: 'wrong'}])
  })

  it('ends the turn when guesses run out', () => {
    let steps: Step[] = [start, {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 1}]
    steps = advance(cfg, WORDS, steps, {t: 'guess', team: 'red', by: 'p2', card: firstOf(board, 'red')})
    steps = advance(cfg, WORDS, steps, {t: 'guess', team: 'red', by: 'p2', card: firstOf(board, 'red', 1)})
    expect(steps.at(-1)).toEqual({t: 'endTurn', team: 'red', reason: 'exhausted'})
    expect(derive(cfg, WORDS, steps, steps.length).turn).toBe('blue')
  })

  it('appends an end step exactly once', () => {
    const steps = advance(cfg, WORDS, [start, {t: 'clue', team: 'red', by: 'p1', word: 'X', count: 1}], {
      t: 'guess',
      team: 'red',
      by: 'p2',
      card: firstOf(board, 'assassin')
    })
    expect(steps.filter(s => s.t === 'end')).toHaveLength(1)
    expect(followUps(cfg, WORDS, steps)).toEqual([])
  })

  it('plays a full game to a card win', () => {
    let steps: Step[] = [start]
    let guard = 0
    while (derive(cfg, WORDS, steps, steps.length).phase !== 'gameover' && guard++ < 60) {
      const view = derive(cfg, WORDS, steps, steps.length)
      if (view.phase === 'clue') {
        steps = advance(cfg, WORDS, steps, {
          t: 'clue',
          team: view.turn,
          by: 'sm',
          word: 'CLUE',
          count: 'unlimited'
        })
        continue
      }
      const next = view.cards.findIndex(c => !c.revealed && c.colour === view.turn)
      steps = advance(cfg, WORDS, steps, {t: 'guess', team: view.turn, by: 'op', card: next})
    }
    const view = derive(cfg, WORDS, steps, steps.length)
    expect(view.phase).toBe('gameover')
    expect(view.winner).toBe('red')
  })
})

describe('word lists', () => {
  it('normalizes comments, markers, case and whitespace', () => {
    expect(normalize(['# header', '', '=REVISED', '-RETIRED', '  ice   cream ', 'Ice Cream', 'apple'])).toEqual([
      'APPLE',
      'ICE CREAM',
      'RETIRED',
      'REVISED'
    ])
  })

  it('keeps the first of a case-insensitive duplicate pair', () => {
    expect(normalize(['Alpha', 'ALPHA', 'alpha'])).toEqual(['ALPHA'])
  })

  it('hashes by content and length', () => {
    expect(hashWords(['A', 'B'])).toBe(hashWords(['A', 'B']))
    expect(hashWords(['A', 'B'])).not.toBe(hashWords(['A', 'C']))
    expect(hashWords(['A', 'B'])).not.toBe(hashWords(['A', 'B', 'C']))
  })

  it('reports each custom-list rule separately', () => {
    const report = validateCustom(['OCEAN', '', 'A', 'we!rd', 'ocean', 'x'.repeat(201), 'SHIP'].join('\n'))
    expect(report.accepted).toEqual(['OCEAN', 'SHIP'])
    expect(report.droppedBlank).toBe(1)
    expect(report.droppedDuplicate).toBe(1)
    expect(report.rejected.map(r => r.reason)).toEqual([
      'Single characters do not work as clues',
      'Only letters, digits, spaces, hyphens and apostrophes',
      'Longer than 200 characters'
    ])
    expect(report.fatal).toBeNull()
  })

  it('accepts a long entry with a warning', () => {
    const report = validateCustom('x'.repeat(120))
    expect(report.accepted).toHaveLength(1)
    expect(report.warnings).toHaveLength(1)
  })

  it('rejects a list over the entry cap outright', () => {
    const report = validateCustom(Array.from({length: 201}, (_, i) => `WORD${i}`).join('\n'))
    expect(report.fatal).toContain('201 words')
    expect(report.accepted).toEqual([])
  })

  it('allows hyphens and apostrophes', () => {
    expect(validateCustom("O'CLOCK\nX-RAY").accepted).toEqual(["O'CLOCK", 'X-RAY'])
  })
})

describe('roster', () => {
  const seat = (id: string, team: Team | null, spymaster: boolean): Player => ({
    id,
    name: id,
    team,
    spymaster,
    ready: true,
    avatar: {style: 'lorelei', seed: '0', bg: '141C30'},
    connected: true
  })

  it('wants a spymaster and a guesser on each side', () => {
    expect(rosterProblems([])).toEqual([
      {team: 'red', message: 'Red has no players'},
      {team: 'blue', message: 'Blue has no players'}
    ])

    expect(
      rosterProblems([seat('a', 'red', false), seat('b', 'blue', true), seat('c', 'blue', false)])
    ).toEqual([{team: 'red', message: 'Red needs a spymaster'}])

    expect(
      rosterProblems([seat('a', 'red', true), seat('b', 'blue', true), seat('c', 'blue', false)])
    ).toEqual([{team: 'red', message: 'Red needs at least one spy'}])

    expect(
      rosterProblems([
        seat('a', 'red', true),
        seat('b', 'red', false),
        seat('c', 'blue', true),
        seat('d', 'blue', false)
      ])
    ).toEqual([])
  })
})

describe('the assassin', () => {
  const boardOf = (size: BoardSize, assassins: number) => {
    const s = settings({size, assassins, teamCards: presetFor(size).teamCards})
    return {s, cards: buildBoard(s, WORDS, 'seed', 'red')}
  }

  it('ends the game on the first one, however many are on the board', () => {
    for (const [size, assassins] of [
      [5, 1],
      [7, 6],
      [7, 1],
      [3, 1]
    ] as Array<[BoardSize, number]>) {
      const {s, cards} = boardOf(size, assassins)
      const at = cards.findIndex(c => c.colour === 'assassin')
      expect(at).toBeGreaterThanOrEqual(0)

      const steps = advance(s, WORDS, [{t: 'start', seed: 'seed', startTeam: 'red'}], {
        t: 'clue',
        team: 'red',
        by: 'rs',
        word: 'ORBIT',
        count: 2
      })
      const after = advance(s, WORDS, steps, {t: 'guess', team: 'red', by: 'rg', card: at})

      expect(after.some(step => step.t === 'end')).toBe(true)
      const view = derive(s, WORDS, after, after.length)
      expect(view.phase).toBe('gameover')
      expect(view.winner).toBe('blue')
      expect(view.endReason).toBe('assassin')
    }
  })
})

describe('a clue nobody gave', () => {
  const WORDS_80 = WORDS
  const s = settings()

  it('puts the team in to guess with nothing to go on', () => {
    const steps: Step[] = [
      {t: 'start', seed: 'seed', startTeam: 'red'},
      {t: 'clue', team: 'red', by: 'rs', word: '', count: 'unlimited'}
    ]
    const view = derive(s, WORDS_80, steps, steps.length)
    expect(view.phase).toBe('guess')
    expect(view.turn).toBe('red')
    expect(view.clue?.word).toBe('')
    expect(view.unlimited).toBe(true)
  })

  it('is still a clue in the log, with nothing where the word goes', () => {
    const steps: Step[] = [
      {t: 'start', seed: 'seed', startTeam: 'red'},
      {t: 'clue', team: 'red', by: 'rs', word: '', count: 'unlimited'}
    ]
    const entries = readLog(s, WORDS_80, steps, steps.length)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({kind: 'clue', word: '', by: 'rs'})
  })
})

describe('dealing the teams', () => {
  const player = (id: string, spectator = false): Player => ({
    id,
    name: id,
    team: null,
    spymaster: false,
    ready: false,
    avatar: {style: 'lorelei', seed: '0', bg: '141C30'},
    connected: true,
    spectator
  })

  const roster = (n: number, spectators: string[] = []) =>
    Array.from({length: n}, (_, i) => player(`p${i}`, spectators.includes(`p${i}`)))

  it('splits every size evenly and gives each side one spymaster', () => {
    for (let n = 2; n <= 9; n++) {
      const players = roster(n)
      const dealt = dealTeams(players, players.map(p => p.id), 'red')
      const red = dealt.filter(p => p.team === 'red')
      const blue = dealt.filter(p => p.team === 'blue')

      expect(Math.abs(red.length - blue.length)).toBeLessThanOrEqual(1)
      expect(red.filter(p => p.spymaster)).toHaveLength(1)
      expect(blue.filter(p => p.spymaster)).toHaveLength(1)
      expect(dealt.filter(p => p.team === null)).toHaveLength(0)
    }
  })

  it('leaves spectators watching and balances around them', () => {
    const players = roster(6, ['p1', 'p4'])
    const dealt = dealTeams(players, players.map(p => p.id), 'blue')

    expect(dealt.filter(p => seatOf(p) === 'spectator').map(p => p.id)).toEqual(['p1', 'p4'])
    expect(dealt.find(p => p.id === 'p1')!.spymaster).toBe(false)
    expect(dealt.filter(p => p.team === 'red')).toHaveLength(2)
    expect(dealt.filter(p => p.team === 'blue')).toHaveLength(2)
  })

  it('clears the spymaster somebody was before', () => {
    const players = roster(4).map(p => (p.id === 'p3' ? {...p, team: 'red' as Team, spymaster: true} : p))
    const dealt = dealTeams(players, ['p0', 'p1', 'p2', 'p3'], 'red')

    expect(dealt.find(p => p.id === 'p3')!.spymaster).toBe(false)
    expect(dealt.filter(p => p.spymaster)).toHaveLength(2)
  })

  it('gives the odd seat to whichever side is dealt first', () => {
    const players = roster(5)
    const ids = players.map(p => p.id)

    expect(dealTeams(players, ids, 'red').filter(p => p.team === 'red')).toHaveLength(3)
    expect(dealTeams(players, ids, 'blue').filter(p => p.team === 'blue')).toHaveLength(3)
  })

  it('seats a roster that is all spectators nowhere', () => {
    const players = roster(3, ['p0', 'p1', 'p2'])
    const dealt = dealTeams(players, players.map(p => p.id), 'red')

    expect(dealt.every(p => p.team === null && !p.spymaster)).toBe(true)
    expect(rosterProblems(dealt)).toHaveLength(2)
  })
})

describe('a clue the table can see', () => {
  const cards = [
    {word: 'APPLE', colour: 'red' as const, revealed: false, revealedBy: null},
    {word: 'PANS', colour: 'blue' as const, revealed: false, revealedBy: null},
    {word: 'CAR', colour: 'neutral' as const, revealed: true, revealedBy: 'red' as const}
  ]

  it('refuses a word on the board, turned over or not', () => {
    expect(clueProblem('APPLE', cards)).toBe('APPLE is on the board — pick another word')
    expect(clueProblem('apple', cards)).toBe('APPLE is on the board — pick another word')
    expect(clueProblem('CAR', cards)).toBe('CAR is on the board — pick another word')
  })

  it('refuses the plural either way round', () => {
    expect(clueProblem('APPLES', cards)).toBe('APPLE is on the board — pick another word')
    expect(clueProblem('PAN', cards)).toBe('PANS is on the board — pick another word')
  })

  it('refuses a count typed onto the end of the clue', () => {
    const said = 'Use the counter for the number, not the clue'
    expect(clueProblem('ORCHARD 3', cards)).toBe(said)
    expect(clueProblem('ORCHARD - 3', cards)).toBe(said)
    expect(clueProblem('ORCHARD 12 ', cards)).toBe(said)
  })

  it('leaves a number that is part of the word alone', () => {
    expect(clueProblem('AREA51', cards)).toBeNull()
    expect(clueProblem('007', cards)).toBeNull()
  })

  it('allows a word that merely contains one', () => {
    expect(clueProblem('CARPET', cards)).toBeNull()
    expect(clueProblem('PINEAPPLE', cards)).toBeNull()
    expect(clueProblem('ORCHARD', cards)).toBeNull()
  })

  it('leaves the step log alone when a clue is refused', () => {
    const cfg = settings({bonusCards: 0})
    const board = buildBoard(cfg, WORDS, 'seed-1', 'red')
    const steps: Step[] = [{t: 'start', seed: 'seed-1', startTeam: 'red'}]
    const view = derive(cfg, WORDS, steps, steps.length)

    expect(clueProblem(board[0]!.word, view.cards)).not.toBeNull()
    expect(derive(cfg, WORDS, steps, steps.length).phase).toBe('clue')
    expect(steps).toHaveLength(1)
  })
})
