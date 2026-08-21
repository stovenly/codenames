# 01 — Foundations

**Depends on:** nothing.
**Done when:** the app deploys to the real GitHub Pages URL, renders a styled
placeholder, and the design tokens and motion rules are usable by later steps.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + TypeScript | Static output, no server step |
| UI | React 19 | State is a single broadcast object; declarative rendering suits it |
| Styling | Tailwind v4 | Design tokens live in CSS vars, no config file |
| Motion | Motion (`motion/react`) | Layout animations and springs; the UI leans on these |
| Transport | Trystero 0.25+ | Peer discovery with zero accounts |
| Avatars | `@dicebear/core` + per-style JSON | Local SVG generation, no API |
| Hosting | GitHub Pages | Static, HTTPS (required for WebRTC) |

**Node 20.19+ or 22.12+** — current Vite refuses to install below that line.

No runtime dependency on any service we do not control, except the public relays
Trystero uses for the initial handshake.

## Hosting constraints

- **No path routing.** Pages 404s on `/room/abc`. All routing state goes in the
  URL hash: `https://<user>.github.io/codenames/#r=<roomId>`. The hash is never
  sent to GitHub's servers, a small privacy win as well.
- **`base` must be set**, or asset URLs break under the project subpath.
- **`404.html` duplicates the built `index.html`**, so a mistyped or truncated
  link still loads the app instead of GitHub's 404. It has to be generated after
  the build, not kept in `public/` — a hand-written copy would reference
  unhashed asset paths that do not exist in the output.
- **`.nojekyll` must exist in the output.** Pages runs Jekyll by default, which
  silently drops files and folders beginning with an underscore. Keep an empty
  `.nojekyll` in `public/` so Vite copies it through.

```ts
// vite.config.ts
base: '/codenames/',        // '/' if this is a <user>.github.io repo
build: {
  outDir: 'docs',
  emptyOutDir: true,
  sourcemap: false
}
```

`sourcemap: false` is load-bearing, not a size optimisation — see
[#obfuscation](#obfuscation).

## Repo layout

```
/
  index.html                source entry, not the served one
  docs/                     BUILD OUTPUT, committed, never hand-edited
  public/                   copied verbatim into docs/
    .nojekyll
  src/
    main.tsx
    net/          transports, envelope, router, host election, protocol
    game/         types, reducer, prng, board, intents
    state/        replica store, version handling, resync, reveal theatre
    ui/
      screens/    landing, waiting room, game, gameover
      board/      Board, Card, reveal choreography
      hud/        clue display, timer arc, turn banner
      host/       host panel, history, settings
      spymaster/  spymaster chrome
      avatar/     picker, renderer
      sound/      WebAudio synthesis
    data/
      wordlists/  *.json, SOURCES.md
      relays.ts   curated relay URLs per transport
  scripts/
    build-wordlists.ts
    postbuild.mjs           copies docs/index.html to docs/404.html
  specs/
```

`net/`, `game/`, and `ui/` do not import each other except through `state/`. The
reducer imports nothing outside `game/`, which is what keeps it testable.

## State ownership

**The host is authoritative.** Exactly one client at a time holds the writable
copy. Everyone else holds a read-only replica and sends intents.

```
operative clicks card
  -> intent {kind: 'guess', card} routed to host
  -> host validates against current state
  -> host appends a Step, bumps version
  -> host broadcasts to all
  -> every client, host included, renders from the broadcast
```

The host renders from its own broadcast too. No optimistic local path, no
host-only code path for applying moves. This costs a round trip on the host's own
actions and buys one implementation of every rule.

Rejected alternatives: a CRDT adds merge semantics for conflicts the turn
structure already prevents; majority-vote reconciliation adds a consensus
protocol to solve a problem that does not arise when one client is the writer.

## Obfuscation

The spymaster key is in every client's memory. It has to be — any peer may relay
a message it is not the recipient of, and we are not encrypting per-recipient.
This is accepted. What we do is make it non-trivial to stumble over:

1. **Nothing on `window`.** State lives in module scope and React context. No
   global handles, no debug hooks in the production build.
2. **Obfuscate at rest and in flight.** JSON, XOR'd with a key derived from the
   room id, then base64. One `atob()` does not yield readable JSON.
3. **No source maps in production.** This does most of the actual work —
   readable identifiers in a minified bundle are what makes casual poking easy.
4. **Bland identifiers.** The key is not called `key`, `answers`, or `solution`
   in any field name that survives minification.

Not claimed: this stops nobody who sets a breakpoint. It is an honesty rail.

## Persistence

`sessionStorage`, for reconnect only: last state replica, display name, room id,
the password that worked, and a persistent `playerId`.

`localStorage`, for things that outlive a session: saved custom word lists,
avatar choice, audio mute, reduced motion override, colourblind mode.

Nothing here is a source of truth. On rejoin the host's broadcast overwrites the
replica wholesale.

## Design system

**Superseded by [11](11-showtime.md).** The concept below shipped through step
10 and was wrong for the product: a quiet, document-shaped idea for a loud party
game. The tokens here are kept only as the record of what 11 replaces.

**Concept: The Briefing Room.** A 1960s spy-thriller dossier lit by a modern
gameshow rig. Dark, warm, physical — brass and ink rather than neon — with the
gameshow energy coming from lighting and timing rather than bright colour.

The organising principle: **choices should feel heavy.** Codenames is long
silences and one committed decision. The UI should make that decision feel like
pulling a lever, not clicking a link.

Dark theme only. A light variant would fight the concept and double the work.

```css
--ink-900: #070A14;  /* page */
--ink-800: #0D1220;  /* panels */
--ink-700: #161D30;  /* raised surfaces */
--ink-600: #232C44;  /* borders */

--brass-400: #D9A441;  /* primary accent, host authority */
--brass-200: #F0D18A;

--red-500:  #E0503F;  --red-glow:  #FF6B57;
--blue-500: #3D8BE8;  --blue-glow: #5FA8FF;
--bone:     #E8E3D6;   /* neutral cards */
--void:     #05060A;   /* assassin */
--void-rim: #C41E1E;

--text:     #EDEFF5;
--text-dim: #8A93AC;
```

Type, self-hosted via Fontsource so the site stays fully static:

- **Display** — a wide condensed grotesque (Archivo Expanded) for team names,
  banners, the clue reveal
- **Mono** — JetBrains Mono for clue readouts, timers, counts
- **Body** — Inter

Motion durations: 120ms feedback, 250ms state change, 700ms set pieces. Springs
over easing curves for anything physical.

## Accessibility baseline

Established here, obeyed by every later step.

- **`prefers-reduced-motion` is honoured and not negotiable.** Drop tilt,
  parallax, and particles entirely; keep colour and opacity transitions; cut
  every duration to 120ms.
- **Hue is never the only signal.** Red and blue *is* the game mechanic, so team
  identity always carries a glyph (diamond vs circle) and a pattern fill
  (diagonal hatch vs dots) as well as colour. The colourblind toggle raises their
  contrast rather than adding them.
- Text on any coloured surface clears 4.5:1 — dark text on a light wash, never
  white on saturated red.
- Everything reachable by keyboard, with visible focus rings.
- `aria-live` for anything that changes without the player acting.

## Deployment

The site builds into **`/docs`** on `main`, and GitHub Pages serves that folder
directly. No Action, no `gh-pages` branch, no deploy step: build, commit, push.

```
Settings -> Pages -> Source: Deploy from a branch -> main -> /docs
```

```json
"build": "vite build && node scripts/postbuild.mjs"
```

`postbuild.mjs` copies `docs/index.html` to `docs/404.html` after the hashed
asset names are known.

Consequences worth knowing:

- **`/docs` is generated. Never hand-edit it.** `emptyOutDir: true` wipes the
  folder on every build, so anything that must reach the served output goes in
  `public/`.
- **The build output is committed**, which is the cost of dropping the Action.
  Forgetting to rebuild before pushing ships a stale site. Guard it with a
  pre-push hook, or simply always run `npm run build` as part of committing.
- **Diffs are noisy.** Add `docs/** linguist-generated=true` to `.gitattributes`
  so GitHub collapses them in reviews.
- Minified, source-map-free output is what gets served, which is also what
  [#obfuscation](#obfuscation) depends on.

## Testing posture

Deliberately light, matching the stakes.

- **Unit** — the reducer, board generation and validation, word-list
  normalization, custom-list validation. Pure functions, cheap, high value.
- **Manual** — everything network. Two browsers on one machine covers the happy
  path; a phone on cellular against a desktop on wifi is the test that finds
  things.
- **No E2E harness.** Not worth the setup at this size.
