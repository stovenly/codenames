# codenames

A browser version of the board game Codenames.

**Play:** https://stovenly.github.io/codenames/

## Features

**Engineering**

- Fully peer-to-peer, no server ([Trystero](https://github.com/dmotz/trystero) for signaling)
- Host authority with automatic host migration
- Delta sync with retry and self-repair
- Password protected lobbies

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

External assets used are credited in [CREDITS.md](CREDITS.md).

## Development

```
npm install
npm run dev      # vite dev server
npm run build    # builds into docs/, which GitHub Pages serves
npm test
```

`docs/` is build output and is committed — rebuild before pushing.
