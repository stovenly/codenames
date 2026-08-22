import {describe, expect, it} from 'vitest'
import {accolades} from './accolades'
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
    expect(titles(steps).some(t => t.startsWith('Passenger'))).toBe(true)
  })
})
