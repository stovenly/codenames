# 08 — A clue cannot be a word on the board

> Shipped: `src/game/clue.ts`, called by the composer and independently by the
> host. The refusal line under the clue box has **not been seen in a browser**;
> the rule itself is unit tested.

**Done when:** a spymaster who types a word that is on the board is told they
cannot use it, before it costs them anything, and the host refuses it if one
arrives anyway.

### The rule

You may not clue a word the table can see. It is the one rule of Codenames the
app currently does not enforce at all: `applyIntent`'s `clue` case
(`src/state/room.ts:757`) checks the phase, the seat, that the word is non-empty
and that the count is in range, and then appends it.

**Every word on the board counts, revealed or not.** The published rule is about
what is visible, and in the physical game a turned card is covered by an agent
card, which is why its word comes back into play. Here it does not: a spent card
keeps its word in white type (`src/ui/board/Card.tsx`, deliberately — *dark ink
on a faded plate is a second thing to read past*). What the table can see is
what the rule is about, so a word still legible on a turned card is still barred.

### One implementation, two callers

A pure function next to the rest of the rules, so the check cannot drift between
the client that warns and the host that decides:

```ts
// src/game/clue.ts
export const clueProblem = (word: string, cards: Card[]): string | null
```

Normalization: uppercase, letters only, and a trailing `S` stripped from each
side before comparison, so `APPLES` will not get through against `APPLE` and
`PAN` will not get through against `PANS`. Nothing more than that —
morphological forms (`RUNNING` for `RUN`, `WATERY` for `WATER`) stay a rule of
the table. A stemmer would reject legal clues, and a spymaster arguing with a
false rejection while their clock runs is worse than one who has to be told off
by their friends.

The message is what it refuses: **HOSPITAL is on the board.**

### Where it is enforced

**The composer**, for the spymaster who is typing. `ClueComposer`
(`src/ui/hud/Hud.tsx`) takes the board words, disables **Give clue** as soon as
the field matches one, and prints the reason under the input. This is the copy
that matters — it arrives while the word is still being typed, and it costs no
round trip.

Nothing leaks by checking on the client: the board words are on everybody's
screen already. It is the key that is secret, not the words.

**The host**, because the composer is a courtesy and the host is the authority.
`applyIntent` calls the same function and answers a bad clue with the existing
`refuse(from, …)`, which flashes the reason to the sender alone.

**The buzzer.** `ClueComposer` auto-submits whatever is in the box just before
the deadline (`LAST_CALL_MS`). If what is in the box is illegal it sends
nothing, and the existing timeout path takes over — the host already gives a
team that ran out of clue time an empty-word clue so they can guess anyway
(`src/state/room.ts:564`). A rejected clue at the buzzer must not turn into a
lost turn with no explanation.

### Tests

In `src/game/game.test.ts`:

- an exact board word is refused, revealed or not
- the plural of a board word is refused, both directions
- a word that merely contains a board word (`CARPET` against `CAR`) is allowed
- the step log is unchanged when a clue is refused — no `clue` step, no turn
  change, and the clock keeps running
