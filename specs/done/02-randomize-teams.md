# 02 — Randomize teams

> Shipped, with the seating math in `dealTeams()` in `src/game/types.ts` rather
> than inline in the intent, so it is a pure function with tests. Those tests are
> in `src/game/game.test.ts`, not `src/state/room.test.ts` as planned here — the
> intent itself needs a host and a mesh, the rule does not.
>
> **Since:** the roster reseats without animation. A card sliding from one
> column to another says *this player moved*; eight at once says nothing, and
> holding the columns open while they travel grows the page. The lobby counts
> how many seats changed in one update and draws a bulk reseat instantly.
>
> Two mechanisms, because one is not enough. `AnimatePresence` keeps a leaving
> card exactly as it was last rendered, so a card that leaves still carrying the
> animation animates out and holds its space while it goes — detecting the
> reseat as it arrives is already too late for the cards it is about to remove.
> The button therefore sets the flag, lets that render commit, and only then
> sends the intent. The columns also use `mode="popLayout"`, so anything on its
> way out leaves the flow at once whoever's screen it is on.

**Done when:** the host presses one button and every non-spectating player has a
team, each team has exactly one spymaster, and the two sides differ in size by at
most one.

### The intent

```ts
| {kind: 'shuffleTeams'}
```

Host only, `setup` only — the same two guards `startGame` uses. It resolves in a
single `hostMutate`, so the room sees one roster move rather than a cascade of
individual seat changes.

### The deal

1. **Pool** = every player in the roster who is not spectating. The bench is
   included: the bench is where people wait to be dealt in, and this is the
   dealing. Disconnected players are included too — they still hold a seat, and
   skipping them makes the teams uneven the moment someone's wifi blinks.
2. Shuffle the pool, Fisher-Yates, `Math.random` on the host. It does not need to
   be reproducible; the seeded PRNG in `src/game/prng.ts` is for boards.
3. Deal alternately, starting on a side chosen by a coin flip. Even split, or a
   difference of one when the pool is odd, and the odd seat is not always red.
4. **The first player dealt to each side is its spymaster.** Everyone else is a
   spy, and every previous spymaster flag is cleared, including the host's.

Ready flags are left alone. Ready is advisory
(`specs/05-waiting-room.md#ready-gate`), the button is host-only, and clearing
the room's readiness because two people swapped sides is a worse surprise than a
stale tick.

With fewer than four in the pool the shuffle still runs and produces what it can.
`rosterProblems` (`src/game/types.ts:60`) then names what is missing, which is
the existing sentence for that state and does not need a second one.

### The button

Beside **Start game** in the waiting-room ready bar
(`src/ui/screens/Waiting.tsx:270`), host only, `variant="ghost"`, `Shuffle` from
lucide, labelled **Randomize teams**. No confirmation step: it is undone by
pressing it again, and the roster animates so the room can see what happened.

### Tests

In `src/state/room.test.ts`:

- sizes differ by at most one, for pools of 2 through 9
- exactly one spymaster per non-empty side
- spectators are untouched and are not counted when balancing
- run twice from the same roster, valid both times
