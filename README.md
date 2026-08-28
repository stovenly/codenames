# codenames

Codenames for four or more, played peer-to-peer in the browser — no server, no
accounts, nothing to install. Share the link, take a seat, give a clue.

**Play:** https://stovenly.github.io/codenames/

## Features

**Engineering**

- Fully peer-to-peer, no server
- Host authority with automatic host migration
- Deterministic boards from a seed
- Delta sync with retry and self-repair
- Offline / installable

**Game**

- In-game chat: all, team, spymasters-only
- Post-match accolades
- Custom word lists
- Configurable boards: 3x3-7x7, bonus cards, multiple assassins
- Spectators
- Clue and guess timers
- Avatar packs
- Full game history and end-of-game board
- Undo / redo

**Accessibility**

- Colorblind mode
- Dyslexia friendly font

Built on [Trystero](https://github.com/dmotz/trystero): players find each other
over public nostr, MQTT and BitTorrent infrastructure and then talk directly by
WebRTC, so nothing but the browsers holds the game.

External assets used are credited in [CREDITS.md](CREDITS.md).

## Development

```
npm install
npm run dev      # vite dev server
npm run build    # builds into docs/, which GitHub Pages serves
npm test
```

`docs/` is build output and is committed — rebuild before pushing.
