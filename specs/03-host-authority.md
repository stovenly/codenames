# 03 — Host authority

**Depends on:** [02](02-transport.md).
**Done when:** players join with a password, the roster shows who the host is,
and killing the host's tab promotes someone else visibly within seconds.

## State envelope

```ts
type Shared = {
  version: number       // monotonic, bumped on every broadcast
  hostId: PlayerId
  hostEpoch: number     // bumped on every change of host
  hostHidden: boolean   // host's tab is backgrounded
  hostDegraded: boolean // measured: the host's own beat is running late
  roster: PlayerId[]    // peers the host currently sees
  sentAt: number        // host wall-clock ms
  players: Player[]
  // game payload added in 04
}
```

Clients apply a broadcast only if `version` exceeds what they hold. That single
check absorbs the duplicates and reordering the router permits.

## Join handshake

1. The joiner opens the link, is prompted for a display name and, if the host has
   set one, a lobby password. It cannot know in advance whether one is required,
   so it sends `hello` without one first.
2. `hello` carries `{name, playerId, proof}` where
   `proof = SHA-256(roomId + ':' + password)`, or `null`.
3. The host compares `proof` against its stored hash. On match, or when no
   password is set, it replies `welcome` and broadcasts `state`.
4. On mismatch it replies `reject {reason: 'password'}`. The joiner shows a
   password prompt and retries. The peer connection stays up; the joiner simply
   receives no state.

The plaintext password never leaves the joiner. Not meaningful security given
every peer holds full state anyway, but it costs one hash call.

**The lobby password is not Trystero's `password`.** Trystero's gates whether
peers can connect at all, so a wrong password would make a player silently
invisible rather than told they were wrong, and changing it mid-session would
disconnect everyone. We leave Trystero's at its default and enforce the lobby
password here, where the host can change it live and reject with a message.

**RESOLVED — no rate limiting on `reject`.** A room id is ten random base32
characters and the group is friends. A backoff would be code defending against
an attacker who already had to be handed the link.

## Liveness

The host emits `state` on every change and `beat` every 2s otherwise. A client
that has seen neither for 6s enters `electing`.

### Background tab throttling

The sharpest edge in the whole project, and easy to miss. A hidden tab has its
timers throttled — in Chrome, to roughly once a minute after a few minutes
hidden. A host who alt-tabs would stop sending `beat`, every client would declare
them dead, and a spurious election would fire mid-game.

Three mitigations, all needed:

1. **Run the beat in a Web Worker.** Worker timers are throttled far less
   aggressively than main-thread ones.
2. **Advertise visibility.** The host sets `hostHidden` from `document.hidden`.
   Clients widen the missing-host window from 6s to 30s while the host is known
   to be hidden.
3. **Request a wake lock.** `navigator.wakeLock` on the host, best-effort, no
   error if unavailable.

The host-facing UI treatment for this lives in
[05](05-waiting-room.md#host-tab-notice) and
[09](09-resilience.md#alt-tab-degradation).

## Election

State carries `hostEpoch`, incremented on every change of host whatever the
cause.

1. A candidate broadcasts `claim {playerId, version, visible, uptime}`.
2. It collects claims for 1500ms.
3. **Score, in order:** tab visible, then highest `version`, then longest uptime,
   then lowest `playerId`. Deterministic, so every candidate computes the same
   winner.
4. The winner sets `hostId`, `hostEpoch += 1`, and broadcasts `state`.
5. Anyone receiving a `state` with a higher `hostEpoch` accepts it and leaves
   `electing`.

Visible outranks version because promoting a backgrounded tab reproduces exactly
the throttling problem above. Version outranks uptime so the promoted host is
whoever saw the most of the game, minimising rollback.

**Sticky.** No election runs while the current host is reachable. The 6s window
must be comfortably longer than the 2s beat, or the host flaps on a transient
drop.

**Explicit handoff.** On `beforeunload` the host sends `handoff` naming its
preferred successor by the same scoring, making promotion instant instead of
waiting out the timeout. Best-effort — a crash still falls back to the timeout,
which is why the timeout exists.

**Manual transfer** uses the same mechanism, triggered from the host panel in
[08](08-host-controls.md). The target adopts with `hostEpoch += 1`; the old host
demotes on seeing the higher epoch. This is the path for handing control back to
someone who dropped and returned — the returning player is a normal connected
player and can be selected like any other.

**Two hosts at once**, possible after a partition heals: higher `hostEpoch` wins,
ties break to the lower `hostId`. The loser demotes and adopts. A banner tells
players it happened.

Nothing about the relay mesh reorganises on a host change. Routing does not know
or care who the host is; the only things that change are which client's UI shows
mutating controls and which client answers intents.

## Partition

The mesh splits only if the connection graph genuinely disconnects, unlikely when
every pair attempts a link. We detect rather than merge:

- A client with a directly connected peer absent from `roster` for more than 10s
  shows a split warning.
- Observing `state` from two distinct `hostId`s inside one 5s window shows the
  same warning.

The banner prompts someone to rejoin. We do not reconcile two divergent games.

## Seats and ghosts

A player who closes the tab has not left the game — they have stepped out. The
host keeps them in `players` with `connected: false`, holding their team,
spymaster role and avatar. Everyone sees the seat as held rather than filled,
and it is waiting when they come back.

Seats are the host's to manage: `removePlayer` frees one, host only, and never
the host's own. It is surfaced on held seats specifically, in the roster and in
the host panel, rather than as a general kick — the case it exists for is
someone who is not coming back.

## Identity across sessions

`playerId` resolves in this order:

1. **This tab's `sessionStorage` id**, so a refresh never loses the seat.
2. **The saved seat in `localStorage`** for this room, but only once its claim
   has gone stale. A tab holding a seat rewrites `claimedAt` every 5s and a
   claim counts as live for 15s.
3. **A fresh id.**

The claim window is what stops a second tab adopting the identity of the first,
which would put one player in the room speaking from two places. A seat whose
claim is still warm is therefore never taken automatically — it is offered on
the landing screen as **Rejoin as \<name\>**, and taking it is a deliberate
choice that reloads the page so the mesh restarts as that player.

The reverse escape matters too: a session that picked up a seat automatically
shows **Not you?**, which clears both stores and starts fresh. A shared laptop
should not silently hand someone else's seat over.

The host matches on `playerId`, never on Trystero's `selfId`, which changes on
every page load.

## Host visibility to players

Every client always knows who the host is, and the roster marks them with the
brass accent. When the host changes, everyone sees a brief banner naming the new
one. Silent authority transfer would make undo and settings changes look like
glitches.
