# Codenames — spec

A peer-to-peer Codenames web app. Entirely static, hosted on GitHub Pages, with
no backend of any kind: no signalling server, no database, no accounts.

One player creates a lobby, shares a link, and becomes the host. The host owns
game state and broadcasts it. Every other client renders what it receives and
sends intents back. If the host leaves, someone else is promoted.

## How to use this spec

**The documents are in build order.** Work 01 through 11 in sequence. Each one
states what it depends on, what to build, and what "done" looks like, and each
ends somewhere you can open in a browser and see working. Nothing in a document
depends on a later one.

| Step | | Done when |
|---|---|---|
| [01](01-foundations.md) | Foundations | Deployed page at the real URL, design system in place |
| [02](02-transport.md) | Transport | Two browsers exchange messages, diagnostics panel live |
| [03](03-host-authority.md) | Host authority | Roster with password join; killing the host promotes someone |
| [04](04-game-core.md) | Game core | A full game playable headlessly, unit tested |
| [05](05-waiting-room.md) | Waiting room | Ready-up lobby with avatars and proposed settings |
| [06](06-configuration.md) | Configuration | Host can set board, timers, and word lists |
| [07](07-board-and-play.md) | Board and play | The game, and it feels good |
| [08](08-host-controls.md) | Host controls | History, undo, transfer, end game |
| [09](09-resilience.md) | Resilience | Hardened, offline-capable, degrades visibly |
| [10](10-polish.md) | Polish | Reads as one designed thing, not nine steps stacked up |
| [11](11-showtime.md) | Showtime | Looks like a game show, not a web app about a game |

Items marked **OPEN** need a decision before that section is built. None of them
block an earlier step. Resolutions are recorded inline where the item was
raised, rather than in a separate log.

## Scope and posture

Built for a group of friends. This is a real constraint that shapes several
decisions, not an excuse:

- **Zero external accounts.** One static repo is the entire budget. Every
  measure in this spec is free public infrastructure or config, never a service
  we sign up for.
- **No trust boundary.** Every client holds the full game state, including the
  spymaster key. Concealment is presentational plus light obfuscation — enough
  that nobody stumbles into the answers, not enough to stop anyone determined.
- **No persistence.** State lives in connected browsers. When the last player
  leaves, the game is gone.
- **Small rooms.** 4-10 players. The mesh does not need to scale past that.
- **Availability over consistency.** On a genuine network partition we tell the
  players and let them fix it, rather than merging divergent state.
