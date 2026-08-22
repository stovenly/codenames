import type {Colour} from './board'
import {derive} from './reducer'
import type {Settings} from './settings'
import type {Step} from './steps'
import type {Player, PlayerId, Team} from './types'

export type Accolade = {
  id: string
  title: string
  detail: string
  who: PlayerId
  weight: number
  /** Earliest step it can be pinned to, so ties go to the moment rather than the alphabet. */
  at: number
}

type Tally = {
  picks: number
  correct: number
  wrong: number
  neutral: number
  gifts: number
  assassin: number
  clues: number
  clueYield: number
  bestClue: number
  biggestCount: number
  passes: number
  first: number
}

const blank = (): Tally => ({
  picks: 0,
  correct: 0,
  wrong: 0,
  neutral: 0,
  gifts: 0,
  assassin: 0,
  clues: 0,
  clueYield: 0,
  bestClue: 0,
  biggestCount: 0,
  passes: 0,
  first: Number.MAX_SAFE_INTEGER
})

/** The player with the most of something, or null when nobody did it at all. */
const leader = (tallies: Map<PlayerId, Tally>, of: (t: Tally) => number) => {
  let best: {who: PlayerId; n: number; at: number} | null = null
  for (const [who, tally] of tallies) {
    const n = of(tally)
    if (n <= 0) continue
    if (!best || n > best.n || (n === best.n && tally.first < best.at)) {
      best = {who, n, at: tally.first}
    }
  }
  return best
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * What the table will want to argue about. Every entry is a pure function of
 * the steps and the board, so everyone is handed the same four.
 *
 * Weights rank interest, not merit: picking the assassin is the only thing
 * anyone will remember, so it outranks every competent thing that happened.
 */
export const catalogue = (
  settings: Settings,
  words: string[],
  steps: Step[],
  players: Player[]
): Accolade[] => {
  const view = derive(settings, words, steps, steps.length)
  const seated = players.filter(p => p.team)
  // A game nobody got to play has nothing to recognise, and a row of cards
  // saying so is worse than no row.
  if (!seated.length || !steps.some(s => s.t === 'guess')) return []

  const tallies = new Map<PlayerId, Tally>(seated.map(p => [p.id, blank()]))
  const of = (id: PlayerId) => {
    const hit = tallies.get(id)
    if (hit) return hit
    const made = blank()
    tallies.set(id, made)
    return made
  }

  type Moment = {who: PlayerId; at: number}
  // Collected rather than assigned: a `let` written only inside a callback is
  // still `null` as far as the checker is concerned once the loop is over.
  const assassinPicks: Moment[] = []
  const closers: Moment[] = []
  let clueOwner: PlayerId | null = null
  /** Correct picks made off the clue currently standing, per guesser. */
  const run = new Map<PlayerId, number>()

  const settle = () => {
    let total = 0
    for (const [who, n] of run) {
      total += n
      const t = of(who)
      t.bestClue = Math.max(t.bestClue, n)
    }
    if (clueOwner) of(clueOwner).clueYield += total
    run.clear()
  }

  steps.forEach((step, i) => {
    if (step.t === 'clue') {
      settle()
      clueOwner = step.by
      const t = of(step.by)
      t.clues++
      t.first = Math.min(t.first, i)
      if (typeof step.count === 'number') t.biggestCount = Math.max(t.biggestCount, step.count)
      return
    }

    if (step.t === 'endTurn') {
      settle()
      clueOwner = null
      if (step.reason === 'pass' && step.by) {
        const t = of(step.by)
        t.passes++
        t.first = Math.min(t.first, i)
      }
      return
    }

    if (step.t !== 'guess') return

    const colour: Colour = view.cards[step.card]?.colour ?? 'neutral'
    const t = of(step.by)
    t.picks++
    t.first = Math.min(t.first, i)

    if (colour === 'assassin') {
      t.assassin++
      assassinPicks.push({who: step.by, at: i})
      return
    }
    if (colour === step.team) {
      t.correct++
      run.set(step.by, (run.get(step.by) ?? 0) + 1)
      if (steps[i + 1]?.t === 'end') closers.push({who: step.by, at: i})
      return
    }
    t.wrong++
    if (colour === 'neutral') t.neutral++
    else t.gifts++
  })
  settle()

  const out: Accolade[] = []
  const add = (
    id: string,
    title: string,
    detail: string,
    hit: {who: PlayerId; n: number; at: number} | null,
    weight: number
  ) => {
    if (hit) out.push({id, title, detail, who: hit.who, weight, at: hit.at})
  }

  const assassin = assassinPicks[0]
  if (assassin) {
    out.push({
      id: 'assassin',
      title: 'Saboteur',
      detail: 'found the assassin',
      who: assassin.who,
      weight: 100,
      at: assassin.at
    })
  }

  const closer = closers[0]
  if (closer) {
    out.push({
      id: 'closer',
      title: 'Closer',
      detail: 'picked the winning card',
      who: closer.who,
      weight: 70,
      at: closer.at
    })
  }

  const mind = leader(tallies, t => (t.bestClue >= 3 ? t.bestClue : 0))
  add('mind', 'Mind Reader', mind ? `${plural(mind.n, 'card')} off one clue` : '', mind, 62)

  const sharp = leader(tallies, t => (t.wrong === 0 && t.assassin === 0 && t.correct >= 2 ? t.correct : 0))
  add('sharp', 'Sharpshooter', sharp ? `${plural(sharp.n, 'pick')}, none wasted` : '', sharp, 60)

  const smith = leader(tallies, t => (t.clues > 0 ? t.clueYield : 0))
  add('smith', 'Wordsmith', smith ? `${plural(smith.n, 'card')} from their clues` : '', smith, 55)

  const gift = leader(tallies, t => t.gifts)
  add('gift', 'Gift Horse', gift ? `${plural(gift.n, 'card')} to the other side` : '', gift, 52)

  const butter = leader(tallies, t => t.wrong)
  add('butter', 'Butterfingers', butter ? plural(butter.n, 'wrong pick') : '', butter, 50)

  const bystand = leader(tallies, t => t.neutral)
  add('bystand', 'Civilian Liaison', bystand ? `${plural(bystand.n, 'innocent')} disturbed` : '', bystand, 45)

  const trigger = leader(tallies, t => (t.picks >= 3 ? t.picks : 0))
  add('trigger', 'Trigger Happy', trigger ? plural(trigger.n, 'card') + ' touched' : '', trigger, 35)

  const talker = leader(tallies, t => (t.biggestCount >= 3 ? t.biggestCount : 0))
  add('talker', 'Big Talker', talker ? `promised ${talker.n} on one clue` : '', talker, 34)

  const cold = leader(tallies, t => t.passes)
  add('cold', 'Cold Feet', cold ? plural(cold.n, 'turn') + ' handed back' : '', cold, 33)

  out.push(...teamLeaders(seated, tallies))

  const idle = seated
    .filter(p => !p.spymaster && (tallies.get(p.id)?.picks ?? 0) === 0)
    .map(p => ({who: p.id, n: 1, at: Number.MAX_SAFE_INTEGER}))[0]
  add('idle', 'Passenger', 'never touched a card', idle ?? null, 30)

  return out
}

/** What the end screen deals: the four most interesting of the above. */
export const accolades = (
  settings: Settings,
  words: string[],
  steps: Step[],
  players: Player[]
): Accolade[] => pick(catalogue(settings, words, steps, players), 4)

/**
 * Carrying a team, weighted by how much there was to carry.
 *
 * Share alone will not do it: on a two-guesser side, 95% is one person being
 * keen, while on a four-guesser side it is one person running the team. So the
 * share is measured against what an equal split would have been —
 * (share - 1/n) / (1 - 1/n) — and then multiplied by (n - 1), the number of
 * people they are effectively covering for. Two guessers can reach 1; four can
 * reach 3, which is the "way more leadership" the difference should carry.
 *
 * Sides with fewer than three guessers are not eligible at all: with one there
 * is nothing to lead, and with two it is a coin toss dressed as a trend.
 */
const MIN_GUESSERS = 3
const MIN_ACTIONS = 4

const teamLeaders = (seated: Player[], tallies: Map<PlayerId, Tally>): Accolade[] => {
  const out: Accolade[] = []

  for (const team of ['red', 'blue'] as Team[]) {
    const guessers = seated.filter(p => p.team === team && !p.spymaster)
    if (guessers.length < MIN_GUESSERS) continue

    const acted = (id: PlayerId) => {
      const t = tallies.get(id)
      return t ? t.picks + t.passes : 0
    }
    const total = guessers.reduce((n, p) => n + acted(p.id), 0)
    if (total < MIN_ACTIONS) continue

    const top = guessers
      .map(p => ({who: p.id, n: acted(p.id), at: tallies.get(p.id)?.first ?? 0}))
      .sort((a, b) => b.n - a.n || a.at - b.at)[0]
    if (!top || top.n * 2 <= total) continue

    const n = guessers.length
    const share = top.n / total
    const lead = (share - 1 / n) / (1 - 1 / n)
    if (lead <= 0) continue

    out.push({
      id: `leader-${team}`,
      title: 'Team Leader',
      detail: `${Math.round(share * 100)}% of their team's moves`,
      who: top.who,
      weight: Math.min(72, 34 + 12 * lead * (n - 1)),
      at: top.at
    })
  }

  return out
}

/** Highest weight first, and one card each while there are people left to name. */
const pick = (all: Accolade[], limit: number): Accolade[] => {
  const ranked = [...all].sort((a, b) => b.weight - a.weight || a.at - b.at)
  const taken: Accolade[] = []
  const named = new Set<PlayerId>()

  for (const one of ranked) {
    if (taken.length === limit) break
    if (named.has(one.who)) continue
    taken.push(one)
    named.add(one.who)
  }
  for (const one of ranked) {
    if (taken.length === limit) break
    if (taken.includes(one)) continue
    taken.push(one)
  }
  return taken.sort((a, b) => b.weight - a.weight)
}
