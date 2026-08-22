import {describe, expect, it} from 'vitest'
import {buildBoard} from './board'
import {advance, derive, followUps} from './reducer'
import {composition, defaultSettings, isDegenerate, presetFor, validate, type BoardSize} from './settings'
import {mulberry32, seedFrom, shuffle} from './prng'
import {hashWords, normalize, validateCustom} from './wordlist'
import type {Step} from './steps'
import {rosterProblems, type Player, type Team} from './types'

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
      3: [9, 3, 2],
      4: [16, 5, 5],
      5: [25, 8, 8],
      6: [36, 11, 12],
      7: [49, 15, 17]
    }
    for (const size of [3, 4, 5, 6, 7] as BoardSize[]) {
      const c = composition({size, ...presetFor(size)})
      const [total, perTeam, neutral] = table[size]
      expect([c.total, c.perTeam, c.neutral]).toEqual([total, perTeam, neutral])
      expect(2 * c.perTeam + c.assassins + c.neutral).toBe(c.total)
    }
  })

  it('never gives one team more agents than the other', () => {
    for (const size of [3, 4, 5, 6, 7] as BoardSize[]) {
      for (let teamCards = 1; teamCards <= 4; teamCards++) {
        const cfg = {size, teamCards, assassins: 1}
        if (composition(cfg).neutral < 0) continue
        for (const start of ['red', 'blue'] as Team[]) {
          const board = buildBoard(settings(cfg), WORDS, 'seed', start)
          expect(board.filter(c => c.colour === 'red')).toHaveLength(teamCards)
          expect(board.filter(c => c.colour === 'blue')).toHaveLength(teamCards)
        }
      }
    }
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

  it('deals both teams the same number of agents whoever starts', () => {
    for (const start of ['red', 'blue'] as Team[]) {
      const board = buildBoard(settings(), WORDS, 'seed', start)
      expect(board.filter(c => c.colour === 'red')).toHaveLength(8)
      expect(board.filter(c => c.colour === 'blue')).toHaveLength(8)
    }
  })

  it('lays out exactly size squared cards with no repeats', () => {
    const board = buildBoard(settings({size: 7, teamCards: 15, assassins: 2}), WORDS, 's', 'red')
    expect(board).toHaveLength(49)
    expect(new Set(board.map(c => c.word)).size).toBe(49)
  })
})

describe('derive', () => {
  const cfg = settings()
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
      {team: 'red', message: 'Red has nobody on it'},
      {team: 'blue', message: 'Blue has nobody on it'}
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
