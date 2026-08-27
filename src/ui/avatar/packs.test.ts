import {describe, expect, it} from 'vitest'
import {createAvatar} from '@dicebear/core'
import * as bunny from './bunny'
import * as dino from './dino'
import * as dog from './dog'
import * as squid from './squid'
import {VARIANTS} from './styles'

const draw = (style: unknown, seed: number) =>
  createAvatar(style as never, {seed: String(seed), scale: 88, radius: 12}).toString()

/** How many of the sixty variants a mark shows up on. */
const count = (style: unknown, mark: RegExp) => {
  let n = 0
  for (let i = 0; i < VARIANTS; i++) if (mark.test(draw(style, i))) n++
  return n
}

const distinct = (style: unknown, mark: RegExp) => {
  const seen = new Set<string>()
  for (let i = 0; i < VARIANTS; i++) {
    const hit = mark.exec(draw(style, i))
    if (hit) seen.add(hit[1]!)
  }
  return seen
}

/**
 * Every optional part is on a coin flip, and the flip takes a percentage. Asking
 * for 0.45 rather than 45 is a part that never once appears, which nothing else
 * here would notice.
 */
const SOMETIMES: Array<[string, unknown, string, RegExp]> = [
  ['bunny blush', bunny, 'blush', /ellipse cx="29" cy="67"/],
  ['bunny teeth', bunny, 'teeth', /rect x="46.4" y="76"/],
  ['bunny whiskers', bunny, 'whiskers', /M25 67h-11/],
  ['dog tongue', dog, 'tongue', /E8798C/],
  ['dog collar', dog, 'collar', /M23 84/],
  ['dog patch', dog, 'patch', /ellipse cx="38" cy="54"/],
  ['dog brows', dog, 'brows', /M33 46/],
  ['dino teeth', dino, 'teeth', /M47.6 73.6/],
  ['dino spots', dino, 'spots', /circle cx="50" cy="34"/],
  ['dino stripes', dino, 'stripes', /M35.5 66h5/],
  ['dino brows', dino, 'brows', /M30 39q6-4 12-1/],
  ['squid fins', squid, 'fins', /rotate\(-24 20 34\)/],
  ['squid suckers', squid, 'suckers', /cx="42" cy="72"/],
  ['squid spots', squid, 'spots', /cx="34" cy="24"/]
]

describe('the styles drawn in this repository', () => {
  it.each([
    ['bunny', bunny, /<ellipse cx="50" cy="59"/],
    ['dog', dog, /<ellipse cx="50" cy="58"/],
    ['dino', dino, /<ellipse cx="50" cy="50" rx="26" ry="20"/],
    ['squid', squid, /<path d="M50 9c15.5/]
  ])('%s draws its body for every variant the slider reaches', (_name, style, body) => {
    expect(count(style, body)).toBe(VARIANTS)
  })

  it.each([
    ['bunny', bunny, /<ellipse cx="50" cy="59"[^>]*fill="#([0-9A-Fa-f]{6})"/],
    ['dog', dog, /<ellipse cx="50" cy="58" rx="27" ry="24" fill="#([0-9A-Fa-f]{6})"/],
    ['dino', dino, /<ellipse cx="50" cy="50" rx="26" ry="20" fill="#([0-9A-Fa-f]{6})"/],
    ['squid', squid, /<path d="M50 9c15.5[^"]*" fill="#([0-9A-Fa-f]{6})"/]
  ])('%s uses its whole palette rather than one colour in streaks', (_name, style, mark) => {
    expect(distinct(style, mark).size).toBe(8)
  })

  it.each(SOMETIMES)('%s turns up on some variants and not others', (_name, style, _part, mark) => {
    const n = count(style, mark)
    expect(n).toBeGreaterThan(5)
    expect(n).toBeLessThan(VARIANTS)
  })

  it('puts the bunny ears in every pose', () => {
    const poses = new Set<string>()
    for (let i = 0; i < VARIANTS; i++) {
      const svg = draw(bunny, i)
      poses.add(`${/rotate\((-?[\d.]+) 39 42\)/.exec(svg)?.[1]}/${/rotate\((-?[\d.]+) 61 42\)/.exec(svg)?.[1]}`)
    }
    expect(poses.size).toBe(5)
  })

  it('gives the dog all four ears', () => {
    const ears = [/L\d+ 22/, /q-13-1-16 10/, /ellipse cx="22" cy="41"/, /q-17 1-18 14/]
    for (const ear of ears) expect(count(dog, ear)).toBeGreaterThan(5)
  })

  it('gives the dino all four crests', () => {
    const crests = [/M43 32 50 8 57 32Z/, /M30 41q-2-20 1-31/, /rx="36" ry="27"/, /M25.5 47.4 12.8 40.9/]
    for (const crest of crests) expect(count(dino, crest)).toBeGreaterThan(5)
  })
})
