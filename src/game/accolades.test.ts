import {describe, expect, it} from 'vitest'
import {accolades, catalogue} from './accolades'
import {buildBoard} from './board'
import {defaultSettings} from './settings'
import type {Step} from './steps'
import type {Player, Team} from './types'

const WORDS = Array.from({length: 80}, (_, i) => `W${String(i).padStart(2, '0')}`)
const settings = defaultSettings('hash')

const seat = (id: string, team: Team, spymaster = false): Player => ({
  id,
  name: id,
  team,
  spymaster,
  ready: true,
  avatar: {style: 'lorelei', seed: '0', bg: '141C30'},
  connected: true
})

const PLAYERS = [seat('rs', 'red', true), seat('rg', 'red'), seat('bs', 'blue', true), seat('bg', 'blue')]

const START: Step = {t: 'start', seed: 'seed', startTeam: 'red'}
const board = buildBoard(settings, WORDS, 'seed', 'red')
const firstOf = (colour: string, skip = 0) => {
  let seen = 0
  for (let i = 0; i < board.length; i++) {
    if (board[i]!.colour !== colour) continue
    if (seen++ === skip) return i
  }
  throw new Error(`no ${colour}`)
}

const titles = (steps: Step[]) =>
  accolades(settings, WORDS, steps, PLAYERS).map(a => `${a.title}:${a.who}`)

describe('accolades', () => {
  it('has nothing to say about a game nobody played', () => {
    expect(accolades(settings, WORDS, [START], PLAYERS)).toEqual([])
  })

  it('leads with the assassin, whoever else did what', () => {
    const steps: Step[] = [
      START,
      {t: 'clue', team: 'red', by: 'rs', word: 'ORBIT', count: 3},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('red')},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('assassin')}
    ]
    expect(titles(steps)[0]).toBe('Saboteur:rg')
  })

  it('names four different people when it can', () => {
    const steps: Step[] = [
      START,
      {t: 'clue', team: 'red', by: 'rs', word: 'ORBIT', count: 3},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('red')},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('red', 1)},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('red', 2)},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('neutral')},
      {t: 'endTurn', team: 'red', reason: 'wrong'},
      {t: 'clue', team: 'blue', by: 'bs', word: 'HARBOR', count: 4},
      {t: 'guess', team: 'blue', by: 'bg', card: firstOf('blue')},
      {t: 'guess', team: 'blue', by: 'bg', card: firstOf('red', 3)},
      {t: 'endTurn', team: 'blue', reason: 'wrong'}
    ]
    const who = accolades(settings, WORDS, steps, PLAYERS).map(a => a.who)
    expect(who.length).toBe(4)
    expect(new Set(who).size).toBe(4)
  })

  it('credits the spymaster whose clue actually landed', () => {
    const steps: Step[] = [
      START,
      {t: 'clue', team: 'red', by: 'rs', word: 'ORBIT', count: 3},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('red')},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('red', 1)},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('red', 2)}
    ]
    expect(titles(steps)).toContain('Mind Reader:rg')
    expect(titles(steps)).toContain('Wordsmith:rs')
  })

  it('gives no accolade to a card nobody touched', () => {
    const steps: Step[] = [
      START,
      {t: 'clue', team: 'red', by: 'rs', word: 'ORBIT', count: 1},
      {t: 'guess', team: 'red', by: 'rg', card: firstOf('red')}
    ]
    expect(titles(steps).some(t => t.startsWith('Dead Weight'))).toBe(true)
  })
})

describe('team leader', () => {
  const guessers = (n: number, team: Team): Player[] =>
    Array.from({length: n}, (_, i) => seat(`${team}${i}`, team))

  const table = (redGuessers: number) => [
    seat('rs', 'red', true),
    ...guessers(redGuessers, 'red'),
    seat('bs', 'blue', true),
    seat('bg', 'blue')
  ]

  /** One player takes `mine` of `total` picks; the rest share what is left. */
  const run = (players: Player[], mine: number, total: number): Step[] => {
    const steps: Step[] = [START, {t: 'clue', team: 'red', by: 'rs', word: 'ORBIT', count: 9}]
    const spies = players.filter(p => p.team === 'red' && !p.spymaster)
    for (let i = 0; i < total; i++) {
      const by = i < mine ? spies[0]!.id : spies[1 + (i % Math.max(1, spies.length - 1))]!.id
      steps.push({t: 'guess', team: 'red', by, card: firstOf('red', i % 8)})
    }
    return steps
  }

  // The catalogue rather than the dealt four: two of these compare weights, and
  // a leader who is also the best guesser loses their card to the better one.
  const leaderIn = (players: Player[], mine: number, total: number) =>
    catalogue(settings, WORDS, run(players, mine, total), players).find(a => a.title === 'Team Leader')

  it('says nothing on a side with one or two guessers', () => {
    expect(leaderIn(table(1), 6, 6)).toBeUndefined()
    expect(leaderIn(table(2), 6, 6)).toBeUndefined()
  })

  it('names the leader once a side is big enough to lead', () => {
    const hit = leaderIn(table(3), 6, 8)
    expect(hit?.who).toBe('red0')
  })

  it('weighs the same share more heavily on a bigger side', () => {
    const small = leaderIn(table(3), 19, 20)!
    const big = leaderIn(table(5), 19, 20)!
    expect(big.weight).toBeGreaterThan(small.weight)
  })

  it('wants an actual majority, not just the most', () => {
    expect(leaderIn(table(4), 4, 12)).toBeUndefined()
  })
})
