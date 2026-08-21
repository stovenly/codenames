# 05 — Waiting room

**Depends on:** [03](03-host-authority.md), [04](04-game-core.md).
**Done when:** players land in a shared waiting room after joining, pick an
avatar and a team, ready up, and watch the host's proposed settings change live.

Modelled on the Gartic Phone lobby: everyone sits in one room, sees the same
proposed configuration, and signals readiness before anything starts.

## Flow

```
landing -> create -> share link -> WAITING ROOM -> game -> gameover
                                        ^                     |
                                        +---- new game -------+
```

**Landing.** One screen, one primary action — Create a game — plus a display-name
field. A URL already carrying `#r=` renders the join variant instead.

**Create.** Generates a room id, joins the room, becomes host. The share link is
shown large with one-click copy. Nothing else is required; every setting has a
working default.

**Join.** Name, then the password prompt if the host rejects the first `hello`
([03](03-host-authority.md#join-handshake)). The waiting room is reached only
after the password clears — a player who has not authenticated never sees the
roster or the proposed settings.

After a game ends, everyone returns to this same screen with ready flags cleared
and settings intact.

## Layout

Three regions, all live for every player, only interactive for the host.

**Roster**, centre. Three columns — Red, Unassigned, Blue — of dossier cards, with
spring layout transitions when someone moves. Each card carries the avatar in a
brass dossier frame, the display name, a spymaster badge, a connection-quality
pip from `getRelaySockets()`, a host mark, and a ready state.

Players move themselves between teams and volunteer as spymaster; the host can
override any assignment by dragging a card.

**Proposed settings**, right. A read-only mirror for non-hosts of everything the
host is configuring in [06](06-configuration.md) — board size and composition
row, timers, word list, whether a password is set. Values animate when the host
changes them, so the room can see a 7x7 board being proposed and react before it
starts.

**Ready bar**, bottom. A large Ready toggle for every player, and the roster
shows a filling brass rule around each readied card. The bar reads
`4 / 6 ready` and names who is outstanding.

## Ready gate

**RESOLVED — ready is purely advisory.** It is a signal to the room, not a lock
on the host. The bar reads `4 / 6 ready` and names who is outstanding, and that
is the whole of its power.

The Start button gates only on problems a game cannot start with, each spelled
out: `Red team has no players`, `Blue team has no spymaster`, `Word list has 47
words, 7x7 needs 49`. Those are structural, not social — no override, because
there is nothing to override.

Readiness never enters history and clears on game start.

## Avatars

Generated locally with [DiceBear](https://github.com/dicebear/dicebear) —
`@dicebear/core` plus per-style JSON definitions. Deterministic SVG from a seed,
no API call, no network at render time, which keeps the zero-accounts rule and
works offline.

### Styles

All CC0 1.0 for the artwork and MIT for the code, so there is no attribution
obligation, and all lazy-loaded.

| Style | Package | Character |
|---|---|---|
| Shapes | `@dicebear/shapes` | Abstract, highest contrast, most colourblind-safe |
| Glass | `@dicebear/glass` | Soft gradients, quiet |
| Pixel | `@dicebear/pixel-art` | Retro, reads well at small sizes |
| Thumbs | `@dicebear/thumbs` | Simple figures, the comic option |
| Lorelei | `@dicebear/lorelei` | Illustrated portraits, fits the dossier framing |
| Peeps | `@dicebear/open-peeps` | Hand-drawn people, the widest variety |
| Notionists | `@dicebear/notionists` | Line-drawn characters, the heaviest |

An earlier draft of this table named Clay, Critters and Pixelbot. **No DiceBear
styles by those names exist** — the seven above are the CC0 styles that do.

**Excluded: Bottts.** Licensed "free for personal and commercial use" rather than
CC0. Usable, but CC0 across the board keeps the licence story to one line, and
that is worth more than one robot style.

**RESOLVED — Notionists is in.** It is CC0, it is a genuinely distinct style, and
it is lazy-loaded, so its weight lands only on players who pick it.

### Customization

Kept deliberately narrow — DiceBear's full option surface differs per style and
would be a maintenance drag.

- **Style** — the seven above, as a row of live previews
- **Reroll** — a new random seed, with a slot-machine spin across three or four
  intermediate avatars before landing. This is the fun part; give it weight
- **Background** — a fixed swatch row drawn from the palette in
  [01](01-foundations.md#design-system), deliberately excluding the two team
  colours so an avatar never contradicts a team column

Stored as `{style, seed, bg}` in `localStorage`, so a returning player keeps their
look, and broadcast as `presence`. Every client generates the SVG locally; the
wire carries about thirty bytes, never an image.

### Loading

Style definitions are lazy `import()`ed and cached. A client loads a style only
when it first has to render one — its own choice, or another player's. Worst case
in a full room with seven distinct styles is 585 KB raw, well under half that
gzipped, and it arrives after first paint.

The picker is the one place that renders all seven at once, so each load is
deferred to `requestIdleCallback`. Seven style definitions must never contend
with the transport chunk for the same bandwidth.

While a definition loads, render the Shapes fallback at 12 KB, which is bundled
eagerly. Nothing in the room ever waits on an avatar.

## Host tab notice

The waiting room is where the host learns about
[background tab throttling](03-host-authority.md#background-tab-throttling),
while it is still cheap to explain.

A single line in the host's panel, brass-ruled, not a modal:

> You're hosting. Keep this tab in front — a backgrounded tab gets throttled by
> the browser and everyone's connection suffers.

It appears once per session for the host and can be dismissed. The reactive
version, which fires when we actually observe degradation, is in
[09](09-resilience.md#alt-tab-degradation).

## Presence in the waiting room

`presence` carries ready state, avatar, name changes, and team preference. All of
it is ephemeral, throttled to 10/s per sender, and droppable — a lost presence
message costs a stale pip for a second, never a desync.
