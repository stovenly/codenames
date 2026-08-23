import {describe, expect, it} from 'vitest'
import {createAvatar} from '@dicebear/core'
import * as bunny from './bunny'
import {VARIANTS} from './styles'

const svgFor = (seed: number) =>
  createAvatar(bunny as never, {seed: String(seed), scale: 88, radius: 12}).toString()

describe('the bunny style', () => {
  it('draws something for every variant the slider can reach', () => {
    for (let i = 0; i < VARIANTS; i++) {
      const svg = svgFor(i)
      expect(svg).toContain('<ellipse cx="50" cy="59"')
      expect(svg).toMatch(/rotate\(-?[\d.]+ 39 42\)/)
      expect(svg).toMatch(/rotate\(-?[\d.]+ 61 42\)/)
    }
  })

  it('uses the whole palette rather than one colour in streaks', () => {
    const furs = new Set<string>()
    for (let i = 0; i < VARIANTS; i++) {
      const hit = /<ellipse cx="50" cy="59"[^>]*fill="#([0-9A-Fa-f]{6})"/.exec(svgFor(i))
      if (hit) furs.add(hit[1]!)
    }
    expect(furs.size).toBe(8)
  })

  it('puts the ears in every pose', () => {
    const poses = new Set<string>()
    for (let i = 0; i < VARIANTS; i++) {
      const svg = svgFor(i)
      const left = /rotate\((-?[\d.]+) 39 42\)/.exec(svg)?.[1]
      const right = /rotate\((-?[\d.]+) 61 42\)/.exec(svg)?.[1]
      poses.add(`${left}/${right}`)
    }
    expect(poses.size).toBe(5)
  })
})
