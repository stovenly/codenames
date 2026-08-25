# 06 — The full board on the end screen

> Shipped: `src/ui/board/FinalBoard.tsx` and a toggle on the end screen.
> **Not seen in a browser** — the playtest that would have reached a finished game
> exited first. It typechecks and the view it renders is unit tested.

**Done when:** anyone on the game-over screen can see every card's true colour,
including the ones nobody turned over.

### Why

The end screen names a winner and a score and then throws away the one thing
everybody wants at that moment: what the cards they never touched actually were.
The information is already in hand — `view.cards` carries `colour` for all of
them, revealed or not — and nothing currently renders it.

### The reveal

A **See the board** toggle in the result panel, under the score and above **Play
again**. Open by default on wide screens, closed below `lg` where it would push
the winner off the top.

A new `src/ui/board/FinalBoard.tsx`, not a reuse of `Card.tsx`. `Card` is a
memoised animation surface whose whole vocabulary — spent cards at 0.25 opacity,
sheen, marks, reels, stamps — is about a live board, and the branching needed to
make it also be a static key is larger than the static key. `FinalBoard` shares
what matters: `SURFACE`, `INK`, `STAMP` and `Symbol` from
`src/ui/board/symbols.tsx`, so the colours are the same colours.

Every cell, at the same `aspect-[7/5]` and the same `size` columns as the live
grid:

| Card | Drawn as |
|---|---|
| Turned over in play | full-strength face, its word in `INK`, symbol in the corner |
| Never turned over | the same face at 55% with a dashed border — visibly a card nobody found |
| The assassin | its skull at full strength, whether or not anybody hit it |

Each turned card carries the avatar of whoever turned it, small, in the corner
the marks used to occupy. The round history already records who did what
(`src/game/log.ts`); this is the same fact laid out spatially.

Above the grid, one line — `Red found 6 of 9 · Blue found 8 of 8` — from
`view.totals` and `view.remaining`, which reads correctly whether or not the two
teams were the same size (item 5).

No motion, no interaction, no memo. It renders once.

### Layout

On `lg` and up the panel and the board sit side by side, board left, result
right, the pair centred; the confetti canvas and the winner wash are `fixed` and
unaffected. Below `lg` the board goes under the panel, inside the toggle.
Combined with item 4's `py-8 sm:py-16`, the closed state still fits a 768px-tall
window.

### Files

`src/ui/board/FinalBoard.tsx` (new), `src/ui/screens/GameOver.tsx`. The `view` it
needs is the one `GameOver` already receives.
