# 12 — The log

**Depends on:** [04](04-game-core.md), [07](07-board-and-play.md), [08](08-host-controls.md).
**Done when:** a player who joined the table three turns ago can work out what
has already been tried, without asking anyone.

## Why

Codenames is a memory game that nobody admits is a memory game. Four turns in,
the table has forgotten which of the two clues about animals is still live, who
already burned a guess on WHALE, and whether the neutral card that came up was
theirs or the opponent's. The board shows the *result* of all that and none of
the reasoning, so the group reconstructs it out loud, badly, every turn.

The host already has this. `HostPanel` renders the step list to drive undo,
redo and jump, and it is the only place in the app that can answer "what
happened". That panel exists to *edit* history; this step is about *reading* it,
and the two want the same list underneath.

## What it is

One derivation, `readLog`, turning the step list into rows a person can read.
Two presentations of it:

- **Read** — every player. Clues, picks and turn changes, in order.
- **Edit** — the host only, in the existing host panel: the same events, one row
  per step with a score column, as jump targets for undo and redo.

They stay separate presentations because they answer different questions. The
player's asks "what has been tried"; the host's asks "which step do I want to be
standing on", and needs a row for every step including the ones the player's log
has nothing to say about.

The host's panel keeps its controls. Nothing about undo, redo or jump becomes
visible to a player, and no player-facing surface offers them: a player who can
see a rewind button will press it.

## What a row says

Three kinds of row, in step order, grouped under the turn they belong to:

| Step | Row |
|---|---|
| `clue` | who, the word, the number |
| `guess` | who, the word, and what it turned out to be |
| `endTurn` | why the turn ended — out of guesses, passed, wrong pick, or the clock |

A `guess` row carries the colour it landed on, as the same symbol the card uses.
A pick that ended the turn reads as such rather than as a bare colour, because
"NEUTRAL" and "and that ended the turn" are different facts and the second one
is the one people forget.

The `start` and `end` steps are not rows. The first is nothing to report and the
second is the game-over screen's job.

## Secrecy

The log is derived from steps, which is public information — every clue was
announced and every pick was revealed on the board. It tells a guesser nothing
they could not reconstruct by staring at the board for long enough, which is
exactly the tedium being removed.

Two rules keep it honest:

- **It follows the visual cursor, not the authoritative one.** A row for a pick
  appears when the card flips, not while the reel is still spinning. Otherwise
  the log spoils the reveal it is supposed to be recording.
- **Nothing unrevealed is ever in it.** No remaining counts by colour, no "three
  of yours left in the top row". The spymaster key stays where it is.

## Where it lives

A panel toggled from the HUD, on the same rail as the settings gear, sharing the
one-panel-at-a-time discipline: opening the log closes the settings, and the
reverse. It scrolls, sticks to the newest row, and is empty-stated before the
first clue rather than showing a blank box.

**OPEN — resolved.** Considered docking it permanently beside the board so it is
always visible. Rejected: at 7x7 the board already owns the width, and a
permanent column would make the board smaller on exactly the boards that need
the log most.
