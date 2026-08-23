import type {Style} from '@dicebear/core'
import {shade} from './tint'

/** A rabbit drawn from parts, in the shape DiceBear expects of a style. */

const FUR = ['F2EEE6', 'C8CDD6', 'D8B48D', '8C6A4E', '55505C', 'EAD7AE', 'A9C8B5', 'C4AED6']

const INNER = ['E79AA6', 'DE8FA2', 'F0AEB4']

/** Ear angles, left then right, in degrees from upright. Past 90 the ear hangs. */
const POSES: Array<[number, number]> = [
  [6, 6],
  [4, 34],
  [28, 28],
  [6, 122],
  [126, 116]
]

/** Each ear pivots at the top of the skull, so a pose is two angles. */
const ear = (side: -1 | 1, angle: number, fur: string, inner: string) => {
  const x = 50 + side * 11
  return `<g transform="rotate(${side * angle} ${x} 42)">
    <rect x="${x - 7.5}" y="0" width="15" height="44" rx="7.5" fill="#${fur}"/>
    <rect x="${x - 3.8}" y="5" width="7.6" height="32" rx="3.8" fill="#${inner}"/>
  </g>`
}

const eyes = (kind: number, fur: string) => {
  const line = `#${shade(fur, 0.68)}`
  const open = (cx: number) =>
    `<ellipse cx="${cx}" cy="57" rx="4.6" ry="5.2" fill="#2A2531"/>
     <circle cx="${cx + 1.6}" cy="55" r="1.5" fill="#FFFFFF" opacity=".92"/>`
  const shut = (cx: number) =>
    `<path d="M${cx - 4.8} 57q4.8 4.6 9.6 0" stroke="${line}" stroke-width="2.1" fill="none" stroke-linecap="round"/>`
  const half = (cx: number) => `<path d="M${cx - 4.8} 55.4q4.8 5.4 9.6 0" fill="#2A2531"/>`

  if (kind === 0) return open(38) + open(62)
  if (kind === 1) return shut(38) + shut(62)
  if (kind === 2) return open(38) + shut(62)
  return half(38) + half(62)
}

export const meta = {
  title: 'Bunny',
  license: {name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/'}
}

export const create: Style<never>['create'] = ({prng}) => {
  // The first value out of the generator tracks the seed closely enough that
  // eight variants in a row come out the same colour; everything after it is
  // well mixed, so the palette reads second.
  prng.next()
  const fur = FUR[prng.integer(0, FUR.length - 1)]!
  const inner = INNER[prng.integer(0, INNER.length - 1)]!
  const deep = shade(fur, 0.18)
  const light = shade(fur, -0.3)
  const [left, right] = POSES[prng.integer(0, POSES.length - 1)] ?? POSES[0]!
  const look = prng.integer(0, 3)
  // Percentages: bool takes 1..100, and a fraction here means never.
  const blush = prng.bool(45)
  const teeth = prng.bool(60)
  const whiskers = prng.bool(70)

  return {
    attributes: {viewBox: '0 0 100 100', fill: 'none', 'shape-rendering': 'auto'},
    body: `
      <path d="M17 100c0-14 14.8-24 33-24s33 10 33 24Z" fill="#${deep}"/>
      ${ear(-1, left, fur, inner)}
      ${ear(1, right, fur, inner)}
      <ellipse cx="50" cy="59" rx="27" ry="24.5" fill="#${fur}"/>
      <ellipse cx="50" cy="69" rx="14.5" ry="10" fill="#${light}" opacity=".5"/>
      ${eyes(look, fur)}
      ${
        blush
          ? `<ellipse cx="29" cy="67" rx="5.2" ry="3.3" fill="#${inner}" opacity=".5"/>
             <ellipse cx="71" cy="67" rx="5.2" ry="3.3" fill="#${inner}" opacity=".5"/>`
          : ''
      }
      <path d="M46.2 65h7.6L50 69.8Z" fill="#${inner}"/>
      <path d="M50 69.8v3.2M50 73q-3.8 3.6-7 0M50 73q3.8 3.6 7 0"
            stroke="#${shade(fur, 0.55)}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
      ${
        teeth
          ? `<rect x="46.4" y="76" width="7.2" height="6.4" rx="1.7" fill="#FFFDF6"/>
             <path d="M50 76v6.4" stroke="#${shade(fur, 0.3)}" stroke-width="1"/>`
          : ''
      }
      ${
        whiskers
          ? `<path d="M25 67h-11M25.5 71.5l-10.5 3M75 67h11M74.5 71.5l10.5 3"
                   stroke="#${shade(fur, 0.45)}" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>`
          : ''
      }
    `
  }
}
