# 04 — The play screen fits the window

> Shipped with the measured variant this document offers as the fallback:
> `useBoardFit` in `src/ui/board/fit.ts`, a `ResizeObserver` on the board region.
> The CSS constraint-transfer version was not used — it could not be checked
> across the three engines from where the work was done.
>
> **Verified at 1424x865 only**, in a live four-player game: no scroll, with and
> without the spymaster band and the action row. The rest of the target matrix is
> unverified.

**Done when:** the play screen has no vertical scrollbar at 1920×1080, 1366×768,
2560×1440 and 820×1180, at every board size from 3×3 to 7×7, with and without the
spymaster band and the action row.

**Phones are not a target.** A screen that narrow needs a different play screen,
not a smaller version of this one, and that is [its own
problem](README.md#out-of-scope-phones). Below `sm` the layout should stay usable and is
allowed to scroll; nothing here should be contorted to prevent it.

### What is wrong

The board is sized by width alone and the page is `min-h-full`, so its height is
whatever falls out. `src/ui/screens/Game.tsx:96` says so plainly: a
viewport-height cap was removed because it left the board floating in the middle
of the page.

Every card is `aspect-[7/5]`, so at column count `n`, gap `g` and board width `W`:

```
H = (5/7)·W + (2/7)·(n − 1)·g
```

Which is 7:5 for the whole board plus a small gap correction — the board's shape
does not change with `n`, only its cell count does.

At 1920 wide: `W = min(1350, 1920) − 64 = 1286`, so `H ≈ 930`. Add `py-6` (48),
the 16px gap, and a HUD that runs about 100px on its own and about 160px once the
Lock in row appears, and the column asks for roughly 1160px of a viewport that
has about 940. That is the overflow, and it is worst for the player whose turn it
is — the one who needs the buttons.

### The fix: solve for height, not width

The page becomes a fixed-height column with a board region that takes what is
left:

```
main            h-full flex flex-col      (the 100% chain already exists in index.css)
  board region  flex-1 min-h-0 grid place-items-center
    board       h-full w-auto aspect-[7/5] max-w-full max-h-[calc(100%-Cpx)]
  hud           shrink-0
```

`C = (2/7)·(n − 1)·g`, the gap correction, computed where the grid gap is set.
With it, a height-bound board is exactly as tall as the space offered: the
wrapper is `100% − C`, transfers to `1.4·(100% − C)` wide, and the grid inside
comes back to `100%`. Without it the board overshoots by up to 11px at 5×5 and
22px at 7×7 — the difference between a scrollbar and no scrollbar.

An element with `aspect-ratio`, an auto width and a definite height transfers its
max-width constraint back to its height, so the wide-and-short case (an ultrawide
monitor, a 3×3 board) shrinks correctly with no second rule. **Verify that in all
three engines** with `npm run playtest -- --headless` and its per-player
screenshots; if any of them refuse to transfer the constraint, fall back to a
`ResizeObserver` on the board region setting the width to
`min(availW, availH·1.4 − C)`, which is fifteen lines and cannot be argued with.

### The HUD gives ground first

Below about 760px of viewport height the HUD compacts, because a board that has
stopped being readable is a worse loss than a smaller score:

| | Tall | Short |
|---|---|---|
| Score digits | `text-4xl` | `text-2xl` |
| `Bulbs` under each score | shown | hidden |
| Panel padding | `px-4 py-3` | `px-3 py-1.5` |
| Clue word | `text-3xl` | `text-xl` |
| Team rosters (7), only when they fall back into the HUD | 26px avatars | 18px avatars, still shown |
| Gap, board to HUD | `gap-4` | `gap-2` |

Driven by one `@media (max-height: 760px)` block in `src/index.css`, next to the
existing accessibility overrides, not by JS.

### Everything else that runs off the edge

- **The rail** (`src/ui/Rail.tsx`) is `fixed bottom-4 left-4` and lands on top of
  the HUD's action row under about 700px of width. Below `sm` the HUD column gets
  `pb-14` so the two never share a row — a one-line courtesy to a size that is
  not a target, not the start of a phone layout.
- **The waiting room** is `lg:grid-cols-[1fr_23rem]` over `sm:grid-cols-3`
  columns, so between 1024 and 1180px the three roster columns are about 200px
  wide and the dossier cards clip. Move the settings-panel split to `xl` and let
  the roster fall to two columns between `sm` and `lg`. With the spectator column
  (3) this becomes `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
- **The spymaster band** is 1.5rem of the page and is already subtracted
  (`Game.tsx:100`). Keep it, expressed as a `--band` custom property, so the
  column height is one calculation rather than two conditional classes.
- **`GameOver`** is `py-16` around a fixed panel and overflows below about 700px
  tall — which is where item 6 lands anyway. Its padding becomes `py-8 sm:py-16`.

### Target matrix

| Viewport | Board | Result |
|---|---|---|
| 1920×1080 | 5×5 | board about 980px wide, no scroll, action row visible |
| 1366×768 | 5×5 | height-bound board, compact HUD |
| 2560×1440 | 7×7 | width-bound at the 1350px cap, unchanged from today |
| 820×1180 | 5×5 | width-bound, tall HUD |
| 390×844 | 5×5 | out of scope — usable, allowed to scroll |
