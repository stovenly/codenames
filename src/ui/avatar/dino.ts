import type {Style} from '@dicebear/core'
import {shade} from './tint'

/** A dinosaur in profile, drawn from parts, in the shape DiceBear expects. */

const HIDE = ['5FA85C', '3E8C7E', '4E7FC4', 'D2703C', 'C4566B', '8A6FB0', 'C9A24B', '6E7A6A']

const ACCENT = ['E9B44C', 'E3705F', '5FBFA8', '9C7BD0', 'D9D2C2']

type Crest = 'plates' | 'horns' | 'sail' | 'shield'
const CRESTS: Crest[] = ['plates', 'horns', 'sail', 'shield']

/**
 * Drawn before the head, so each crest is clipped to whatever rises above the
 * skull's own outline and its base never has to meet anything.
 */
const crest = (kind: Crest, ridge: string, accent: string, bone: string) => {
  if (kind === 'plates') {
    return `<g fill="#${ridge}">
        <path d="M62 30 60 14 50 28Z"/>
        <path d="M48 32 42 16 32 32Z"/>
        <path d="M32 38 22 26 18 42Z"/>
        <path d="M20 50 8 44 8 58Z"/>
      </g>`
  }

  // One over the snout and one over the eye, at different heights and opposite
  // rakes. Matched horns side by side on the crown read as a pair of ears.
  if (kind === 'horns') {
    return `<g fill="#${bone}">
        <path d="M80 46 89 25 93 47Z"/>
        <path d="M51 38 43 15 61 33Z"/>
      </g>`
  }

  // Rooted along the whole neck rather than standing on a stalk. Every lobe
  // rising off the skull, at any thickness, read as a floppy ear.
  if (kind === 'sail') {
    return `<path d="M46 44C40 16 29 7 18 11C6 16 5 43 9 68C18 59 32 50 46 44Z" fill="#${ridge}"/>
      <g stroke="#${accent}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".5">
        <path d="M30 48 24 20"/><path d="M21 54 14 28"/><path d="M14 61 9 44"/>
      </g>`
  }

  // A fan pinned to the back of the skull rather than floating over it: the
  // centre sits inside the head, so only the rim past the outline shows.
  const pt = (a: number, out: number) =>
    [38 + Math.cos(a) * 36 * out, 46 + Math.sin(a) * 32 * out].map(n => n.toFixed(1)).join(' ')
  const points = Array.from({length: 6}, (_, i) => {
    const a = 3.15 + (1.95 * (i + 0.5)) / 6
    return `<path d="M${pt(a - 0.15, 0.97)} ${pt(a, 1.17)} ${pt(a + 0.15, 0.97)}Z"/>`
  }).join('')
  const fan = Array.from({length: 13}, (_, i) => pt(3.15 + (1.95 * i) / 12, 1)).join(' L')
  return `<g fill="#${ridge}">${points}<path d="M38 46 L${fan}Z"/></g>
    <path d="M38 46 L${Array.from({length: 13}, (_, i) => pt(3.15 + (1.95 * i) / 12, 0.72)).join(' L')}Z"
          fill="#${accent}" opacity=".45"/>`
}

const eye = (kind: number, hide: string) => {
  const line = `#${shade(hide, 0.62)}`
  if (kind === 1)
    return `<path d="M52 42q5 5 10 0" stroke="${line}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
  if (kind === 2)
    return `<ellipse cx="57" cy="42" rx="5" ry="5.6" fill="#FFFDF6"/>
      <path d="M52 42a5 5.6 0 0 0 10 0Z" fill="#2A2531"/>`
  const slit = kind === 3 ? 'rx="1.6" ry="4"' : 'rx="2.4" ry="3.6"'
  return `<ellipse cx="57" cy="42" rx="5" ry="5.6" fill="#FFFDF6"/>
    <ellipse cx="57.6" cy="42.2" ${slit} fill="#2A2531"/>
    <circle cx="55.6" cy="39.6" r="1.3" fill="#FFFFFF"/>`
}

export const meta = {
  title: 'Dino',
  license: {name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/'}
}

export const create: Style<never>['create'] = ({prng}) => {
  // The first value out of the generator tracks the seed too closely to choose
  // a colour with; everything after it is well mixed.
  prng.next()
  const hide = HIDE[prng.integer(0, HIDE.length - 1)]!
  const accent = ACCENT[prng.integer(0, ACCENT.length - 1)]!
  const deep = shade(hide, 0.2)
  const pale = shade(hide, -0.34)
  const ridge = shade(hide, 0.34)
  const bone = shade(hide, -0.62)
  const kind = CRESTS[prng.integer(0, CRESTS.length - 1)]!
  const look = prng.integer(0, 3)
  // Percentages: bool takes 1..100, and a fraction here means never.
  const gape = prng.bool(45)
  const teeth = prng.bool(70)
  const spots = prng.bool(45)
  const stripes = prng.bool(40)

  // The jaw pivots at the hinge, so shut and open are one shape at two angles.
  const jaw = `<g transform="rotate(${gape ? 15 : 0} 40 54)">
      <path d="M40 54 94 54q3 4 0 7l-8 3-34 4q-12 0-12-8Z" fill="#${pale}"/>
    </g>`

  return {
    attributes: {viewBox: '0 0 100 100', fill: 'none', 'shape-rendering': 'auto'},
    body: `
      <path d="M52 52q-24 8-30 50" stroke="#${deep}" stroke-width="34" fill="none" stroke-linecap="round"/>
      ${crest(kind, ridge, accent, bone)}
      ${gape ? `<path d="M42 53 95 53l-4 15-49-5Z" fill="#4A2432"/>` : ''}
      ${jaw}
      <path d="M30 54q0-20 18-24q16-4 26 6l16 8q7 3 7 7l-1 3L40 54q-10 0-10-8Z" fill="#${hide}"/>
      ${
        spots
          ? `<g fill="#${deep}" opacity=".45">
               <circle cx="44" cy="38" r="3"/><circle cx="52" cy="32" r="2.4"/>
               <circle cx="36" cy="46" r="2.6"/>
             </g>`
          : ''
      }
      ${
        stripes
          ? `<g stroke="#${deep}" stroke-width="2.8" stroke-linecap="round" fill="none" opacity=".4">
               <path d="M70 40l-2 8"/><path d="M78 43l-2 7"/>
             </g>`
          : ''
      }
      ${
        teeth
          ? `<g fill="#FFFDF6">
               <path d="M62 54l2.2 5.4 2.2-5.4Z"/>
               <path d="M72 54l2.2 5.4 2.2-5.4Z"/>
               <path d="M82 54l2 5 2-5Z"/>
             </g>`
          : ''
      }
      ${eye(look, hide)}
      <path d="M50 34q8-3 14 1" stroke="#${shade(hide, 0.42)}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="88" cy="47" rx="2.4" ry="1.8" fill="#2A2531" opacity=".8"/>
    `
  }
}
