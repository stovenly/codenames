# 15 — Holding the room together

**Depends on:** [02](02-transport.md), [03](03-host-authority.md), [09](09-resilience.md).
**Done when:** a message that the mesh drops costs a moment, never a player —
and a player who is being failed by the network can see that they are.

## What is actually going wrong

Every wedge reported so far has the same shape: one message is lost, nothing
notices, and the room carries on in two versions. They look different from the
outside — a spymaster who cannot give a clue, a chat that reaches half the
table, a tab that never sees its own guess land, a lobby that thinks it has
four people when the host has three — but the mechanism is the same each time.

The mesh is built on Trystero data channels, which are reliable and ordered
**within one link**. Loss does not come from the wire. It comes from four
places in our own code, all of which treat sending as the same thing as
delivering:

1. **Sending with nowhere to send to.** `send` builds an envelope and hands it
   to every transport with a target list. If no link to the destination exists
   yet — the joiner's `hello` goes out before a single peer has connected —
   the target list is empty and the message is simply gone. The outbox in
   `net.ts` holds messages until the *mesh* boots, not until a *route* exists.

2. **One link per peer, chosen by age.** `outbound()` sends to `list[0]` — the
   oldest link to each player — and ignores the others. A link whose ICE has
   silently failed stays in the map until Trystero notices the channel close,
   which can be tens of seconds or never for a dead NAT mapping. Everything
   addressed to that player goes into the black hole while a healthy link on
   another transport sits idle. Forwarding uses the same choice, so relayed
   traffic dies the same way.

3. **No acknowledgement of anything.** `intent` is fire-and-forget. If it does
   not arrive, the player's action never happened and nothing tells them: the
   board stays as it was and the clue box stays empty. The same is true of
   `welcome`, `handoff`, `claim`, `chat` and `words`. Only `hello` retries, and
   only since 52b1376.

4. **Liveness is measured per player, not per link.** `present()` counts a
   player as here if any message from them arrived in the last eleven seconds.
   The `here` beacon they send goes over their one preferred link, so a dead
   preferred link makes a live player look gone — and `transferHost` and the
   roster both believe it.

Everything else — the theatre watchdog, the absolute presence marks, the
repeated hello — is a patch on a symptom of one of these four.

## The fix, in the order it should land

### 1. Send important things on every link to that peer

A peer reachable over nostr and torrent gets the envelope twice. Dedupe by
envelope id is already there, so the second copy costs a few hundred bytes and
nothing else. Applies to `hello`, `welcome`, `state`, `intent`, `ack`,
`handoff`, `claim`, `resync`, `words`. Presence and chat can stay single-link.

This alone closes most of the black-hole cases, because a link has to be dead
on every transport at once before a message is lost.

### 2. Know which links are alive, and kill the ones that are not

A `ping` every two seconds on every link, `ttl: 0`, with the reply carrying the
ping's id. A link that misses three in a row is dead: delete it from the map
and close its `RTCPeerConnection` through `room.getPeers()`, which makes
Trystero fire `onPeerLeave` and re-signal rather than sitting on a corpse.

Track last-delivered per link, and let `outbound()` prefer the link that most
recently carried something over the link that is merely oldest.

This also gives `present()` a real signal: a player is present if any link to
them answered a ping lately, which is the thing it was trying to approximate.

### 3. Acknowledge intents, retry them, and say when they are not landing

Every intent carries an id. The host answers with `ack` naming it — on every
link, per (1). The client keeps unacked intents in a list and resends each one
every second, to whoever it currently believes the host is, so a host change
mid-retry routes the retry to the new host.

After three seconds unacked the HUD says so — "your move has not reached the
host" — and after ten it offers a reload. The host de-duplicates by intent id
so a retry that crossed its ack in flight is not applied twice.

The thing this fixes is silence. A lost intent today looks exactly like a
player who has not moved yet.

### 4. Hold messages with no route, and flush them when one appears

A per-destination outbox: a message addressed to a player with no link, or a
broadcast with no links at all, waits up to fifteen seconds. `onPeerJoin`, and
the `id` greeting that names a link, both drain it. Past fifteen seconds it is
dropped and, for intents, surfaces through (3).

### 5. Gossip the whole state, not just the changes

The host sends the full `Shared` every five seconds regardless of whether
anything changed. It is a few kilobytes. A client that missed a delta, a
resync, the reply to the resync, and the beat that would have prompted it
converges anyway on the next one. The delta path stays for responsiveness; this
is the floor under it.

And any client answers `resync`, not only the host. Every client holds the
whole room with an epoch and a version, so a peer that can reach you but cannot
reach the host can still hand you the latest state it has. Adopt already
refuses anything older than what it holds, so this cannot regress anyone.

### 6. Resend the room to anyone who reappears

When a player goes from absent to present on the host's side, they get
`sendFull` unprompted. Today a returning tab gets deltas it cannot apply, asks
for a resync, and waits on that round trip — two more messages to lose.

### 7. Show the link to the host

A small indicator in the HUD with the time since the host was last heard from.
Green under three seconds, amber to ten with "reconnecting", red past that with
a reload button. People refresh early when they can see they are wedged and
play into the void when they cannot. This is the cheapest item here and it
should not be skipped because it is cheap.

### 8. A way to break the network on purpose

None of the above can be trusted without being exercised. A dev-only chaos
knob on the mesh — `?chaos=drop:0.3,delay:800,kill:nostr` in the URL or a
setting in the diagnostics sheet — that drops a fraction of envelopes, delays
them, or severs one transport's links. The playtest harness gets a `--chaos`
flag that passes it through. Then every item above has a test that turns the
knob and checks the room still converges.

## The ceiling

Two players whose NATs both refuse to talk fall back to TURN, and the only TURN
available without an account is Open Relay's shared pool, which is slow when it
works and often does not. Forwarding through a third peer who can reach both is
already implemented and covers some of this; it cannot cover a room where no
such peer exists.

That is the one problem on this list that better code does not solve. It is
worth knowing that it is the ceiling, so that when a room fails to form at all
nobody goes looking for a bug in the mesh. Everything above the ceiling —
a room that formed and then quietly fell apart — is ours, and is fixable.

## Not doing

- **A server.** Every one of these is free infrastructure or our own code. The
  moment the fix is "run something", the room stops being a static page.
- **Replacing Trystero.** The failure modes above are in how we use it, not in
  it. Three signalling transports and automatic re-signalling are worth keeping.
- **Consensus between clients.** The host stays the authority. Gossip spreads
  the host's truth; it does not invent a new one.
