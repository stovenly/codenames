# 11 — Showtime

**Depends on:** everything before it.
**Done when:** a person who has never seen the repo opens the page and thinks
"this is a game", not "this is a web app about a game".

This step **replaces the design concept in [01](01-foundations.md#design-system)**.
It is not another polish pass. Step 10 tidied the execution of a concept that
was wrong for the product, and tidy is not the problem — the Briefing Room is a
quiet, restrained, document-shaped idea, and Codenames played with friends is a
loud, theatrical, one-decision-at-a-time party game. Restraint is exactly the
wrong instinct here.

## The concept

**Prime-time studio.** A television game show and a live lottery draw share one
visual language, and it is the right one: a dark arena, a lit stage, chrome and
lacquer, marquee bulbs, and a board of illuminated plates that light up one at a
time while everyone watches. The energy comes from **light** — bulbs, spots,
gloss, and the moment a plate goes hot — not from colour count or decoration.

Three rules that decide every question below:

1. **The board is the set.** Everything else is furniture around it. If a
   control competes with the board for attention, it is wrong.
2. **Light is the state.** Whose turn it is, what is armed, what just landed —
   all of it reads as illumination before it reads as colour or text.
3. **Every reveal is broadcast.** One card at a time, held, with a sting. Never
   two things resolving at once.

### Rejected

- **Casino floor** — felt, chips, neon. Reads as gambling rather than a game
  show, and the mechanic here is a quiz, not a wager.
- **Retro arcade / CRT** — scanlines and pixel type. Fashionable, unrelated to
  the game, and it fights word legibility at 7x7.
- **Keeping the dossier and adding sparkle** — what step 10 already tried. The
  concept has to change or the result is a quiet app with confetti on it.

## Palette

Studio black with a lit stage, one warm metal, two team colours that are allowed
to be genuinely saturated because they are the mechanic.

```css
--stage-000: #05060B;  /* the black beyond the set */
--stage-900: #0A0D18;  /* arena floor */
--stage-800: #121A2E;  /* plate, unlit */
--stage-700: #1B2740;  /* plate, hover */
--stage-glass: #26365A; /* bevel highlight */

--lamp-500: #FFC53D;   /* marquee bulb, lit */
--lamp-300: #FFE29A;   /* bulb bloom */
--lamp-dim: #4A3A18;   /* bulb, unlit */

--gold-500: #C9962C;   /* chrome/brass edge */
--gold-200: #F2DCA0;   /* specular */

--red-500: #F04438;  --red-lit: #FF7A5C;  --red-deep: #7A1A12;
--blue-500: #2E86FF; --blue-lit: #6FB6FF; --blue-deep: #10305E;

--bone: #F1ECE0;       /* bystander plate */
--kill: #0B0B0E;       /* assassin plate */
--kill-lit: #FF2D2D;   /* assassin alarm */

--text: #F5F7FF;
--text-dim: #93A0BF;
```

Contrast rule from [01](01-foundations.md#accessibility-baseline) is unchanged:
dark text on a light plate, never white on saturated red. Team identity still
carries a glyph and a pattern as well as hue, and the colourblind toggle still
raises their contrast.

## Type

The current stack is one grotesque doing every job, which is why nothing on
screen shouts. Three faces, each with a job it is actually built for:

| Role | Face | Package | Used for |
|---|---|---|---|
| Marquee | **Bungee** | `@fontsource/bungee` | The wordmark, team names, the turn band, WINS/ASSASSIN. Signage type, drawn for exactly this |
| Plate | **Oswald** | `@fontsource-variable/oswald` | Card words. A signage face people have read a thousand times without noticing: condensed enough for 7x7 on a phone, familiar enough not to announce itself |
| Text | **Chivo** | `@fontsource-variable/chivo` | Clues, timers, counts, labels, the little prose there is |

**No monospace anywhere.** A fixed-pitch face exists so code columns line up;
using one as an interface font is the single loudest signal that a screen was
assembled rather than designed. JetBrains Mono is the worst offender because it
is literally a code editor's font, but swapping it for a nicer monospace does
not fix anything — the problem is the genre, not the family. Digits get tabular
figures from `font-variant-numeric` and the `tnum` feature, which is all the
alignment a timer or a scoreboard ever needed.

**Not Anton either.** It is the default answer to "condensed display face" and
is on half the web. Neither it nor JetBrains Mono is bad type; both are the
obvious pick, and the obvious pick is what makes an interface look generated.

All three are variable or single-weight and subset by unicode-range, so only
latin is fetched and the committed `docs/` does not grow by every writing
system.

## Packages

Researched against the registry rather than recalled. Every one earns a line.

| Package | Version | Why it, and not hand-rolling |
|---|---|---|
| `motion` | 13.x | Already in. Stays the animation core |
| `canvas-confetti` | 1.9.4 | ~2 KB gz, real physics, off the main thread of layout. Hand-rolled confetti is 60 DOM nodes animating position, which is what the game-over screen does today |
| `@number-flow/react` | 0.6.2 | Odometer digits done properly — correct digit-by-digit travel, respects reduced motion. Scores and the clue count. Hand-rolled today as a crossfade, which reads as a swap rather than a count |
| `lucide-react` | 1.33.0 | One icon set on one grid, tree-shaken per icon. Replaces the hand-drawn SVGs, which will drift the moment a fourth icon is needed |
| `@radix-ui/react-dialog` | 1.1.23 | Focus trap, escape, scroll lock, `aria-modal` for the host drawer and confirmations. This is the part hand-rolled dialogs always get wrong |
| `@radix-ui/react-tooltip` | 1.2.16 | Icon-only controls need accessible names on hover *and* focus |
| `@radix-ui/react-slider` | 1.4.7 | Keyboard-operable board-size and count sliders with a styleable track. `input[type=range]` cannot be made to look like a stage control |
| `@radix-ui/react-toggle-group` | 1.1.19 | Roving tabindex for the timer and pack pickers, which are currently a row of buttons with no group semantics |
| `class-variance-authority` | 0.7.1 | Variants declared once instead of template-literal class soup |
| `tailwind-merge` + `clsx` | 3.6.0 / 2.1.1 | Makes a `className` override actually override rather than losing to specificity order |
| ~~`vaul`~~ | — | Dropped during the build. `@radix-ui/react-dialog` already gives the host panel focus management, and a bottom sheet is two CSS rules from there — not worth a second overlay library |

**Considered and rejected:**

- **`tone`** (15.x) — a real synth would make better stingers, but it is a large
  dependency for a handful of cues and the existing WebAudio module already
  produces them. Revisit only if the cues are the weak point after this step.
- **`@tsparticles/*`** — a whole particle engine where `canvas-confetti` covers
  the two effects we need.
- **`matter-js`** — a physics engine for a lottery-ball machine that would be a
  set piece nobody asked for.
- **`sonner`** — host-action feedback is one banner; a toast library is more
  surface than the problem.
- **`react-aria-components`** — overlapping with Radix, and we are not shipping
  both.
- **Lottie** — needs an animator and asset files, and the whole design holds
  because nothing is fetched.

## The set

The stage is built once, in CSS, and every screen sits inside it:

- **Floor and horizon** — a radial pool of light behind the content, falling off
  to `--stage-000` at the edges. Fixed, so it does not travel on scroll.
- **Haze** — one very low-opacity noise layer over the whole page. It is what
  stops flat panels reading as flat.
- **Marquee bulbs** — a row of lamps rendered as a repeating radial gradient.
  Lit bulbs bloom; unlit sit at `--lamp-dim`. A chase animation runs at 1.2s per
  cycle and *only* during a live moment: the current team's rail, the wind-up,
  the win. A permanently chasing border is a casino, not a set.
- **Spot cones** — two soft conic gradients from above, tinted to each team,
  brightening on that team's turn.

## Plates

The card stops being a paper tile and becomes a lit plate: bevelled edge, dark
lacquer face, a specular sweep that follows the pointer, and a lamp behind it
that comes on when it is armed.

| State | Treatment |
|---|---|
| Unlit | Dark lacquer, gold hairline bevel, resting shadow |
| Hover | Specular sweep tracks the pointer, bevel brightens, lifts 4px |
| Armed | The lamp behind it comes on, bulbs on the plate's frame light, teammate chips drop in |
| Wind-up | Everything else on the stage dims; this plate is the only lit object |
| Revealed | Face floods to the team lacquer, gloss highlight snaps across, elevation drops |
| Dead | Desaturated, gloss removed, sits back into the wall |

Word type is Anton, uppercase, auto-fit by container query, with a subtle
letterpress: one-pixel dark offset below and a light offset above.

## Signature moments

Nothing here changes a rule, a message, or a piece of state — this is the
[lagging cursor](07-board-and-play.md#the-lagging-cursor) driving better
pictures.

**Title card.** The landing is the show's opening: the wordmark in marquee type,
bulbs around it igniting in sequence over 900ms, a spotlight sweeping once
across the stage, then the name field rising. It should be obvious within one
second what kind of thing you have opened.

**Podiums.** The lobby stops being three columns of cards. Each player is a lit
podium: avatar behind glass, name plate below in marquee type, a lamp that comes
on when they are ready. Empty podiums stand dark and waiting, so a room that is
filling up looks like a room that is filling up.

**The question.** A clue arrives on a plate that rises from the floor of the
stage with the word typing in and the number landing beside it, held under a
spotlight, then docking to the HUD. The existing sequence, on a set.

**The draw.** The wind-up from [07](07-board-and-play.md#reveal-choreography)
becomes a physical reel cabinet, and the cabinet is a **prop on the set** rather
than a second visual language: same lacquer, same gold bevel, same marquee
lamps. It rises out of the stage floor under a spotlight on a servo whine, the
stage blacks out behind it, and three reels spin.

All three reels land on the same symbol, because there is only ever one outcome
— the reels are not deciding anything. That is exactly what makes it work:
seeing the first reel stop on a skull, then the second, then the third, is a far
worse way to find the assassin than watching a card change colour. Reels settle
left to right at 900 / 1350 / 1800ms after a 400ms rise, each with a detent
click a semitone up from the last, so three landing reads as a phrase. The
payline then flashes in the outcome colour and the cabinet drops away as the
plate on the wall flips to match.

Under `prefers-reduced-motion` the cabinet never appears at all and the plate
simply changes colour.

**Blackout.** The assassin kills the stage lights. Everything to `--stage-000`
for 180ms of true black, then the emergency wash comes up in `--kill-lit` with
the klaxon, ASSASSIN in marquee type, and the bulbs strobing. It should make
someone in the room swear.

**The win.** Confetti cannons from the two bottom corners via `canvas-confetti`,
the winning team's rail chasing at double speed, the score odometer spinning up,
and the wordmark relighting. The one screen allowed to be completely over the
top.

## Sound

The cues stay synthesized and the module stays ours. What changes is that they
are written as **stings** rather than beeps: a three-note brass hit for a correct
plate, a descending two-note bed for a wrong one, a rising filtered riser under
the wind-up that resolves on the landing, and a klaxon with a noise bed for the
assassin. Mute stays an icon in the corner controls, on every screen.

## What comes out

Deleting is most of the work:

- the Briefing Room palette, the dossier tab, the trim marks, the paper grain
- `type-title` / `type-display` / `type-heading` as they exist, replaced by the
  three-face scale above
- the hand-drawn icon set, replaced by `lucide-react`
- every hand-written `className` variant string, replaced by `cva`
- the hand-rolled confetti and the crossfade counters
- **any remaining copy that explains the app to the player.** Nobody playing a
  game cares how it is built, and there should be no sentence in the UI that
  only makes sense to someone who has read this repo

## Budget

First paint must stay under **200 KB gzipped**, which it currently clears at
~127 KB. Estimated additions: Radix primitives ~14 KB, `@number-flow/react`
~7 KB, `cva`/`clsx`/`tailwind-merge` ~4 KB, `canvas-confetti` ~2 KB,
`lucide-react` ~2 KB for the icons actually imported, minus Inter and the
hand-rolled effects that come out. `vaul` is loaded with the host drawer, which
is already split. Fonts are separate requests and latin-only.

Measured after the build: **179 KB gzipped** for first paint. The three new
faces are separate requests and latin-only.

Roughly 27 KB of that is the two traced silhouettes, which are in the entry
deliberately. They were split out at first, which is the textbook call for
background art — but a lazily-loaded backdrop announces itself when it lands,
and a preload hint plus a fade only softened that. A backdrop that arrives after
the page is a worse defect than 27 KB, so it renders with everything else.

## Done when

- The landing is recognisably a game's title card, not a form with a heading
- Whose turn it is can be read from across the room with the text unreadable
- A reveal makes people look up
- The assassin gets a reaction
- Nothing on screen explains the implementation
- First paint is still under 200 KB gzipped, `prefers-reduced-motion` still
  strips every set piece, and the full keyboard path still completes a game
