# 07 — Board and play

**Depends on:** [04](04-game-core.md), [06](06-configuration.md).
**Done when:** a game is playable end to end and feels good. The largest step and
the point of the project.

Build committed selection and the reveal choreography first — they carry the
feel. Everything else here decorates them.

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
   A 400ms wind-up, then the reveal fires.

Three jobs at once: it gives the choice weight, it eliminates the misclick that
ruins online Codenames, and the visible markers restore the social pressure the
tabletop game has and web versions usually lose.

Arm markers are `presence`, not steps — ephemeral, never in history, cleared on
turn change.

Keyboard equivalent: arrow keys to move, Enter to arm, Enter again to confirm,
Escape to disarm.

## Reveal choreography

1. 120ms anticipation, the card scales to 0.96
2. a colour wash sweeps outward from the click point
3. a rotated rubber stamp lands with a slight overshoot

Then by outcome:

- **Correct** — particle burst in the team colour, the board breathes once, a
  chime pitched to the team
- **Neutral or other team** — the card slumps and desaturates, the turn banner
  queues behind it
- **Assassin** — a full takeover. Everything desaturates except the card, a red
  vignette pulses from the edges, siren, a two-second hold before the game-over
  screen. It should be genuinely alarming

Particles cap at 24 and are skipped entirely under `prefers-reduced-motion`.

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
