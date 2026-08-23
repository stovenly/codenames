import type {Style} from '@dicebear/core'
import {shade} from './tint'

/** A squid drawn from parts, in the shape DiceBear expects of a style. */

const INK = ['E4674F', 'C4557E', '8E6FC9', '4E7FD1', '2F9E9B', 'E39B3C', '6C7488', 'D46A9E']

const ARMS = 6

/** How far each arm swings out at the tip, as a fraction of its own length. */
const CURLS = [0, 0.55, -0.5, 1]

const arm = (i: number, curl: number, colour: string, width: number) => {
  const spread = (i - (ARMS - 1) / 2) * 8.4
  const x = 50 + spread
  const sway = spread * 0.35 + curl * (spread === 0 ? 6 : spread) * 0.9
  const tip = x + sway
  return `<path d="M${x} 60q${sway * 0.35} 12 ${tip - x} 26" stroke="#${colour}" stroke-width="${width}" fill="none" stroke-linecap="round"/>`
}

const eyes = (kind: number, ink: string) => {
  const line = `#${shade(ink, 0.55)}`
  const wide = (cx: number) =>
    `<ellipse cx="${cx}" cy="45" rx="8.5" ry="9" fill="#FFFDF6"/>
     <ellipse cx="${cx + 1}" cy="45.5" rx="4.2" ry="4.6" fill="#2A2531"/>
     <circle cx="${cx + 2.6}" cy="42.8" r="1.7" fill="#FFFFFF"/>`
  const shut = (cx: number) =>
    `<path d="M${cx - 7} 45q7 6.5 14 0" stroke="${line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
  const half = (cx: number) =>
    `<ellipse cx="${cx}" cy="45" rx="8.5" ry="9" fill="#FFFDF6"/>
     <path d="M${cx - 8.5} 45a8.5 9 0 0 0 17 0Z" fill="#2A2531"/>`

  if (kind === 0) return wide(33) + wide(67)
  if (kind === 1) return shut(33) + shut(67)
  if (kind === 2) return wide(33) + shut(67)
  return half(33) + half(67)
}

export const meta = {
  title: 'Squid',
  license: {name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/'}
}

export const create: Style<never>['create'] = ({prng}) => {
  // The first value out of the generator tracks the seed too closely to choose
  // a colour with; everything after it is well mixed.
  prng.next()
  const ink = INK[prng.integer(0, INK.length - 1)]!
  const deep = shade(ink, 0.22)
  const belly = shade(ink, -0.34)
  const curl = CURLS[prng.integer(0, CURLS.length - 1)]!
  const look = prng.integer(0, 3)
  // Percentages: bool takes 1..100, and a fraction here means never.
  const fins = prng.bool(75)
  const suckers = prng.bool(50)
  const spots = prng.bool(45)
  const width = prng.bool(50) ? 7.5 : 5.5

  return {
    attributes: {viewBox: '0 0 100 100', fill: 'none', 'shape-rendering': 'auto'},
    body: `
      ${Array.from({length: ARMS}, (_, i) => arm(i, curl, deep, width)).join('')}
      ${
        fins
          ? `<ellipse cx="20" cy="34" rx="11" ry="6.5" fill="#${deep}" transform="rotate(-24 20 34)"/>
             <ellipse cx="80" cy="34" rx="11" ry="6.5" fill="#${deep}" transform="rotate(24 80 34)"/>`
          : ''
      }
      <path d="M50 9c15.5 0 26 13.5 26 30v13c0 8.5-11 13-26 13s-26-4.5-26-13V39C24 22.5 34.5 9 50 9Z" fill="#${ink}"/>
      <path d="M50 58c-9 0-16-1.6-20-4.4V50c5 3 12 4.4 20 4.4S65 53 70 50v3.6C66 56.4 59 58 50 58Z" fill="#${belly}" opacity=".55"/>
      ${
        spots
          ? `<circle cx="34" cy="24" r="3" fill="#${belly}" opacity=".5"/>
             <circle cx="50" cy="18.5" r="2.4" fill="#${belly}" opacity=".5"/>
             <circle cx="65" cy="24" r="3" fill="#${belly}" opacity=".5"/>`
          : ''
      }
      ${eyes(look, ink)}
      <path d="M46 59.5q4 4 8 0" stroke="#${shade(ink, 0.5)}" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${
        suckers
          ? `<g fill="#${belly}" opacity=".75">
               <circle cx="42" cy="72" r="1.7"/><circle cx="42" cy="79" r="1.7"/>
               <circle cx="58" cy="72" r="1.7"/><circle cx="58" cy="79" r="1.7"/>
             </g>`
          : ''
      }
    `
  }
}
