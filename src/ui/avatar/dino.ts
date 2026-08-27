import type {Style} from '@dicebear/core'
import {shade} from './tint'

/** A dinosaur drawn from parts, in the shape DiceBear expects of a style. */

const HIDE = ['5FA85C', '3E8C7E', '4E7FC4', 'D2703C', 'C4566B', '8A6FB0', 'C9A24B', '6E7A6A']

const ACCENT = ['E9B44C', 'E3705F', '5FBFA8', '9C7BD0', 'D9D2C2']

type Crest = 'plates' | 'horns' | 'frill' | 'fringe'
const CRESTS: Crest[] = ['plates', 'horns', 'frill', 'fringe']

/**
 * Drawn before the skull, so every crest stands behind the head. Each clears the
 * skull's own top edge at y=30 by a margin: one that only peeks over reads as hair.
 */
const crest = (kind: Crest, ridge: string, accent: string, bone: string) => {
  if (kind === 'plates') {
    return `<g fill="#${ridge}">
        <path d="M24 42 27 22 36 36Z"/>
        <path d="M34 36 38 14 47 31Z"/>
        <path d="M43 32 50 8 57 32Z"/>
        <path d="M66 36 62 14 53 31Z"/>
        <path d="M76 42 73 22 64 36Z"/>
      </g>
      <path d="M46 31 50 16 54 31Z" fill="#${accent}" opacity=".75"/>`
  }

  if (kind === 'horns') {
    return `<g fill="#${bone}">
        <path d="M30 41q-2-20 1-31q7 11 8 27Z"/>
        <path d="M70 41q2-20-1-31q-7 11-8 27Z"/>
      </g>`
  }

  if (kind === 'frill') {
    // Points rather than round bumps: a scalloped fan reads as curly hair.
    const rim = (a: number, out: number) =>
      [50 + Math.cos(a) * 36 * out, 42 + Math.sin(a) * 27 * out].map(n => n.toFixed(1)).join(' ')
    const points = Array.from({length: 9}, (_, i) => {
      const a = Math.PI * (1 + (i + 0.5) / 9)
      return `<path d="M${rim(a - 0.13, 0.98)} ${rim(a, 1.2)} ${rim(a + 0.13, 0.98)}Z"/>`
    }).join('')
    return `<g fill="#${ridge}">${points}<ellipse cx="50" cy="42" rx="36" ry="27"/></g>
      <ellipse cx="50" cy="43" rx="28" ry="20" fill="#${accent}" opacity=".55"/>`
  }

  // Out of the cheeks rather than the crown: a fourth shape sitting on top of the
  // skull reads as headwear beside the three that already do.
  const spike = (a: number) => {
    const at = (out: number, off: number) =>
      [50 + Math.cos(a + off) * 26 * out, 50 + Math.sin(a + off) * 20 * out]
        .map(n => n.toFixed(1))
        .join(' ')
    return `<path d="M${at(0.95, -0.17)} ${at(1.5, 0)} ${at(0.95, 0.17)}Z"/>`
  }
  const fringe = [2.45, 2.95, 3.45].flatMap(a => [spike(a), spike(Math.PI - a)]).join('')
  return `<g fill="#${ridge}">${fringe}</g>`
}

const eyes = (kind: number, hide: string) => {
  const line = `#${shade(hide, 0.62)}`
  /** A slit pupil: the one mark that keeps a round-cheeked head reptilian. */
  const open = (cx: number) =>
    `<ellipse cx="${cx}" cy="46" rx="5.2" ry="5.8" fill="#FFFDF6"/>
     <ellipse cx="${cx}" cy="46.4" rx="2.2" ry="4" fill="#2A2531"/>
     <circle cx="${cx + 1.9}" cy="43.6" r="1.4" fill="#FFFFFF"/>`
  const shut = (cx: number) =>
    `<path d="M${cx - 5.2} 46q5.2 5 10.4 0" stroke="${line}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`
  const half = (cx: number) =>
    `<ellipse cx="${cx}" cy="46" rx="5.2" ry="5.8" fill="#FFFDF6"/>
     <path d="M${cx - 5.2} 46a5.2 5.8 0 0 0 10.4 0Z" fill="#2A2531"/>`

  if (kind === 0) return open(36) + open(64)
  if (kind === 1) return shut(36) + shut(64)
  if (kind === 2) return open(36) + shut(64)
  return half(36) + half(64)
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
  const teeth = prng.bool(60)
  const spots = prng.bool(45)
  const stripes = prng.bool(40)
  const brows = prng.bool(35)

  return {
    attributes: {viewBox: '0 0 100 100', fill: 'none', 'shape-rendering': 'auto'},
    body: `
      <path d="M16 100c0-14 15-24 34-24s34 10 34 24Z" fill="#${deep}"/>
      ${crest(kind, ridge, accent, bone)}
      <ellipse cx="50" cy="50" rx="26" ry="20" fill="#${hide}"/>
      <path d="M33 54h34v18q0 12-17 12t-17-12Z" fill="#${hide}"/>
      <path d="M37 68h26q0 14-13 14t-13-14Z" fill="#${pale}" opacity=".5"/>
      ${
        spots
          ? `<g fill="#${deep}" opacity=".45">
               <circle cx="33" cy="56" r="2.8"/><circle cx="67" cy="56" r="2.8"/>
               <circle cx="50" cy="34" r="2.4"/>
             </g>`
          : ''
      }
      ${
        stripes
          ? `<g stroke="#${deep}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".4">
               <path d="M35 60h6"/><path d="M59 60h6"/>
               <path d="M35.5 66h5"/><path d="M59.5 66h5"/>
             </g>`
          : ''
      }
      ${eyes(look, hide)}
      ${
        brows
          ? `<path d="M30 39q6-4 12-1M70 39q-6-4-12-1" stroke="#${shade(hide, 0.42)}"
                   stroke-width="2.4" fill="none" stroke-linecap="round"/>`
          : ''
      }
      <path d="M36 72q14 7 28 0" stroke="#${shade(hide, 0.5)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      ${
        teeth
          ? `<g fill="#FFFDF6">
               <path d="M40.4 73.1l2.4 4.6 2.4-4.6Z"/>
               <path d="M47.6 73.6l2.4 4.8 2.4-4.8Z"/>
               <path d="M54.8 73.1l2.4 4.6 2.4-4.6Z"/>
             </g>`
          : ''
      }
      <ellipse cx="43.5" cy="61" rx="2.4" ry="1.8" fill="#2A2531" opacity=".85"/>
      <ellipse cx="56.5" cy="61" rx="2.4" ry="1.8" fill="#2A2531" opacity=".85"/>
    `
  }
}
