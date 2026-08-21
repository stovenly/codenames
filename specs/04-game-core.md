# 04 — Game core

**Depends on:** [03](03-host-authority.md).
**Done when:** a full game can be played through a debug harness with no real UI,
and the reducer, board generation, and validation are unit tested.

This is the only step with meaningful automated tests. Everything here is pure,
which is what makes that enough.

## Event sourcing

Game state is not stored. It is **derived** by folding an append-only list of
steps through a pure reducer:

```ts
type Game = Shared & {
  settings: Settings
  steps: Step[]
  cursor: number            // steps[0..cursor) are applied
  deadline: number | null   // host wall-clock ms
}

const derive = (settings: Settings, steps: Step[], cursor: number): Board
```

`derive` is pure and total. The board, revealed cards, scores, whose turn it is,
guesses remaining, and the winner all come out of it.

This is what makes the history and undo features in
[08](08-host-controls.md) exact rather than approximate, and it shrinks a state
broadcast to about a hundred bytes.

## Steps

```ts
type Step =
  | {t: 'start';   seed: string; startTeam: Team}   // who moves first, not who gets more cards
  | {t: 'clue';    team: Team; by: PlayerId; word: string; count: number | 'unlimited'}
  | {t: 'guess';   team: Team; by: PlayerId; card: number}
  | {t: 'endTurn'; team: Team; reason: 'pass' | 'wrong' | 'timeout' | 'exhausted'}
  | {t: 'end';     winner: Team; reason: 'cards' | 'assassin'}
```

Steps carry no derived data. `guess` records which card was clicked, not what
colour it turned out to be; the reducer knows that from the seed.

## Deterministic board

Generated from `Step.start.seed` and `settings`, never stored:

1. Seed a `mulberry32` PRNG from the seed string.
2. Fisher-Yates the resolved word list, take `size * size` words.
3. Build a colour bag from the counts below, shuffle it with the same PRNG, zip
   against the words.

Same seed plus same settings always produces the same board on every client. It
also means undo restores the identical board rather than regenerating one.

The resolved word list must be available to every client, which is what the
hash-and-fetch scheme in [06](06-configuration.md#distribution) handles.

## Board configuration

```ts
type Settings = {
  size: 3 | 4 | 5 | 6 | 7
  teamCards: number        // per team; starting team gets one more
  assassins: number
  wordListHash: string
  wordListName: string        // label only, so clients can name a deck they do not hold
  clueTimer: number | null    // seconds
  guessTimer: number | null   // seconds
}
```

Derived counts, where `N = size * size`:

```
perTeam = teamCards        // both teams, always
neutral = N - 2 * teamCards - assassins
```

**Both teams always get the same number of agents.** The published rules hand
the starting team one extra card to offset moving first; we do not. Whatever is
left over after two equal teams and the assassins becomes bystanders — the
board absorbs the remainder, never one of the teams. A slider that produces
9 red against 8 blue reads as a bug to the people playing, and being able to
trust that the sides are even matters more here than matching the box.

**Validation:** `neutral >= 0`, `teamCards >= 1`, `assassins >= 1`, and the
resolved word list holds at least `N` words. `neutral === 0` is allowed but
flagged as degenerate.

**Defaults:**

| Size | N | Per team | Assassins | Bystanders |
|---|---|---|---|---|
| 3x3 | 9 | 3 | 1 | 2 |
| 4x4 | 16 | 5 | 1 | 5 |
| 5x5 | 25 | 8 | 1 | 8 |
| 6x6 | 36 | 11 | 2 | 12 |
| 7x7 | 49 | 15 | 2 | 17 |

The editing UI is [06](06-configuration.md#board-configuration). Settings change
only in `setup` and `gameover`, never mid-game.

## Rules

Phases: `setup` -> `clue` -> `guess` -> (`clue` | `gameover`).

- **Clue.** The current team's spymaster submits a word and a count. `count: 0`
  and `count: 'unlimited'` both grant unlimited guesses. Otherwise the team gets
  `count + 1` guesses.
- **Guess.** Any operative on the current team may guess. A card of the team's
  own colour decrements guesses remaining and the turn continues. Neutral or the
  other team's colour ends the turn. The assassin ends the game; the guessing
  team loses.
- **Pass.** Allowed at any point after the first guess.
- **Exhausted.** Guesses remaining hits zero, turn ends.
- **Win.** A team whose last card is revealed wins immediately, including when
  the opposing team reveals it for them.

Legality is enforced only in the reducer, on the host. Clients render disabled
controls as a courtesy; the host is the judge.

## Intents

| Intent | Sender must be | Rejected when |
|---|---|---|
| `clue` | spymaster of current team | phase !== `clue`, empty word, count out of range |
| `guess` | operative of current team | phase !== `guess`, card already revealed |
| `pass` | operative of current team | phase !== `guess`, no guess made yet |
| `ready` | any player | phase !== `setup` |
| `setTeam` / `setSpymaster` | self, or host for anyone | phase !== `setup` |
| `setAvatar` | self | never |
| `transferHost` | host | target not connected |
| `undo` / `redo` / `jump` | host | cursor out of range |
| `endGame` | host | phase === `setup` |
| `updateSettings` | host | phase not `setup` or `gameover` |

Rejections are silent by default; the client simply never sees its intent take
effect. **RESOLVED:** host actions surface a banner, gameplay stays silent. A
host who presses a control needs to know why nothing happened; a player whose
guess was already too late does not need a second message telling them so.

## Timers

Both optional, both off by default. Presets: clue 30/60/90/120s, guess
60/90/120/180s.

- The host holds the only real timer. `deadline` is a host wall-clock timestamp;
  clients render a countdown against it.
- Clients estimate clock offset from `sentAt` on each broadcast and apply it.
  Sub-second accuracy is not needed.
- **Clients never expire a timer.** Only the host appends
  `endTurn {reason: 'timeout'}`. A client whose countdown hits zero shows 0:00
  and waits.
- Timeout during `clue` skips that team's turn entirely.

## History primitives

`steps` is append-only; `cursor` is the applied prefix length.

- **Undo:** `cursor -= 1`
- **Redo:** `cursor += 1`
- **Jump:** `cursor = n`
- **New step while `cursor < steps.length`:** truncate to `cursor`, then append.
  The redo tail is discarded, as in any editor.

Because `derive` is pure, every one of these is exact — no partial rollback, no
replay bug surface. On undo or jump the host recomputes `deadline` fresh for the
restored phase, since wall-clock deadlines are not derivable from steps.

The UI over these primitives is [08](08-host-controls.md#history).
