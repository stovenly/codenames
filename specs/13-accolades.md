# 13 — Accolades

**Depends on:** [04](04-game-core.md), [07](07-board-and-play.md), [12](12-history.md).
**Done when:** the losing team still has something to read at the end, and at
least one person at the table says "who did that".

## Why

The end screen currently reports who won and how many cards each side turned
over. That is a scoreboard, and a scoreboard is the least interesting thing
about a game of Codenames. What people actually want to relitigate is the moment
Dan confidently picked the assassin, or that one clue that landed four.

Overwatch's post-match cards are the shape to copy: a small set of named
recognitions, dealt face up after the result, each attached to one player and
one number. They work because they are **specific**, **attributed**, and
**not all flattering**.

## Shape

Exactly **four cards**, in a row under the result, dealt in during the confetti
with a stagger. Four because the roster minimum is four players, so four is
always fillable and always fits.

Each card carries:

- the player's avatar and name
- a title in marquee type
- the number behind it ("4 picks", "2 clues")

## The catalogue

Every accolade is a pure function of the step list and the board. Each returns a
player, a number, and a **weight** — how interesting it is that this happened.
The four highest-weighted results are dealt, and where two cards would name the
same player the lower-weighted one gives way to the next candidate, so four
different people are recognised whenever the room allows it.

Weights are a ranking, not a score anyone sees. Rarer and funnier beats common
and worthy: "picked the assassin" happens in one game in three and is the only
thing anyone will remember, so it outranks every competent thing that happened.

| Title | For | Weight |
|---|---|---|
| **Saboteur** | picked the assassin | 100 |
| **Closer** | picked the winning card | 70 |
| **Mind Reader** | most correct picks off a single clue | 62 |
| **Sharpshooter** | most correct picks, no wrong ones | 60 |
| **Wordsmith** | spymaster, most correct picks across their clues | 55 |
| **Double Agent** | most cards handed to the other team | 52 |
| **Butterfingers** | most wrong picks | 50 |
| **Collateral Damage** | most neutral cards found | 45 |
| **Trigger Happy** | most picks of any kind | 35 |
| **Overpromised** | spymaster, highest clue number given | 34 |
| **Cold Feet** | passed the most turns | 33 |
| **Dead Weight** | on a team all game, never picked | 30 |
| **Team Leader** | took most of a side's moves, weighted by side size | 34–72 |

Ties break toward the player who did it earliest, so the card is about a moment
rather than an alphabetical accident.

If fewer than four accolades qualify — a game that ended on the first turn — the
row is short. Padding it with "was present" cards is worse than three cards.

## Rules

- **Every card names somebody.** No "the red team" cards. The joke needs an
  owner.
- **A title says on sight whether it is a compliment.** Nobody should have to
  work out which way "Civilian Liaison" was meant. Quirky-but-ambiguous is the
  joke going off in the wrong order.
- **Blunders are welcome, insults are not.** "Butterfingers" and "Dead Weight"
  are the floor. Nothing that reads as an actual judgement of a person.
- **Nothing that reveals the key.** Accolades are computed from what was
  revealed in play. A game abandoned mid-way has no accolades to give, and the
  cards simply do not appear.
- **Everyone sees the same four.** They are derived from shared state with no
  randomness, so the table can argue about them.

**OPEN — resolved.** Considered animating a "winner" card larger, as Overwatch
does with votes. Rejected: voting needs a round trip and a timer, and the end
screen already has a rematch to get to.
