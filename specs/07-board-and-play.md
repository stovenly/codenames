# 07 — Board and play

**Depends on:** [04](04-game-core.md), [06](06-configuration.md).
**Done when:** a game is playable end to end and feels good. The largest step and
the point of the project.

Build committed selection and the reveal choreography first — they carry the
feel. Everything else here decorates them.

## The lagging cursor

Presentation runs on its own cursor, behind the authoritative one. The host
decides an outcome the moment the intent lands and broadcasts it; a client-side
theatre store holds `shownCursor` and walks it forward one step at a time,
playing a sequence per step before letting the next one through. Every client
plays the same sequence, so the room reacts together.

This is the mechanism the whole feel rests on. It cannot change what happened —
it only decides how long everyone waits to see it. Two rules keep it honest:

- **It never blocks input the host would accept.** Controls are disabled during
  a sequence because acting mid-reveal is confusing, not because the host would
  refuse.
- **It never replays history.** More than two steps behind — a rejoin, a
  jump, a burst after a reconnect — and it snaps to the truth with no animation.

## Card anatomy

Each card is a physical tile: subtle paper grain, inner bevel, a 1px warm rim, a
soft drop shadow that grows with elevation. The word is set in Display,
uppercase, centred, auto-fitting via container queries.

| State | Treatment |
|---|---|
| Idle | Flat, resting shadow |
| Hover | Lifts 4px, spotlight follows cursor, tile tilts up to 6deg toward it |
| Armed | Pushes forward, an accent ring closes around it over 250ms |
| Marked | Teammate avatar chips stack in the corner |
| Revealed | Colour wash plus stamp, elevation drops to zero |
| Disabled | Desaturated, no pointer response |

Team identity on a revealed card carries a glyph and a pattern fill as well as
colour, per [01](01-foundations.md#accessibility-baseline).

## Committed selection

The centrepiece interaction. Three stages, not one:

1. **Hover** — the tile lifts and lights.
2. **Arm** — first click. The ring closes, and *every other player sees your
   avatar land on that card immediately.* Any teammate can arm any card; markers
   stack.
3. **Confirm** — second click on the same card, or the Confirm button in the HUD.
   The wind-up below fires.

Three jobs at once: it gives the choice weight, it eliminates the misclick that
ruins online Codenames, and the visible markers restore the social pressure the
tabletop game has and web versions usually lose.

Arm markers are `presence`, not steps — ephemeral, never in history, cleared on
turn change.

Keyboard equivalent: arrow keys to move, Enter to arm, Enter again to confirm,
Escape to disarm.

## Reveal choreography

The centrepiece. A confirmed guess is a lever pull on a slot machine, not a
click on a link, and the room should feel the pause before the payoff. Three
acts, 1.5s of dread and about 0.5s of resolution.

**Act one — the wind-up, 1500ms.** The lever lands: a low thunk under a
mechanical clack. The chosen card lifts out of the grid, gains a brass ring and
a hard drop shadow, and everything behind it drops to 28% saturation and 42%
brightness with a warm spotlight closing around the card. The card's face then
*scrubs*: it cycles red, bystander, blue, assassin, faster than the eye can
settle, with a detent click on each change and a sawtooth riser climbing under
it through a sweeping lowpass. The cycle decelerates on a `p^2.4` curve — gaps
grow from 42ms to about 300ms — so the last few colours land one at a time and
everyone leans in. Nothing about the sequence is random: the outcome was decided
before it started.

**Act two — the landing, 520ms.** The reel stops on the truth. A colour wash
sweeps outward as a circular clip from the centre, the rubber stamp drops in
rotated with a stiff overshoot, and a filtered noise burst lands with it.

**Act three — the payoff.** By outcome:

- **Correct** — a 24-shard burst in the team colour, a full-screen breath of the
  same colour behind the board, a four-note rising chime pitched to the team,
  and the score tile rolls over. 700ms.
- **Neutral or other team** — the card slumps and desaturates, a dull two-tone
  thud, and the turn band queues behind it. 950ms, longer than a correct guess
  because disappointment needs room.
- **Assassin** — a full takeover. A red vignette pulses from the edges four
  times over 2.2 seconds, a two-tone siren with a noise bed runs underneath,
  ASSASSIN slams in oversized and rotated, and it *holds* before the game-over
  screen. It should be genuinely alarming.

The game-over screen is the jackpot: a continuous confetti fall in the winner's
colour plus brass, the result stamped in with a spring, and a six-note fanfare
for the winners or a four-note descent for the losers.

**Under `prefers-reduced-motion` all of it collapses.** No scrub, no particles,
no confetti, no takeover pulse: every act cuts to 90-400ms and the card simply
changes colour. The sound stays, because muting is a separate control.

## Clue delivery

When a spymaster submits, the clue takes the whole screen before it docks:

- the word types in, mono, with a cursor
- the number stamps down beside it with a counter tick
- 1.5s hold, then it flies to its resting place in the HUD

Every player sees this. It is the gameshow beat of the round.

## Turn transitions

A full-width diagonal band sweeps across in the incoming team's colour, team name
in Display, 700ms, with a lighting sweep across the board behind it.

## Timers

A thin arc around the HUD with a mono readout in its centre. Under 10s it shifts
brass to red and pulses once per second with a matching tick; the last three
seconds get a stronger beat. Rendered against `deadline` with the clock offset
from [04](04-game-core.md#timers) — clients display, they never expire.

## Spymaster view

Deliberately, unmistakably different chrome — you should never be confused about
which view you are looking at:

- key colours as 30% tints with an agent glyph per team
- an **EYES ONLY** band top and bottom in diagonal hazard stripes
- a persistent low-opacity watermark, so a screenshot or an accidental screen
  share is obviously a spymaster screen
- the clue composer replaces the guess controls

## Sound

Synthesized with WebAudio — no audio assets, no download weight. Hover tick, arm
click, confirm thunk, per-team correct chime, wrong-card thud, assassin siren,
timer tick, turn fanfare.

On by default with a prominent mute in the HUD, persisted to `localStorage`.
Browsers block audio until first interaction anyway, and by then the player has
clicked to join.

## Rendering performance

Up to 49 animated tiles. Two rules keep it smooth:

- animate `transform` and `opacity` only; apply `will-change` on hover entry and
  remove it on exit, never leave it on
- memoize cards on `(word, revealed, armed, markers)`, so a state broadcast
  re-renders only the tiles that changed

## Responsive

The board is a CSS grid at `min(92vw, 78vh)`, cards scale type with container
queries. At 7x7 on a phone, words wrap to two lines and tap targets hold at 40px
minimum. The page never scrolls horizontally.
