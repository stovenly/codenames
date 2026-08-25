# 03 — Spectator, a fourth role

> Shipped as specified. The lobby marks a spectator with the lucide `Eye`; the
> chat improvement still outstanding in [IMPROVEMENTS.MD](../../IMPROVEMENTS.MD)
> replaces that with a plain-head glyph.
>
> **Since:** the glyph swap happened, and the order settled as **Bench, Red,
> Blue, Spectators** in both the role picker and the roster columns — where you
> start, the two sides, then out of it altogether.

**Done when:** a player can choose Spectate, watch the whole game from a board
with no side to it, talk in All chat, and count for nothing in the roster
requirements.

### Why it is not the bench

Functionally, today's bench already gets a neutral board and All-chat only. The
difference is intent, and intent is load-bearing in exactly two places:

- **Randomize** (2) deals the bench in and leaves spectators out.
- **The ready bar** counts the bench and ignores spectators, so `4 / 6 ready`
  stops being a number nobody can ever complete.

A bench player is between games. A spectator is not playing. Everything below
falls out of that.

### Model

```ts
type Player = {
  …
  team: Team | null
  spymaster: boolean
  /** Watching, not waiting. Implies team === null. */
  spectator?: boolean
}
```

Optional and additive, rather than folding `team`, `spymaster` and this into one
`seat` discriminant. A client on an older build reads a field it does not know
about as `undefined` and shows a spectator on the bench — wrong, harmless.
Changing the shape of `team` would instead have that client seating people on a
team called `spectator`.

One helper beside `teamOf` in `src/game/types.ts`:

```ts
export type Seat = 'red' | 'blue' | 'bench' | 'spectator'
export const seatOf = (p: Player): Seat => (p.spectator ? 'spectator' : (p.team ?? 'bench'))
```

`rosterProblems` is unchanged — spectators have no team, so they are already
invisible to it, and *Red has no players* is still the right sentence when
everybody decides to watch.

### Intent

`setTeam` grows a target that is not a team:

```ts
| {kind: 'setTeam'; target: PlayerId; team: Team | null; spectator?: boolean}
```

Host or self, `setup` only, as now. `spectator: true` forces `team: null,
spymaster: false` in the same `upsertPlayer` — the three cannot be allowed to
disagree.

### Waiting room

The role row becomes four: **Red · Bench · Spectate · Blue**, with `Eye` from
lucide on Spectate. The roster grid becomes four columns, spectators last, with
no bulb rail — there is no side to light. The header line reads
`6 players · 2 watching` whenever anyone is.

Spectator cards keep the neutral band the bench already uses and carry an `Eye`
where a team card carries the agent silhouette (`src/ui/room/PlayerCard.tsx:73`).

### The neutral board

A spectator gets what a bench player gets today, made deliberate:

| | Spectator |
|---|---|
| Floor wash (`data-team`) | none — `Game.tsx:38` already yields `null` |
| Spymaster key faces | never |
| `SpymasterChrome` band | never |
| Card marks | reads everyone's, places none — `canGuess` is false, so `presence` never sends |
| Lock in / Pass row | absent |
| Turn banner | `<turn> team's turn`, the existing teamless line in `Standing` |
| Score, clue, timer, both team rosters (7) | all of it, unchanged |

The one addition is a small **Spectating** label under the standing line, so a
neutral board reads as a choice rather than as a board that failed to pick a
colour.

### Chat

Already correct, and worth stating so it does not get "fixed": `readable()`
returns `['all']` for a player with no team, `writable('all')` is true for any
non-spymaster, and `readersOf('all')` addresses the whole roster. A spectator
reads and writes All and cannot see Team or Spymasters. No change to
`src/state/chat.ts`.

### Counted out of

- the ready bar's denominator, and *Everyone is ready*
- `accolades` (`src/game/accolades.ts`) — they take no steps, so they already
  score nothing; assert it rather than discover it
- the randomize pool

### Files

`src/game/types.ts`, `src/state/room.ts` (intent and `emptyPlayer`),
`src/ui/screens/Waiting.tsx`, `src/ui/room/PlayerCard.tsx`, `src/ui/hud/Hud.tsx`,
`src/game/game.test.ts`.
