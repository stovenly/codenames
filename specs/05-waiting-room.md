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

The host's Start button is disabled until every player is ready and the
configuration is valid, with the blocking reason spelled out — `Waiting on 2
players`, `Red team has no spymaster`, `Word list has 47 words, 7x7 needs 49`.

After 10 seconds of waiting on the same players, a **Start anyway** appears for
the host only, naming who will be dragged in unready. Somebody always wanders
off; the host should not be held hostage.

*Assumed, not confirmed:* ready gates the start with a host override. Say the
word if you want it purely advisory, or a hard gate with no override.

Readiness is a `presence` message, not a step. It never enters history and clears
on game start.

## Avatars

Generated locally with [DiceBear](https://github.com/dicebear/dicebear) —
`@dicebear/core` plus per-style JSON definitions. Deterministic SVG from a seed,
no API call, no network at render time, which keeps the zero-accounts rule and
works offline.

### Styles

All CC0 1.0, so there is no attribution obligation, and all lazy-loaded.

| Style | JSON | Character |
|---|---|---|
| Open Peeps | 253 KB | Hand-drawn half-body people, the widest variety |
| Lorelei | 118 KB | Illustrated portraits, warm, fits the dossier framing |
| Clay | 65 KB | Soft 3D-ish figures |
| Critters | 53 KB | Animals, the comic option |
| Pixel Art | 45 KB | Retro, reads well at small sizes |
| Pixelbot | 39 KB | Robots — the mechanical-agent option |
| Shapes | 12 KB | Abstract, the highest-contrast and most colourblind-safe |

Deliberately excluded: **Notionists** (373 KB, the heaviest by a wide margin) and
**Bottts** (92 KB and licensed "free for personal and commercial use" rather than
CC0 — usable, but CC0 keeps the licence story to one line).

**OPEN:** whether to include Notionists despite the weight. It is a good style and
the cost lands only on players who choose it.

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
