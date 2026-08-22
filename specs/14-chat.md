# 14 — Chat

**Depends on:** [02](02-transport.md), [03](03-host-authority.md), [07](07-board-and-play.md).
**Done when:** a team can argue about a clue without leaving the tab, and a
spymaster can groan about their own clue without giving it away.

## Why

Codenames played in one room is half talking. Played over a link it is half
silence, or half a second app. The parts worth having in the page are the ones
the game creates: a team working through a clue, and the two spymasters watching
their teams get it wrong.

## Channels

One pane, three channels.

| Channel | Who reads it | Who writes to it |
|---|---|---|
| **All** | everyone | everyone except spymasters, mid-game |
| **Team** | one team | that team's guessers |
| **Spymasters** | both spymasters | both spymasters |

A spymaster mid-game writes **only** to the spymaster channel. This is the whole
design: the one person who must not talk to their team is given somewhere else
to talk, so the temptation is answered rather than policed. They still read
everything — a spymaster watching their team reason out loud is the best part of
the game — they just cannot join in.

Outside a live game — the lobby, the end screen — **everyone reads and writes
All, and nothing else.** There are no teams to speak to yet and no key left to
protect. Team and spymaster channels stay visible with what they already hold,
but accept nothing new.

## Delivery

Messages go peer to peer and are **addressed to their readers**, never broadcast
and filtered on arrival. A team message is sent to that team's members and to
nobody else; a spymaster message to the two spymasters. This is the only
concealment that survives a determined reader, and it costs nothing over a mesh
that already sends to specific peers.

The host is not involved. Chat is not game state, does not enter the step list,
is never rewound by an undo, and a lost message costs a line rather than a
desync — the same posture as arm markers in [07](07-board-and-play.md).

## Persistence

Each client keeps what it received, for as long as its tab is open. There is no
transcript to fetch: someone who joins at turn four has an empty pane, and
someone who was a guesser and becomes a spymaster next game keeps the team
messages they could read at the time.

This is the honest consequence of addressed delivery, and it is the right one —
"chat history persists for whoever could read it at the time" is the same
sentence as "nobody is retroactively given a channel they were not in".

Capped at a few hundred messages, oldest dropped, because a tab left open all
evening should not grow without limit.

## The pane

- A rail button next to the settings gear, with an unread count.
- Channel picker across the top, showing only channels this player can read.
- A composer that names where the message is going, disabled with the reason
  when the channel is read-only for this player right now.
- Messages carry the sender's avatar, name and channel tint: neutral for All,
  team colour for Team, gold for Spymasters.

## Not in scope

- **Moderation.** A room is a group of friends who already know each other, and
  the invite link is the access control.
- **Emotes, reactions, typing indicators.** Traffic per keystroke over a public
  relay mesh, for decoration.
- **Anything the game reads.** Chat never becomes a clue. The clue box is the
  clue box.
