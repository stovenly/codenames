# 05 — The first team's bonus cards

> Shipped, including the update to [04 — game core](../04-game-core.md), which
> this change reverses. Five existing tests asserted the rule it overturns and
> were rewritten to assert the new one; a compatibility test proves a settings
> object with no `bonusCards` deals a board identical to `bonusCards: 0`.

**Done when:** the starting team is dealt more agents than the other by a number
the host sets, the default matches the published game, and the composition row
shows the difference as a card that could go either way.

### This overturns a resolution

[04 — game core](../04-game-core.md) said both teams always get the same number
of agents, and gave its reason: a slider that produces 9 red against 8 blue reads
as a bug to the people playing. That reason is answered rather than dismissed —

- the asymmetry is **named**, by a labelled slider that defaults to 1, rather
  than being an artifact of arithmetic;
- it is **shown** before the deal, as a card the preview draws as belonging to
  neither side yet;
- and it is **optional**: set it to 0 and the board is exactly what ships today.

The `Settings` comment in `src/game/settings.ts` — *per team; starting team gets
one more* — already describes this behaviour and has never been true. Building
this makes the comment honest. Update `specs/04-game-core.md` in the same change
rather than leaving two documents disagreeing.

### Settings

```ts
type Settings = {
  size: BoardSize
  teamCards: number      // per team, before the bonus
  bonusCards: number     // extra agents for whoever starts
  assassins: number
  …
}
```

Derived, where `N = size²`:

```
startTeam = teamCards + bonusCards
otherTeam = teamCards
neutral   = N − 2·teamCards − bonusCards − assassins
```

**Defaults**, replacing the table at `specs/04-game-core.md:96`. 5×5 is now the
published game exactly — 9, 8, one assassin, seven bystanders:

| Size | N | Per team | Bonus | Assassins | Bystanders |
|---|---|---|---|---|---|
| 3×3 | 9 | 3 | 1 | 1 | 1 |
| 4×4 | 16 | 5 | 1 | 1 | 4 |
| 5×5 | 25 | 8 | 1 | 1 | 7 |
| 6×6 | 36 | 11 | 1 | 2 | 11 |
| 7×7 | 49 | 15 | 1 | 2 | 16 |

**Validation** gains `bonusCards >= 0`, and the two existing dial ceilings move:

```
maxTeam  = floor((N − assassins − bonusCards) / 2)
maxBonus = N − 2·teamCards − assassins
```

`neutral >= 0` and the degenerate-board warning are unchanged in meaning.

### The slider

**First team's bonus cards**, under Team cards in `SettingsPanel`, same `Dial`,
`min={0} max={maxBonus}`, default 1. The label reads `First team's bonus cards —
1` like its neighbours, and the panel's read-only mirror for non-hosts gains a
matching `Readout`.

### The deal

`buildBoard` (`src/game/board.ts:14`) already takes `startTeam`, so the bag grows
by one term:

```ts
...Array<Colour>(Math.max(0, perTeam + bonus)).fill(startTeam),
...Array<Colour>(Math.max(0, perTeam)).fill(other),
```

Nothing downstream needs to know. `derive` counts actual cards for `remaining`,
`totals` and both win conditions (`src/game/reducer.ts:56`), the HUD scores read
those, and `ClueComposer`'s ceiling is `view.remaining[turn]`. The asymmetry is
already handled everywhere it lands.

### The split card

The composition row (`src/ui/host/Composition.tsx`) cannot know which side starts
— nothing does until `startGame` flips its coin — so it draws each bonus card as
belonging to both:

- a cell split down the middle, red left, blue right, hard edge at 50%, in the
  same `TONE` tints as its neighbours so it reads as one of the family;
- a new symbol in `src/ui/board/symbols.tsx`: the existing `Agent` silhouette
  drawn twice, each copy clipped to its half of the split, red left and blue
  right — the same figure the other agent cells carry, wearing both colours;
- ordered between the red block and the blue block, so the row reads
  *assassin · red · contested · blue · neutral*;
- the row's `aria-label` gains `n either-team`, and the cell carries
  `title="Goes to whichever team starts"`.

At `bonusCards: 0` no such cell exists and the row is what it is today. The board
itself never draws one: by the time a card is on the table it has a colour.

### Wire compatibility

A client on an older build broadcasts `Settings` with no `bonusCards`. Every
consumer reads `settings.bonusCards ?? 0`, so a board dealt by an old host
derives identically on a new client — which it must, because both are rebuilding
the same seed, and a disagreement there is a divergent board rather than a
cosmetic difference. `defaultSettings` returns 1; the `?? 0` is only for state
that arrived from somewhere else.

### Tests

In `src/game/game.test.ts`:

- `composition()` sums to `N` at every size, with bonus 0, 1 and 3
- the built board holds `teamCards + bonus` of the start colour and `teamCards`
  of the other
- the extra card does not decide the game: the second team can still clear its
  own cards first and win
- `bonusCards: 0` produces boards identical to the current build for a fixed seed
