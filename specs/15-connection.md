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

---

# Implementation

One change per section, each shippable on its own and in this order — every
step makes the next one easier to verify. Names below are the ones in the code.

Throughout: `PlayerId` is the app-level id, `peerId` is Trystero's
per-transport id, and a **link** is one `(transport, peerId)` pair, keyed by
`linkKey()`. One player can be behind several links.

## 0. Groundwork

**`src/net/protocol.ts`**

```ts
export type MessageKind =
  | ...existing...
  | 'ping' | 'pong'   // link-level, never forwarded, never dispatched
  | 'ack'             // host → client, names an intent id

export type Envelope = {
  id: string
  from: PlayerId
  to: PlayerId | '*'
  ttl: number
  kind: MessageKind
  body: string
  /** Per-sender counter, so a receiver can drop an envelope overtaken in flight. */
  seq?: number
}
```

`seq` is optional so a client on the previous build still parses. Only
`presence` and `state` use it here; everything else ignores it.

**The test fakes.** `createMesh` currently reads `SPECS` from module scope, so
nothing in it can be tested without loading Trystero. Give it
`opts.specs?: Spec[]` defaulting to `SPECS`. A `Spec`'s `join` only has to
return something with `makeAction`, `onPeerJoin`, `onPeerLeave`, `getPeers`,
`ping` and `leave`. The fake in `src/net/mesh.test.ts` implements exactly that,
records every `send` into `sent: Envelope[]`, and exposes
`deliver(peerId, env)` and `connect(peerId)` to drive the other direction. All
later sections test against it.

## 1. Redundant send

**`src/net/mesh.ts`**

- `const REDUNDANT: ReadonlySet<MessageKind> = new Set(['hello', 'welcome',
  'state', 'intent', 'ack', 'handoff', 'claim', 'resync', 'words'])`.
- `outbound(exclude?, everyLink = false)`: when `everyLink`, push **all** of
  `identified().get(id)` rather than `list[0]`. Unnamed links are already
  pushed in full.
- `send()`: `const wide = REDUNDANT.has(kind)`. Broadcast path:
  `outbound(undefined, wide)`. Direct path: `const direct = identified().get(to)`;
  when `wide`, emit to every link in `direct`, otherwise `direct[0]` as now.
- `receive()`: forwarding becomes
  `outbound({player: raw.from, link: key}, REDUNDANT.has(raw.kind))`.

**Test.** Two fake transports, both holding a link to player B.
`send('intent', …, 'B')` lands in both fakes' `sent` with one envelope id;
`send('chat', …, 'B')` lands in exactly one. Delivering the same id twice
dispatches once — already true via `seen`; assert it so it stays true.

## 2. Link liveness

**`src/net/mesh.ts`**

```ts
type Link = {
  transport: TransportName
  peerId: string
  playerId: PlayerId | null
  since: number
  /** Last time anything arrived over this link. */
  heard: number
  /** Pings sent since the last pong. */
  missed: number
}
const PING_MS = 2_000
const PING_DEAD_AFTER = 3
```

- `receive()`: set `link.heard = Date.now()` and `link.missed = 0` for every
  envelope. For `ping`, reply `pong` with the ping's `id` as body, straight
  onto this link via `live.action.send(env, {target: fromPeer})`, `ttl: 0`,
  and return. For `pong`, return after the link update. Neither is dispatched
  or forwarded.
- `setInterval(PING_MS)`: for every link, `missed++`; if
  `missed > PING_DEAD_AFTER`, `drop(link)`, else send `ping` on that link
  with `ttl: 0`.
- `drop(link)`: `links.delete(key)`; `live.room.getPeers()[peerId]?.close()` —
  that is what makes Trystero fire `onPeerLeave` and re-signal instead of
  sitting on a corpse; `changed()`.
- `identified()`: sort each player's links by `heard` descending, not `since`
  ascending. `list[0]` is now the link that most recently delivered.
- `report()`: `PeerReport.transports` becomes
  `{name, heardMsAgo, missed}[]`, and the diagnostics sheet prints it.

**`src/state/room.ts`**: `present()` drops the `lastHeardFrom` clause and uses
`peers()` alone. A link that is in the map is a link that answered a ping.
`lastHeardFrom` stays for anything that wants it; the eleven-second window
goes.

**Test.** Link to B; advance a fake clock through four ping intervals with no
pong: the link is gone from `peers()` and the fake peer's `close()` ran.
Deliver a `pong` after two intervals: `missed` is 0 and the link stays. Two
links to B, the older one silent: `send('chat', …, 'B')` goes to the newer.

## 3. Intent acknowledgement

**`src/state/room.ts`**

```ts
type Pending = {id: string; intent: Intent; sentAt: number; tries: number}
const pending = new Map<string, Pending>()
const ACK_RETRY_MS = 1_000
const ACK_WORRY_MS = 3_000
const ACK_GIVE_UP_MS = 10_000
```

- `intend(intent)`: host applies as now. Client: `const id = newEnvelopeId()`,
  store in `pending`, `send('intent', {id, ...intent}, shared?.hostId ?? '*')`.
- `setInterval(500)`: each pending entry more than `ACK_RETRY_MS` past its
  last send is resent to `shared?.hostId ?? '*'` — re-read each time, so a host
  change mid-retry goes to the new host — with `tries++`. Entries past
  `ACK_GIVE_UP_MS` are removed and counted as failed.
- `on('intent')`: body is `{id?: string} & Intent`. If `id` is in the host's
  `applied: Set<string>` (capped at 500, oldest evicted), re-send the `ack`
  only. Otherwise apply, add to `applied`, `send('ack', {id}, env.from)`. No
  `id` means a previous-build client: apply, no ack.
- `on('ack')`: `pending.delete(body.id)`.
- `RoomSnapshot` gains `unacked: {oldestMs: number; count: number} | null`,
  published from the interval.

**`src/ui/hud/Hud.tsx`**: under the turn line, once `unacked.oldestMs >
ACK_WORRY_MS`, a `Label` in `text-lamp-300`: "Your move has not reached the
host…". Past `ACK_GIVE_UP_MS`: `text-kill-lit`, plus a Reload button doing
what the dev notice does — `history.replaceState(null, '', BASE_URL)` then
`location.reload()`.

**Test — `src/state/room.test.ts`** (new; mocks `./net` as `chat.test.ts`
does). Client `intend`s: `send` called once with an `id`; advance 1.1s, called
again with the same `id`; deliver `ack`; advance 5s, not called again. Host:
the same `{id, …}` delivered twice applies once and acks twice.

## 4. Route-aware outbox

`net.ts` already holds messages until the mesh boots. The hold moves into the
mesh, which is where routes are known.

**`src/net/mesh.ts`**

```ts
type Held = {env: Envelope; to: PlayerId | '*'; wide: boolean; until: number}
const held: Held[] = []
const HOLD_MS = 15_000
```

- `send()`: after computing targets, if the map is empty — no link to `to`, or
  no links at all for `'*'` — push to `held` with `until = now + HOLD_MS` and
  return.
- `flush()`: from `onPeerJoin`, from the `id` branch of `receive()` (the moment
  a link gets a name), and from the ping interval so expiry happens without a
  join. Emit anything whose targets are now non-empty; drop anything past
  `until`.
- `heldCount()` on the mesh, for the diagnostics sheet.

**Test.** Send to B with no links: nothing in `sent`, `heldCount() === 1`.
`connect(peer)` then deliver an `id` envelope from B over it: the held
envelope is in `sent`, `heldCount() === 0`. Send with no links and advance
16s: dropped.

## 5. State gossip, and resync from anyone

**`src/state/room.ts`**

- Host: the beat worker already ticks every `BEAT_MS`. Every
  `FULL_EVERY = 5_000` ms it also calls `sendFull(shared)`. Track `lastFullAt`.
- `on('resync')`: remove `if (!isHost()) return`. Body becomes
  `{want, hash, have?: {epoch: number; version: number}}`. Anyone holding a
  `shared` strictly newer than `have` — epoch first, then version — replies
  `sendFull(shared, env.from)`. The host always replies. A peer that is not
  newer stays silent.
- Clients include `have` from their own `shared` in every `resync` they send.
- `adopt()` is unchanged. It already refuses anything not newer, which is what
  makes answering from a stale peer safe.

**Test.** Client at `{epoch 1, version 7}` receives `resync` with
`have: {1, 5}` from X: `send('state', {full}, X)` called. With `have: {1, 9}`:
not called. A host receiving its own full state back via a forward ignores it
— already true through the `env.from !== next.hostId` guard; assert it.

## 6. Full state on reappearance

**`src/state/room.ts`**, in `monitor()` where the host recomputes `connected`:
for each player whose flag flips `false → true`, `sendFull(shared, p.id)`
after the `hostMutate`. No new state — the flip is already being detected.

**Test.** Host with B marked disconnected; `peers()` now returns B; run
`monitor()`: `send('state', {full}, 'B')` called once; run it again: not
called again.

## 7. Host link indicator

**`src/state/room.ts`**: `RoomSnapshot` gains `hostHeardMsAgo: number | null`
(null when we are the host), published by `monitor()` from `lastHostAt`.

**`src/ui/hud/Hud.tsx`** and the lobby's ready bar in
**`src/ui/screens/Waiting.tsx`**: one shared `HostLink` component, a 6px dot
beside the turn pill.

| heard within | dot | text |
|---|---|---|
| under 3s | `bg-lamp-500` | none |
| 3–10s | `bg-lamp-300`, pulsing | "reconnecting…" |
| over 10s | `bg-kill-lit` | "lost the host" + Reload |

**Test.** Covered by (8); a component test is not worth its harness.

## 8. Chaos

**`src/net/mesh.ts`**

```ts
export type Chaos = {
  /** 0..1 of envelopes dropped on send. */
  drop?: number
  /** ms added to every send, ±50%. */
  delay?: number
  /** Transports whose links are severed and never re-made. */
  kill?: TransportName[]
}
```

- `createMesh(opts)` takes `chaos?: Chaos`. In `emit()`: drop with probability
  `drop`; wrap the send in `setTimeout` when `delay`. In the transport loop,
  skip any spec named in `kill`.
- **`src/state/net.ts`**: read `chaos` from `location.search` as
  `drop:0.3,delay:800,kill:nostr+mqtt`, **only when `import.meta.env.DEV`**.
  Production ignores it.
- Diagnostics sheet, dev only: print the active chaos, so a forgotten knob is
  not mistaken for a real outage.

**`scripts/playtest.mjs`**: `--chaos=drop:0.3` appends `?chaos=…` to every
player's URL except seat 0's, unless `--chaos-host` is also given.

**Tests**, in `mesh.test.ts` with the fakes and a fake clock, each run 200
times on a seeded random so a pass means something:

- `drop: 0.4`, client `intend`s once: the host applies it within 5s.
- `drop: 0.4`, host broadcasts ten deltas: the client's `shared.version`
  reaches the host's within 10s, through gossip.
- `kill: ['nostr']` with links on two transports: every `REDUNDANT` message
  still arrives; liveness drops the dead links inside 8s.
- Joiner sends `hello` before any link exists: it is held, and the host has the
  player within 3s of the first link.

And one by hand: `npm run playtest -- --chaos=drop:0.3 --auto --seat=none`
plays a full game to the end screen.

## Order and size

| # | What | Touches | Size |
|---|---|---|---|
| 0 | protocol kinds, `seq`, test fakes | protocol, mesh, mesh.test | small |
| 1 | redundant send | mesh | small |
| 2 | link pings, drop dead links | mesh, room (`present`) | medium |
| 3 | intent ack + retry + HUD | room, Hud | medium |
| 4 | route-aware outbox | mesh, net | small |
| 5 | state gossip, resync from anyone | room | small |
| 6 | full state on reappearance | room | tiny |
| 7 | host link indicator | room, Hud, Waiting | small |
| 8 | chaos + end-to-end tests | mesh, net, playtest, tests | medium |

The fakes in (0) are what make everything after it testable as it lands, so
they come first. (2) moves the roster and host transfer onto real liveness in
the same change, since `present()` is the one function both read. (3) is the
change players will notice. Nothing here changes the wire format in a way an
old client cannot read — `seq`, the intent `id` and `have` are all optional.
