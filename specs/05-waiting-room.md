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

Faces first — people pick a face. All lazy-loaded.

| Style | Package | Licence |
|---|---|---|
| Lorelei | `@dicebear/lorelei` | CC0 1.0 |
| Peeps | `@dicebear/open-peeps` | CC0 1.0 |
| Adventurer | `@dicebear/adventurer` | CC BY 4.0 |
| Micah | `@dicebear/micah` | CC BY 4.0 |
| Dylan | `@dicebear/dylan` | CC BY 4.0 |
| Notionists | `@dicebear/notionists` | CC0 1.0 |
| Thumbs | `@dicebear/thumbs` | CC0 1.0 |
| Pixel | `@dicebear/pixel-art` | CC0 1.0 |

**The CC0 pool is not deep enough.** It holds five usable styles and only three
of them are people, so the three added for variety are CC BY 4.0 and attribution
is required. It is in `CREDITS.md`. This is a change of position from the
original "CC0 keeps the licence story to one line" — the licence story is now
two lines, and a roster of eight faces is worth the second one.

An earlier draft of this table named Clay, Critters and Pixelbot, none of which
exist as DiceBear styles. Shapes and Glass were dropped as abstractions.
Personas and Miniavs were rejected on sight: both draw a hard diagonal across
the corner that reads as a rendering fault.

**Every style declares its own intrinsic size** — Lorelei 980, Notionists 1744,
Pixel 16 — so the generated SVG has to be told to fill its box. Left alone it
renders at its own scale and crops to a speck, which looks like a bug in the
avatar rather than in the markup around it.

### Customization

Kept deliberately narrow — DiceBear's full option surface differs per style and
would be a maintenance drag.

- **Style** — the eight above, as a grid of live previews
- **Variant** — a slider across the 60 variants inside the chosen style. The
  seed *is* the index, so the slider can always find its way back to what is
  selected. Each style remembers its own position for the session: scrubbing one
  category must not drag the others along with it
- **Reroll** — a dice that picks a variant and sets it, skipping whatever is
  showing so the button never appears to do nothing. No wind-up: the
  slot-machine spin earns its keep on the card reveal, where the wait is the
  point, not on a settings control
- **Backdrop** — a spread of darks and hues far enough apart to tell apart at
  40px, plus a pipette that opens a wheel with saturation and brightness and a
  hex field. The two team colours are excluded, so an avatar can never
  contradict the column it is standing in

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

While a definition loads, render a neutral placeholder on the chosen backdrop.
An earlier version fell back to another style's avatar, which is worse than
showing no face: it looks like the app picked for you.

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
