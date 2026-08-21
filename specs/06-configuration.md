# 06 — Configuration

**Depends on:** [04](04-game-core.md), [05](05-waiting-room.md).
**Done when:** the host can set board size, card counts, timers, and word lists
from the waiting room, and every player sees the proposal update live.

All of it is editable in `setup` and `gameover` only, greyed mid-game.

## Board configuration

Sliders for size, team cards, and assassins, over the math in
[04](04-game-core.md#board-configuration), with a live composition row beneath:

```
 [9 red agents]  [8 blue agents]  [1 assassin]  [7 bystanders]
```

Each is a pill with an icon — a red agent silhouette, a blue agent silhouette, a
skull, a blank circle — and a number that rolls when the sliders move. An invalid
combination turns the offending pill red and shakes it once; the start button
disables with the reason spelled out, rather than silently clamping the value.

Changing `size` re-derives sensible defaults for the other two from the table in
[04](04-game-core.md#board-configuration), so moving 5x5 to 7x7 produces a
playable board without further fiddling.

## Timers

Two segmented controls, both defaulting to off:

One scale for both, off by default: **off, 60s, 120s, 240s**. Two different
ladders meant the two controls looked like they measured different things.

Semantics and enforcement are in [04](04-game-core.md#timers); this is the
picker.

## Built-in word lists

Vendored into `src/data/wordlists/*.json` at build time. No runtime fetch and no
dependency on any external repo staying up.

| Pack | Words | Notes |
|---|---|---|
| Original | 400 | The base game deck. Default |
| Disney | 201 | Themed |
| Harry Potter | 200 | Themed |
| Valorant | 264 | Themed. Written in the build script, not fetched |

Duet and Everything came out because they overlap Original so heavily that
picking them changes almost nothing. Deep Undercover, Simpsons and Magic came
out because nobody was going to pick them.

**Valorant is written in `scripts/build-wordlists.ts`, not fetched** — nobody
publishes a list for it. Agents, maps, guns, ability names and the words people
shout in comms. The roster moves, so anything added to the game after it was
written is missing; adding it is one line in the script and a regenerate.

Sources, all plain text, one word per line:

- [jacksun007/codenames](https://github.com/jacksun007/codenames) — the widest
  spread of expansions and themed decks in one place; the counts above are from it
- [sagelga/codenames](https://github.com/sagelga/codenames) — multi-language,
  `wordlist/<locale>/<pack>/wordlist.txt`; the source if we ever add non-English
- [Filodoxia/codenames-wordlists](https://github.com/Filodoxia/codenames-wordlists)
  — the horsepaste.com lists, useful as a cross-check

**Licensing.** Neither primary source carries a license file. Individual words are
not copyrightable, but a curated deck is arguably a compilation, and the themed
packs lean on trademarks. For a private game among friends this is the normal
risk people take; worth knowing rather than discovering. Vendor with attribution
in `src/data/wordlists/SOURCES.md`. Do not ship the themed packs if this ever
becomes public-facing.

### Normalization

Source files are inconsistent — `#` header comments, blank lines, and `=` / `-`
prefixes marking revised and retired entries. A build-time script produces clean
JSON:

1. drop blank lines and lines starting with `#`
2. strip leading `=` and `-`
3. trim, collapse internal whitespace
4. uppercase
5. dedupe case-insensitively, keeping first occurrence
6. sort

`scripts/build-wordlists.ts`, run manually with its output committed.
Regenerating is a deliberate act, not part of `npm run build`.

### Selecting packs

The host picks at lobby setup or between games; a change applies to the next game,
never the current one. Multiple packs can be selected and are unioned before
dedupe. A pack whose count is below `size * size` is disabled in the picker with
the reason shown — a real constraint at 7x7 with a small themed pack.

## Custom word lists

The host pastes a newline-separated list into an editor.

**Limits.** A custom list holds at most **200 words**, and each line is capped at
**200 characters**.

**Validation**, per entry:

| Rule | Behaviour |
|---|---|
| Empty after trim | dropped silently |
| Length 1 | rejected, listed with a reason |
| Length > 200 | rejected |
| Length > 100 | accepted, warned — long entries will not look good on a card |
| Characters outside letters, digits, space, hyphen, apostrophe | rejected |
| Duplicate, case-insensitive | dropped silently, counted in the summary |
| More than 200 entries after dedupe | rejected outright |

A live summary shows accepted, dropped, and rejected with reasons, plus the
resolved count against the current board size — `47 words, need 49 for 7x7` should
be visible before the game starts rather than at start time.

Accepted lists are normalized exactly as built-in packs, then saved to the host's
`localStorage` under a name they choose, so they survive a refresh and are
reusable across sessions.

## Distribution

`Settings` carries `wordListHash`, never the words. The resolved list goes out
once on `welcome`, and any client holding an unknown hash sends `resync` to
request it. A custom list therefore costs one transfer per player per game
instead of riding along on every state broadcast.

At the 200-word cap a custom list is a couple of kilobytes, so this is cheap
either way — but it keeps state broadcasts uniformly tiny, which is what makes
the delta scheme in [09](09-resilience.md#broadcast-deltas) worth having.
