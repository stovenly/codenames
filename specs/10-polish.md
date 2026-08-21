# 10 — Polish

**Depends on:** everything before it.
**Done when:** the app reads as one designed thing rather than nine steps stacked
up, and nothing in it looks like it was assembled from defaults.

Steps 01 to 09 build the machine. This step is the pass that makes it feel
authored. It changes no behaviour: no new state, no new messages, no new rules.
If a change here alters what the reducer does, it belongs in another document.

## What we are correcting

Software built quickly converges on a recognisable look, and the tells are
consistent. Every one of them is present somewhere in 01–09 and every one is
worth naming, because "make it look nicer" is not an instruction anyone can act
on.

| Tell | What it looks like here | The correction |
|---|---|---|
| **Card soup** | Every region is a rounded rect with the same 1px border and the same background. Nothing dominates. | Three surface levels, used for depth. Most groupings need whitespace and a rule, not a box. |
| **Uniform rhythm** | The same padding and the same gap at every level, so no relationship reads as tighter than another. | A spacing scale with real jumps. Related things nearly touch; unrelated things get a lot of room. |
| **Badge spam** | Small pills carrying information that is not worth a pill. | Pills are for live status only. Everything else is a label or plain text. |
| **Flat type** | Four sizes that are all nearly the same, all at the same weight. | One dominant size per screen and a large gap to the next. Labels are small, letterspaced and dim; they never compete. |
| **Everything centred** | Symmetrical stacks down the middle of a wide screen. | Anchor content to a left edge and let the right side breathe. Centre only what is genuinely a moment. |
| **Accent everywhere** | Brass on every border, every heading, every hover. | Brass marks host authority and the single primary action on screen. If it is everywhere it means nothing. |
| **Glow as texture** | Shadow and glow used to add interest rather than to signal elevation. | Elevation is a scale of four. A thing glows because it is lifted, never for decoration. |
| **Ad-hoc motion** | Durations and easings chosen per component. | Every transition draws from the shared vocabulary. A number that appears in only one file is a bug. |

## Typographic scale

Fixed, and used everywhere. Ad-hoc sizes in component files are what makes a UI
drift.

| Role | Face | Treatment |
|---|---|---|
| Title | Display | Expanded, uppercase, tight leading. One per screen |
| Heading | Display | Small, uppercase, brass, above a rule |
| Readout | Mono | The clue, timers, scores, counts. Tabular figures |
| Label | Mono | 10-11px, `0.18em` tracking, dim. Names a control, never explains it |
| Body | Body | 13-14px, generous leading, dim. Only where a sentence is genuinely needed |

## Surfaces and depth

Four elevations, and a surface picks one:

0. **Page** — `ink-900`, the desk.
1. **Panel** — `ink-800`, a hairline top highlight, no border in most cases.
2. **Raised** — `ink-700`, a real shadow. Cards, the host drawer.
3. **Lifted** — anything mid-interaction: an armed card, the spotlit card during
   a wind-up.

Borders are the exception, not the default. Where two surfaces meet, contrast
does the work; a rule is drawn only when the boundary carries meaning.

## The dossier, actually

The concept in [01](01-foundations.md#design-system) is a physical file. It
should be visible in the details, not just the palette:

- **Paper grain** on every raised surface at very low opacity, the same tile
  everywhere
- **Printed rules** — hairlines that fade at both ends rather than hard 1px
  lines running edge to edge
- **Registration marks** in panel corners, tiny and dim, the way a printed form
  is trimmed
- **Stencilled labels** — the mono label style is the stencil on a filing box
- **A file tab** on the roster and the host drawer, so a panel reads as a folder

None of this costs a request: it is CSS gradients and inline SVG.

## Motion vocabulary

One set of tokens, defined once, used by every component:

- **`enter`** — 12px rise plus fade, soft spring. Everything that appears
- **`pop`** — scale from 0.94, firm spring. Things that are acknowledging a click
- **`settle`** — the heavy spring. Things with mass: the board, the turn band
- **`stagger`** — 40ms between siblings, capped at 6 so a full roster does not
  crawl in

Screens stagger their regions on entry. Under `prefers-reduced-motion` the
stagger collapses to zero and every variant becomes a 120ms fade — which the
tokens handle, so no component needs its own conditional.

## Screen-by-screen

- **Landing** — a title screen, not a form. The wordmark is genuinely large and
  left-anchored, the form sits beneath it in a narrow column, and the room's
  three-transport nature is stated once in small type rather than shown.
- **Waiting room** — the roster is the dossier. Team columns get stencilled
  headers and a tinted rail rather than a dashed box; the settings mirror is a
  list of label/value rows, not a stack of panels.
- **Game** — the board dominates and everything else recedes. The HUD is one bar
  with the clue as its largest element; scores sit at the edges.
- **Game over** — the one screen that is allowed to be centred and loud.

## Consistency sweep

Mechanical, and the part most likely to be skipped:

- every interactive element has the same focus ring, hover transition and
  disabled treatment
- every icon is inline SVG on the same 12px grid with `currentColor` — no emoji
  anywhere, in any string
- one radius scale; no component invents its own
- one shadow scale, tied to the elevation levels above
- ellipses, arrows and dashes are real characters, not ASCII
- no text in the UI describes the implementation to the player

## Out of scope

Reordering screens, adding settings, changing what the host validates, or any
change to `Shared`. If a polish idea needs a new field, it is a feature and it
goes in its own step.
