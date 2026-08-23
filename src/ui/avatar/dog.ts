import type {Style} from '@dicebear/core'
import {shade} from './tint'

/** A dog drawn from parts, in the shape DiceBear expects of a style. */

const COAT = ['E8C88F', 'D89A4E', 'A9702F', '6B4426', 'EFE7DA', 'B9BEC8', '4A4652', 'E0A882']

const COLLAR = ['C8434F', '3F7FD0', '3E9E72', 'D08A2C', '8B5BC4']

/** Left ear then right, as a shape and how far it swings from the skull. */
type Ears = 'drop' | 'long' | 'perk' | 'round'
const EARS: Ears[] = ['drop', 'long', 'perk', 'round']

const ear = (side: -1 | 1, kind: Ears, coat: string, inner: string) => {
  const flip = side === -1 ? '' : ` transform="scale(-1 1) translate(-100 0)"`
  const at = 50 - 24

  if (kind === 'perk') {
    return `<g${flip}><path d="M${at - 3} 52 L${at - 9} 22q10 4 16 16Z" fill="#${coat}"/>
      <path d="M${at - 2.5} 47 L${at - 6.5} 30q5.5 3.5 9 11Z" fill="#${inner}"/></g>`
  }
  if (kind === 'long') {
    return `<g${flip}><rect x="${at - 15}" y="34" width="16" height="46" rx="8" fill="#${coat}" transform="rotate(-10 ${at - 7} 40)"/></g>`
  }
  if (kind === 'round') {
    return `<g${flip}><ellipse cx="${at - 4}" cy="41" rx="9" ry="10" fill="#${coat}"/></g>`
  }
  return `<g${flip}><path d="M${at + 4} 40q-17 1-18 14t9 17q9 2 10-11Z" fill="#${coat}"/></g>`
}

const eyes = (kind: number, coat: string) => {
  const line = `#${shade(coat, 0.7)}`
  const open = (cx: number) =>
    `<ellipse cx="${cx}" cy="55" rx="4.6" ry="5.2" fill="#2A2531"/>
     <circle cx="${cx + 1.6}" cy="53" r="1.5" fill="#FFFFFF" opacity=".92"/>`
  const shut = (cx: number) =>
    `<path d="M${cx - 5} 55q5 5 10 0" stroke="${line}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
  const up = (cx: number) => `<path d="M${cx - 5} 57q5-6 10 0" fill="#2A2531"/>`

  if (kind === 0) return open(38) + open(62)
  if (kind === 1) return shut(38) + shut(62)
  if (kind === 2) return open(38) + shut(62)
  return up(38) + up(62)
}

export const meta = {
  title: 'Dog',
  license: {name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/'}
}

export const create: Style<never>['create'] = ({prng}) => {
  // The first value out of the generator tracks the seed too closely to choose
  // a colour with; everything after it is well mixed.
  prng.next()
  const coat = COAT[prng.integer(0, COAT.length - 1)]!
  const inner = shade(coat, -0.15)
  const snout = shade(coat, -0.4)
  const kind = EARS[prng.integer(0, EARS.length - 1)]!
  const look = prng.integer(0, 3)
  // Percentages: bool takes 1..100, and a fraction here means never.
  const tongue = prng.bool(50)
  const patch = prng.bool(40)
  const collar = prng.bool(55) ? COLLAR[prng.integer(0, COLLAR.length - 1)]! : null
  const brows = prng.bool(35)

  return {
    attributes: {viewBox: '0 0 100 100', fill: 'none', 'shape-rendering': 'auto'},
    body: `
      <path d="M18 100c0-13 14.4-22 32-22s32 9 32 22Z" fill="#${shade(coat, 0.18)}"/>
      ${collar ? `<path d="M23 84q27 10 54 0v7q-27 10-54 0Z" fill="#${collar}"/>` : ''}
      ${ear(-1, kind, shade(coat, 0.1), inner)}
      ${ear(1, kind, shade(coat, 0.1), inner)}
      <ellipse cx="50" cy="58" rx="27" ry="24" fill="#${coat}"/>
      ${patch ? `<ellipse cx="38" cy="54" rx="11" ry="10.5" fill="#${shade(coat, 0.3)}"/>` : ''}
      <ellipse cx="50" cy="70" rx="16" ry="11" fill="#${snout}"/>
      ${eyes(look, coat)}
      ${
        brows
          ? `<path d="M33 46q5-3 10-1M67 46q-5-3-10-1" stroke="#${shade(coat, 0.45)}" stroke-width="2" fill="none" stroke-linecap="round"/>`
          : ''
      }
      ${tongue ? `<path d="M44 74h12v7a6 6 0 0 1-12 0Z" fill="#E8798C"/>` : ''}
      <ellipse cx="50" cy="66" rx="6" ry="4.6" fill="#2A2531"/>
      <path d="M50 70v3M50 73q-4 3.6-7.5 0M50 73q4 3.6 7.5 0"
            stroke="#2A2531" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    `
  }
}
