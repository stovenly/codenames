# codenames

Codenames for four or more, played peer-to-peer in the browser — no server, no
accounts, nothing to install. Share the link, take a seat, give a clue.

**Play:** https://stovenly.github.io/codenames/

Built on [Trystero](https://github.com/dmotz/trystero): players find each other
over public nostr, MQTT and BitTorrent infrastructure and then talk directly by
WebRTC, so nothing but the browsers holds the game.

Everything borrowed is credited in [CREDITS.md](CREDITS.md), and in the app under
the gear.

## Development

```
npm install
npm run dev      # vite dev server
npm run build    # builds into docs/, which GitHub Pages serves
npm test
```

`docs/` is build output and is committed — rebuild before pushing.
