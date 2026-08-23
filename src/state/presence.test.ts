import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {Envelope} from '../net/protocol'

let handler: ((body: unknown, env: Envelope) => void) | null = null
const sent: unknown[] = []

vi.mock('./net', () => ({
  self: 'me',
  on: (_kind: string, fn: (body: unknown, env: Envelope) => void) => {
    handler = fn
  },
  send: (_kind: string, body: unknown) => sent.push(body)
}))
/** What the authoritative view says the room is doing; marks only count in a guess. */
let phase = 'guess'

vi.mock('./room', () => ({
  getRoom: () => ({shared: {settings: {wordListHash: 'h'}, steps: [], cursor: 0}}),
  subscribeRoom: () => {}
}))
vi.mock('../game/reducer', () => ({derive: () => ({phase})}))
vi.mock('./words', () => ({get: () => []}))

const {clearMarks, getMarksSnapshot: getMarks, myMark, setMyMark, startPresence} = await import(
  './presence'
)

const from = (who: string, body: unknown) => handler?.(body, {from: who} as Envelope)

describe('marks', () => {
  beforeEach(() => {
    phase = 'guess'
    clearMarks()
    sent.length = 0
    startPresence()
  })

  it('keeps one card per player however many arrive', () => {
    from('one', {kind: 'arm', card: 3, seq: 1})
    from('one', {kind: 'arm', card: 7, seq: 2})
    expect(getMarks().get(3)).toBeUndefined()
    expect([...(getMarks().get(7) ?? [])]).toEqual(['one'])
  })

  it('ignores a message overtaken on the way', () => {
    from('two', {kind: 'arm', card: 7, seq: 2})
    from('two', {kind: 'arm', card: 3, seq: 1})
    expect([...(getMarks().get(7) ?? [])]).toEqual(['two'])
    expect(getMarks().get(3)).toBeUndefined()
  })

  it('recovers from a dropped message rather than keeping both', () => {
    from('three', {kind: 'arm', card: 1, seq: 1})
    // seq 2 never arrives; seq 3 does.
    from('three', {kind: 'arm', card: 5, seq: 3})
    expect([...getMarks().keys()]).toEqual([5])
  })

  it('clears a player who drops their mark', () => {
    from('four', {kind: 'arm', card: 2, seq: 1})
    from('four', {kind: 'arm', card: null, seq: 2})
    expect(getMarks().size).toBe(0)
  })

  it('sends where the mark is, not what changed', () => {
    setMyMark(4)
    setMyMark(9)
    setMyMark(null)
    expect(sent).toEqual([
      {kind: 'arm', card: 4, seq: 1},
      {kind: 'arm', card: 9, seq: 2},
      {kind: 'arm', card: null, seq: 3}
    ])
    expect(myMark()).toBeNull()
  })

  it('holds one mark of my own', () => {
    setMyMark(4)
    setMyMark(9)
    expect(myMark()).toBe(9)
    expect([...getMarks().keys()]).toEqual([9])
  })

  it('refuses one that arrives after the turn is over', () => {
    phase = 'clue'
    from('late', {kind: 'arm', card: 6, seq: 1})
    expect(getMarks().size).toBe(0)
  })

  it('refuses to make one of my own once the turn is over', () => {
    phase = 'clue'
    setMyMark(3)
    expect(myMark()).toBeNull()
    expect(sent).toEqual([])
  })

  it('still lets a mark be taken back between turns', () => {
    setMyMark(2)
    phase = 'clue'
    setMyMark(null)
    expect(myMark()).toBeNull()
  })
})
