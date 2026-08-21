# 09 — Resilience

**Depends on:** everything before it.
**Done when:** the app loads offline, degrades visibly instead of silently, and a
backgrounded host cannot quietly ruin the game for everyone else.

Connectivity hardening that belongs at build time — multi-transport, relay
redundancy, STUN, TURN, prewarm — is in [02](02-transport.md). This step is the
behaviour layered on top once the game exists.

## Alt-tab degradation

[03](03-host-authority.md#background-tab-throttling) keeps a backgrounded host
from triggering a spurious election. This is the part that stops it from
degrading play, and it escalates rather than nagging.

The host cannot see its own UI while hidden, so the early rungs use the two
surfaces that *are* visible from another tab: the document title and the favicon.

| Condition | Host sees | Everyone else sees |
|---|---|---|
| Hidden < 20s | nothing | nothing |
| Hidden >= 20s | title prefixed `(!) `, favicon gains an amber dot | quiet pill: *Host is away* |
| Degradation observed | title becomes `(!!) Come back - game is lagging`, favicon red | amber pill: *Host away, connections unstable* |
| Hidden >= 60s and degrading | as above; a notice in the host panel on return | automatic transfer to the best visible candidate, with a banner naming them |

**Degradation** means measured, not assumed: beat interval exceeding 5s, or
round-trip from `room.ping()` at double its rolling median. A host on a fast
machine whose tab is backgrounded but not throttled never sees rung three.

Automatic transfer is deliberate but reversible — the original host takes control
back from the host panel in [08](08-host-controls.md#transfer-host) whenever they
return. It never fires mid-reveal; it waits for a settled phase.

The proactive version of this notice, shown once in the waiting room before any
of it can happen, is in [05](05-waiting-room.md#host-tab-notice).

**RESOLVED — no Web Notifications.** The permission prompt is a real cost and
the title and favicon already reach a host who is looking at another tab, which
is the only case that matters.

## Broadcast deltas

Full state on every change is wasteful once a game is long.

- normal case: broadcast `{version, newSteps, cursor}` — typically under 100 bytes
- a client whose `version` gap does not line up sends `resync` for full state
- full state goes out on `welcome`, on host change, and on resync only
- undo and jump broadcast the cursor, not the steps, since clients hold them

Word lists ride the same principle: `Settings` carries only a hash, and the list
transfers once per player per game
([06](06-configuration.md#distribution)).

## Coalesce and throttle

- state broadcasts debounce at 50ms, so a burst of host activity is one message
- `presence` — arm markers, ready flags, avatar and name changes — is throttled to
  10/s per sender, ttl 2, and explicitly droppable; it never triggers a resync

## Load and offline

- **Service worker** precaching the shell. Instant repeat loads, and the app opens
  even if GitHub Pages is slow. Vite's hashed filenames make invalidation
  automatic; let the worker take over on activation.
- **No network assets.** Fonts self-hosted, icons inline SVG, avatar styles
  bundled and lazy-imported. Nothing external to fail, nothing to block first
  paint.
- **Bundle target: under 200 KB gzipped** for the initial load. Code-split the
  spymaster view, the host panel, and every avatar style beyond the 12 KB Shapes
  fallback; none are needed on first paint.

`404.html` and the hash-routing rule that make deep links survive are in
[01](01-foundations.md#hosting-constraints).

## Degraded modes

| Failure | Behaviour |
|---|---|
| One transport down | Invisible; the others carry discovery |
| All transports down | Status pill red, exponential-backoff rejoin, cached replica stays on screen |
| Host gone | Automatic promotion, banner naming the new host |
| Host backgrounded | Escalation ladder above |
| Peer unreachable directly | Routed through the mesh, then TURN |
| Peer unreachable entirely | Diagnostics panel with actionable causes |
| Mesh split | Warning banner, prompt someone to rejoin |
| Word list hash unknown | `resync` for the list, board renders once it lands |

The pattern throughout: **never a blank screen and never a silent failure.** Show
the last known board with a status pill over it, and say what is wrong.

## Final passes

- reduced motion, verified by actually setting the OS preference
- colourblind mode across every team-coloured surface
- full keyboard path from landing to a completed game
- responsive down to 360px at 7x7
- a real cross-network test: a phone on cellular against a desktop on wifi
