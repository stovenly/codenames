# 10 — The host can skip a turn

> Shipped as specified: `skipTurn` in `src/state/room.ts`, the `skipped`
> reason in `src/game/steps.ts`, the row under undo and redo in
> `src/ui/host/HostPanel.tsx`. Two small differences: the line beside the
> button says how many guesses are left only when the count is finite, and the
> host also gets a flash of their own so the press is seen to land. The row has
> **not been seen in a browser**; the intent, the log entry and the undo are
> unit tested.

**Done when:** a host looking at a team that cannot move — a spymaster who has
gone, a sole guesser who has gone — can hand the turn to the other side in one
press, from either phase, and the log says that is what happened.

### The problem

A turn belongs to the team whose turn it is, and only they can end it. The
spymaster ends the clue phase by giving a clue; a guesser ends the guess phase
by passing or picking wrong. If the one person who could do that is not there,
nothing the host has reaches the situation:

- **Undo** goes backwards. The same team is still on the clock afterwards.
- **Remove player** takes the seat away and leaves the turn where it was; and a
  team of nobody still holds it.
- **Move to another team** is a `setup` action (`applyIntent`'s `setTeam` case,
  `src/state/room.ts`) and is refused mid-game — correctly, since a player
  changing sides mid-game has seen the key or their own team's clues.
- **The timers** end a phase on their own, but only when they are set, and a
  table that plays without one has no floor at all. A clue timer that runs out
  does not skip anyway: it gives the team an empty clue and the whole board to
  guess from, which still waits on a guesser.
- **End game now** discards the game to get out of one turn.

The workaround today is for someone to take over the missing player's browser
identity, which is a console command and a page reload. That is not a feature.

### What it is

One host control: **Skip turn.** It ends the current team's turn wherever the
turn is — before a clue has been given, or during the guessing — and the other
team's clue phase begins.

It is the same one step in both phases:

```ts
{t: 'endTurn', team: view.turn, reason: 'skipped', by: hostId}
```

`derive` already handles `endTurn` without caring what phase it arrived in
(`src/game/reducer.ts`): the turn flips, the clue clears, the phase is `clue`.
Skipping the clue phase therefore needs nothing new in the rules. What is new is
the reason.

### Why a new reason, and not one that exists

`EndTurnReason` (`src/game/steps.ts`) is `'pass' | 'wrong' | 'timeout' |
'exhausted'`. Each is something that happened at the table, and the log
(`src/ui/hud/History.tsx`) says so in words: *passed*, *wrong pick*, *ran out of
time*, *out of guesses*. A skip is none of those, and reusing one would put a
false line in a log whose whole purpose is being the record people trust:

- `pass` is refused in the clue phase and before the first guess
  (`guessedSinceClue < 1`), because Codenames requires one guess before passing.
  Lifting that for the host means the log shows a team passing when nobody on it
  did anything, credited by name to a player who was not there.
- `timeout` says the clock ran out. It may not have been running.

So `'skipped'`, with `by` naming the host who pressed it — the one `endTurn`
reason where the person named is not on the team whose turn ended. The log line
is **skipped by the host**.

### The intent

```ts
| {kind: 'skipTurn'}
```

In `applyIntent`:

- host only (`fromHost`), like `undo` and `endGame`; anyone else is ignored
- valid in `clue` and `guess`; ignored in `setup` and `gameover`
- appends the step through `appendStep`, so `advance` runs and the deadline is
  recomputed by `commit`. The next team's clue timer, if there is one, starts
  after the turn band's lead-in as it does for any other `endTurn`.

A guess that was already on the wire when the skip landed is refused by the
checks that exist: the phase is `clue` and the sender's team is not `view.turn`.

**Everyone is told.** As with `undo`, the host sends
`presence {kind: 'skipped', team}` and every client flashes **The host skipped
red's turn**. The turn band plays as it does for any turn change, so the board
does not simply flip under a spymaster who was mid-thought without a word of why.

### Where it lives

The host panel's **History** tab (`src/ui/host/HostPanel.tsx`), directly under
undo and redo, as its own row:

```
[ Skip red's turn ]   Red has not given a clue yet
[ Skip red's turn ]   Red is guessing — 2 guesses left
```

The button names the team, and the line beside it says what is being skipped,
because "skip turn" pressed a second late lands on the *other* team's clue
phase. Both are derived from `view` and re-render with it.

No confirmation. It is one step, undo is directly above it, and the case for
it is a table that is already waiting. `End game now` confirms because it
discards the game; this discards nothing.

Hidden in `setup` and `gameover`. Enabled while rewound: a step appended after
an undo truncates at the cursor like any other, which is the existing rule.

It is not on the play HUD. The HUD is a player's, the host is also a player,
and a control that flips the game's turn is a host control that belongs behind
the brass door with undo — two clicks is fine for something used once a night.

### Wire compatibility

Additive, per the standing decision in [done](done/README.md#wire-compatibility-in-one-place).

| Field | Added to | An old client sees | A new client reading old state |
|---|---|---|---|
| `'skipped'` | `EndTurnReason` | the turn change plays; `History` labels it *out of guesses* (the `why` fallback); the host panel prints `(skipped)` | — |
| `skipTurn` | `Intent` | never sends it; an old host ignores it | — |
| `presence {kind: 'skipped'}` | | ignored: not `rewound`, not `restored` | — |

The mislabel on an old client is a wrong word in the log for the length of one
build, not a wrong board. The game itself is identical on both sides because
`derive` never reads the reason.

### Tests

In `src/game/game.test.ts`, under `derive`:

- an `endTurn` arriving in the clue phase, with no clue given, hands the turn
  over and leaves the other team awaiting a clue

In `src/state/room.test.ts`:

- `skipTurn` from a client is ignored; from the host in the clue phase it
  appends exactly one `endTurn` with reason `skipped` and `by` the host
- from the host in the guess phase, likewise; the clue is gone afterwards
- in `setup` and `gameover`, nothing is appended
- with a clue timer set, the deadline after a skip belongs to the other team
  and is not before the turn band has played
- the `presence` announcement names the team that was skipped

In `src/game/log.ts`'s coverage: a `turn` entry with reason `skipped` is
produced for the row, so the label is one lookup in `why` rather than a special
case.
