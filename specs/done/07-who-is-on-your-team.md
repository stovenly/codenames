# 07 — Who is on your team, while you play

> Shipped, with the measurement lifted into `Game` rather than the board measuring
> itself: the gutter decision needs the same number. The flanks are absolutely
> positioned, so a roster can never take width off the board it is measured
> against. Verified live at 1424x865, names shown.
>
> **Since, from playing it:**
>
> - **One threshold oscillates.** Folding the rosters into the HUD makes it
>   taller, which shrinks the board, which widens the gutter they were folded
>   away for. At the boundary it flickered between the two placements every
>   frame. There are two thresholds now — into the gutters at 88px, back into
>   the HUD below 56px — and the band is wider than the ~21px of gutter that
>   switching costs, so wherever it lands it stays.
> - **The faces are square**, not circular. A round frame around a square avatar
>   leaves the corners hanging out of it; the avatar is clipped inside a bordered
>   square now, like the cards on the end screen.
> - **Names appear from 118px of gutter**, not 160 — there was obvious room at
>   widths that were still hiding them — and the tooltip that stands in for them
>   below that opens with no delay.
>
> - **The gutter is the wrong measure of room.** The column is capped at 1600
>   and the board at 1350, so a 2360px window has a ~95px gutter and a great deal
>   of empty space outside it — names were hidden on the widest screens of all. The
>   faces sit flush against the board and the names reach outward past the
>   column, into whatever the window has spare, capped at 240px.
> - **The square is filled with the avatar's own background colour.** DiceBear
>   draws each avatar with rounded corners of its own, so a bare square left four
>   empty ones.
> - **The folded row does not overlap.** Faces sat on each other, which put the
>   spymaster badge under the next face; the row is spaced and the badge moved to
>   the left of each face.

**Done when:** during a game, every player can see at a glance who is on their
side, who is on the other, and which of them is the spymaster — and the play
screen still does not scroll.

### Why it is missing

The lobby is the only place the roster is ever shown. Once the board is dealt,
the play screen names your own role (*you are a spy for red*) and nothing else,
so with six people in a room and a mesh that quietly drops one, nobody can tell
who is actually playing beside them — and a card mark that appears with an
unfamiliar avatar has no name attached.

### It spends board, or it spends nothing

Under item 4 the board is the only elastic thing on the screen: the HUD is
`shrink-0` and the board takes what is left. Adding to the HUD therefore cannot
scroll the page — but it is not free either. A row of avatars under each score is
about 30px of HUD, and because the board is solved as `W = 1.4·H`, 30px of height
is **42px of board width** — every card about 8px narrower at 5×5.

The HUD has no spare width to put them in instead. It is capped at `max-w-3xl`,
768px (`src/ui/screens/Game.tsx:117`), against two score columns, the clue, and
the timer arc. Widening it to match the board only moves the problem: the clue is
centred between the scores and pushing the scores apart is what
`src/ui/hud/Hud.tsx` already went out of its way to stop.

So put the rosters where there is height going spare instead — beside the board,
in the gutters that item 4 creates.

### Where it goes: the flanks

Once the board is sized by height, it stops filling its column, and the leftover
is at the sides. The play area becomes three columns — roster, board, roster —
inside a row capped wider than the board's own 1350px cap, so a large monitor
gets gutters rather than dead margin:

```
row    mx-auto w-full max-w-[1600px] flex items-center gap-4
  red    flex-1 min-w-0            (order-first)
  board  the item-4 wrapper, max-w-[1350px]
  blue   flex-1 min-w-0
```

Red left, blue right, mirroring where their scores already sit in the HUD.
Vertically centred against the board, and stopping 4rem clear of the bottom so
the fixed rail (`src/ui/Rail.tsx`) never sits on top of a face.

| Player | Drawn as |
|---|---|
| Any | `AvatarView`, 40px, circular, in a ring tinted to their team |
| The spymaster | `VenetianMask` badge on the ring, the mark the lobby already uses |
| You | a lamp-coloured ring, matching the armed-card treatment |
| Disconnected | 45% and desaturated, as `PlayerCard` does it |
| More than six | the first six, then a `+2` chip |

Names sit beside the avatars above 1180px, where the gutter is wide enough for
them, and fall back to a `Tooltip` below that — the provider is already mounted
at the root of `src/ui/App.tsx`.

Both sides are always shown, to everyone, spectators (3) included. *Who am I
playing against* is the same question one seat over, and hiding the far side
would make a spectator's board lopsided for no reason.

### When there is no gutter

Below **88px** of gutter per side the flanks are dropped and the avatars fall
back into the HUD, in a row under each score at 26px, overlapped by `-space-x`,
six maximum. That is the placement this section originally proposed, kept as the
narrow case rather than the main one.

The two cases are complementary, which is what makes this cheap. A gutter appears
exactly when the board is height-bound — a wide, short window — and vanishes
exactly when the board is width-bound, which is when the HUD has height to spare
and the extra row costs the board nothing. Only at the threshold do both pinch at
once, and there the swap costs about 40px of board width.

Computed from the class values as they stand, with the item-4 formula and a HUD
of about 155px (120px compact):

| Viewport | Board | Gutter each side | Rosters |
|---|---|---|---|
| 1920×1080 | ~980 | ~310 | flanks |
| 1366×768 | ~807 | ~247 | flanks |
| 2560×1440 | 1286, capped | ~157 | flanks |
| 1024×768 | ~807 | ~76 | HUD row |
| 820×1180 | 756, width-bound | 0 | HUD row |
| 390×844 | out of scope | 0 | HUD row |

Check these against `npm run playtest -- --headless` screenshots rather than
trusting the arithmetic; they are derived from the current padding and type
sizes, both of which item 4 moves.

### What it must not do

- **Not scroll.** This is the whole constraint. In the flank case it takes no
  vertical space at all; in the HUD case the board absorbs it. Neither can push
  the page past the viewport.
- **Not reflow.** Fixed height whether or not it holds anything, for the same
  reason `PlayerCard` pins its badges (`src/ui/room/PlayerCard.tsx:25`): a HUD
  that changes height when somebody drops shoves the clue sideways, and the clue
  is what everyone is reading.
- **Not leak the key.** It renders `Player`, never `View`. A spymaster's flank
  looks exactly like a spy's.

### Below the targets

On a phone the flanks are dropped, the HUD row is used, and the page scrolls.
That is accepted, not a defect — see [Out of scope](README.md#out-of-scope-phones).

### Files

`src/ui/hud/TeamFlank.tsx` (new, both placements), `src/ui/screens/Game.tsx` (the
three-column row; it already holds `shared.players`), `src/ui/hud/Hud.tsx` (the
fallback row beside `Score`), `src/index.css` (the gutter threshold as a
container query on the play area).
