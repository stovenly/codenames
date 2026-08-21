# 02 — Transport

**Depends on:** [01](01-foundations.md).
**Done when:** two browsers on different networks discover each other, exchange
text through the router, and the diagnostics panel reports transports, peers, and
ICE state.

Build and test this layer before anything above it. Everything later assumes it
works.

## Multi-transport discovery

Trystero ships each strategy as its own package. We join the same room on three
independent public networks at once:

```ts
import {joinRoom as joinNostr}   from '@trystero-p2p/nostr'
import {joinRoom as joinMqtt}    from '@trystero-p2p/mqtt'
import {joinRoom as joinTorrent} from '@trystero-p2p/torrent'

const config = {
  appId: APP_ID,
  relayConfig: {redundancy: 5},
  rtcConfig: RTC_CONFIG,
  turnConfig: OPEN_RELAY
}

const transports = [joinNostr, joinMqtt, joinTorrent].map(join => {
  const room = join(config, roomId)
  return {room, mesh: room.makeAction<Envelope>('mesh')}
})
```

Nostr, MQTT, and BitTorrent trackers are independent public infrastructure with
no accounts. Discovery now fails only if a player's network blocks all three.
At redundancy 5 that is up to fifteen signalling endpoints.

We also ship a curated `urls` override per transport in `src/data/relays.ts` —
8-12 vetted public Nostr relays, MQTT brokers, and WebSocket trackers. Defaults
drift and die; a list we control is updatable with a commit.

**`urls` and `redundancy` are mutually exclusive in Trystero:** supplying `urls`
makes it connect to all of them and ignore `redundancy` entirely. So we keep the
full vetted list in the file and pass only the leading `REDUNDANCY` entries.
That slice must be identical on every client — no per-room shuffling, or two
players pick disjoint relays and never discover each other.

`APP_ID` is a constant unique to this project. `roomId` is 10 chars of base32
from `crypto.getRandomValues`, carried in the URL hash.

**A transport that fails to initialise is logged and ignored.** One working
network is enough to play; three is redundancy, not a requirement.

**RESOLVED — no IPFS.** It was meant to cost one import. It costs `@waku/sdk`
and 35 MB of libp2p, which would dominate the bundle budget in
[09](09-resilience.md#load-and-offline) for a redundancy nice-to-have on the
network Trystero already rates least robust. Three transports is the design.

**The transport stack is a dynamic import.** Nostr, MQTT and BitTorrent together
are a third of the shipped JavaScript, so the mesh loads as its own chunk after
first paint. Prewarm still begins immediately; anything sent before the chunk
lands waits in an outbox.

## Merging transports into one mesh

The three networks are discovery channels, not separate games.

- **Identity is `playerId`, not `selfId`.** Trystero issues a different `selfId`
  per room instance, so the same person found over Nostr and MQTT looks like two
  peers. Every message carries the sender's app-level `playerId` (persisted in
  `sessionStorage`), and the direct-peer set is keyed by that.
- **Send** uses one live transport per `playerId`, preferring whichever connected
  first. Sending over all three triples traffic for nothing.
- **Receive** dedupes on `Envelope.id`, which the `seen` set already does.
- **Peer loss** requires every transport carrying that `playerId` to drop, so one
  relay network failing is invisible to the game.

## ICE configuration

```ts
const RTC_CONFIG = {
  iceServers: [
    {urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']},
    {urls: 'stun:stun.cloudflare.com:3478'},
    {urls: 'stun:openrelay.metered.ca:80'}
  ],
  iceCandidatePoolSize: 4
}
```

Several STUN servers because candidate gathering succeeds more often with more of
them, and all are public and account-free. `iceCandidatePoolSize` pre-gathers
candidates before they are needed, measurably shortening setup.

### TURN without an account

[Open Relay](https://www.metered.ca/tools/openrelay/) publishes shared public
credentials — nothing to sign up for:

```ts
const OPEN_RELAY = [{
  urls: [
    'turn:openrelay.metered.ca:80',
    'turn:openrelay.metered.ca:443',
    'turns:openrelay.metered.ca:443?transport=tcp'
  ],
  username: 'openrelayproject',
  credential: 'openrelayproject'
}]
```

Ports 80 and 443 plus TLS are deliberate: they survive corporate firewalls that
drop everything else.

**What you are trading.** These credentials are shared by everyone who has copied
them, against a 20GB/month pool. Best-effort: it can be slow, rate-limited, or
withdrawn. Strictly better than nothing and costs no account, which is the
requirement.

Connectivity therefore layers as: direct peer-to-peer for most pairs, peer
relaying through the mesh for most of the rest, Open Relay for a pair with nobody
in common. If all three ever fail for a real player, the fix is a Cloudflare TURN
account and one line changed. Not before.

## Prewarm

Join the room on page load, not on form submit. The player spends several seconds
typing a name and reading prompts; spending that time gathering candidates and
finding peers means the board is populated the moment they hit enter.

## Routing

Every application message is wrapped:

```ts
type Envelope = {
  id: string        // 8 random chars
  from: PlayerId
  to: PlayerId | '*'
  ttl: number       // starts at 4
  kind: MessageKind
  body: unknown     // obfuscated, see 01-foundations#obfuscation
}
```

**Send:** push to every directly connected peer, over that peer's preferred
transport.

**Receive:**

```
if seen.has(env.id): drop
seen.set(env.id, now)
if env.to === selfPlayerId || env.to === '*': handle(env)
if env.ttl > 0 && env.to !== selfPlayerId:
  forward({...env, ttl: env.ttl - 1}) to all direct peers except the sender
```

That is the entire routing layer. No topology map, no routing table, no
convergence step. Trystero already attempts a connection between every pair, so
we use whatever partial mesh the networks allow; if any path exists between two
players, messages traverse it. When a direct link recovers, the shorter path wins
the race and the duplicate is dropped.

`seen` is a `Map<string, number>` swept every 10s, evicting entries older than
30s. TTL 4 covers any realistic topology for a 10-player room.

**Cost.** Worst case a message is transmitted `peers x avgDegree` times. At 10
players and a few hundred bytes this is kilobytes. Not worth optimizing.

**Guarantees.** Unordered, at-least-once, best-effort. Everything downstream must
tolerate duplicates and reordering, which is what the version counter in
[03](03-host-authority.md) is for.

## Message kinds

Declared here, used by later steps.

| Kind | From | To | Purpose |
|---|---|---|---|
| `hello` | joiner | `*` | Announce presence, name, password proof |
| `welcome` | host | joiner | Accept; full state and word list follow |
| `reject` | host | joiner | Wrong or missing lobby password |
| `state` | host | `*` | Authoritative state, versioned |
| `intent` | any | host | Player action awaiting validation |
| `beat` | host | `*` | Liveness, every 2s when state is idle |
| `claim` | any | `*` | Election candidacy |
| `handoff` | host | `*` | Deliberate transfer, or `beforeunload` |
| `presence` | any | `*` | Avatar, ready state, arm markers, typing |
| `resync` | any | host | Request full state or word list |

## Diagnostics panel

Build it now; it is how you debug every later step. Reachable from a discreet
corner control, it shows:

- per transport: connected, relay count, peers discovered
- per peer: ICE connection state, whether relayed via TURN, round-trip from
  `room.ping()`
- routing: direct peers, messages forwarded, duplicates dropped

Plus a **Copy diagnostics** button and plain-language advice for the common
causes — a VPN, a corporate or school network, strict DNS filtering. Turning "it
doesn't work" into "MQTT connected, zero peers, try disabling your VPN" is the
highest-value thing in this document for a friends group.
