# 08 — Host controls

**Depends on:** [07](07-board-and-play.md).
**Done when:** the host can review the game step by step, rewind it, hand off
authority, and abandon a game back to the waiting room.

Built after play exists, so the history has something real to show.

## Host panel

A drawer, brass-edged, host only. On mobile it becomes a bottom sheet.

| Control | Effect |
|---|---|
| History | The step list, with undo, redo, and jump-to-step |
| End game now | Returns everyone to the waiting room with settings intact |
| Transfer host | Hands authority to any connected player |
| Password | Change or remove; live, no disconnects |
| Word list | Change; applies to the next game, not the current one |
| Board / timers | Editable in `setup` and `gameover` only, greyed mid-game |

## History

The dossier metaphor at its most literal — a printed log with a rule down the
left, the current cursor marked, and everything after it dimmed when the host has
rewound. Clicking a row jumps there; undo and redo sit at the top.

```
1  Game start                      Red 9 - 8 Blue
2  Red spymaster: "OCEAN 3"        Red 9 - 8 Blue
3  Red guessed WAVE      correct   Red 8 - 8 Blue
4  Red guessed SHIP      neutral   Red 8 - 8 Blue
5  Turn passed to Blue             Red 8 - 8 Blue
```

Over the primitives in [04](04-game-core.md#history-primitives). Because `derive`
is pure, undo and jump are exact.

Undo is host-only and moves everyone at once. Non-hosts see a brief "host rewound
the game" banner, so a board jumping backwards is not mistaken for a bug.

## End game now

Discards the current `steps` after a confirmation, and returns the room to the
waiting room in [05](05-waiting-room.md) with settings and teams intact and ready
flags cleared. The escape hatch for a game that has gone wrong in a way undo
cannot fix.

## Transfer host

The same mechanism as automatic promotion in
[03](03-host-authority.md#election), triggered deliberately. Its main use is the
case where the host drops, someone is promoted automatically, the original host
reconnects, and the new host hands control back — the returning player is a
normal connected player and selectable like any other.

The relay mesh needs no reorganisation. Routing does not know who the host is;
only the UI and the intent handler change hands.

## Password

Change or remove from here. It takes effect immediately for new joiners, and
nobody already in the room is disconnected — which is the whole reason the lobby
password is enforced at the application layer rather than as Trystero's
`password` ([03](03-host-authority.md#join-handshake)).
