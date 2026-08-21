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
  | {t: 'start';   seed: string; startTeam: Team}
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
  clueTimer: number | null    // seconds
  guessTimer: number | null   // seconds
}
```

Derived counts, where `N = size * size`:

```
startingTeam = teamCards + 1
secondTeam   = teamCards
neutral      = N - (2 * teamCards + 1) - assassins
```

**Validation:** `neutral >= 0`, `teamCards >= 1`, `assassins >= 1`, and the
resolved word list holds at least `N` words. `neutral === 0` is allowed but
flagged as degenerate.

**Defaults:**

| Size | N | teamCards | Start / Other | Assassins | Neutral |
|---|---|---|---|---|---|
| 3x3 | 9 | 2 | 3 / 2 | 1 | 3 |
| 4x4 | 16 | 4 | 5 / 4 | 1 | 6 |
| 5x5 | 25 | 8 | 9 / 8 | 1 | 7 |
| 6x6 | 36 | 11 | 12 / 11 | 2 | 11 |
| 7x7 | 49 | 15 | 16 / 15 | 2 | 16 |

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
effect. **OPEN:** whether to surface a toast for rejected intents. Leaning yes
for host actions, no for gameplay.

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
