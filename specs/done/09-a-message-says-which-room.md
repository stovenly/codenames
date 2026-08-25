# 09 — A message says which room it was said in

> Shipped, with the grouping rule in `src/state/chat.ts` (`roomOf`, `rooms`)
> rather than in the component as planned here — it is a rule about messages,
> it lives beside them, and there it has tests.
>
> One thing this document did not settle: a message records the team its sender
> had, not whether they were spectating, so the plain head marks anyone who was
> on no side — a spectator and a bench player alike. The fedora is the mark of
> playing for a team, which is the distinction the glyph can actually carry.

**Done when:** you can tell at a glance which channel any message was sent to,
without reading a tag on it, and the channel picker sits where the typing does.

### The picker moves

It sits under the **Chat** heading today, at the top of the panel
(`src/ui/Chat.tsx`), a full panel away from the box it governs. It moves to
directly above the input, under the message list. Nothing else about it changes.

The channel you are writing to and the box you are writing in are one decision,
and they should be within a glance of each other. Where it sits now, the answer
to *who is about to hear this* is at the other end of the panel from the thing
that sends it.

### The tag comes off

Every message carries a `NAME[msg.channel]` label today — including **All**,
which is most of them, and which is the one nobody needs told. All-chat is the
default and reads as plain conversation, so it keeps the avatar, the name and
the text, and loses the tag.

The other two channels stop being a word beside the name and become the shape of
the message instead.

### Team and spymaster messages are blocks

A run of consecutive messages in the same channel is drawn as **one bounded
block**: a tinted background, a one-pixel border, and a small label at the top.
Neighbouring messages in the same channel share the block rather than each
carrying their own frame, so a back-and-forth inside your team reads as one
conversation happening in one place.

| Channel | Block |
|---|---|
| All | no block at all — the baseline everything else is read against |
| Team | the team's colour, at a wash: `border-red-500/40 bg-red-500/[.08]`, label **RED** |
| Spymasters | dark grey, `border-stage-600 bg-stage-800/70`, label **SPYMASTERS** |

**Spymaster blocks merge across the two teams.** Both spymasters are in that room
together, and drawing a boundary between them would say they are in different
ones. The sender's own name stays tinted to their team inside the block, which is
where that distinction belongs — so a red and a blue spymaster talking read as
one exchange between two identified people.

Team blocks never merge across teams, even though nobody can currently see both:
the grouping key is the channel *and* the team, so the model stays right even
where the view cannot prove it.

```ts
/** Consecutive messages in the same room share a block; All is never blocked. */
const bucket = (m: Message) =>
  m.channel === 'spymasters' ? 'spymasters' : m.channel === 'team' ? `team:${m.team}` : 'all'
```

### Spectators in All

A spectator is not on either side, so their name is drawn in `text-text-dim`
rather than a team tint, and their glyph is a **plain head** — no fedora, no
brim — where a player gets the agent silhouette and a spymaster gets the mask.

That glyph is new: `Onlooker` in `src/ui/board/symbols.tsx`, beside `Agent`. It
is the same silhouette with the hat taken off, so the two read as the same
drawing with one difference, which is the difference being reported.

**The head is the person, the eye is the verb.** `Onlooker` marks a spectator
wherever one is drawn — in chat, and on the band of their card in the lobby,
replacing the lucide `Eye` that item 3 put there. The `Eye` stays on the
**Spectate** button, which is an action rather than a person.

### Files

`src/ui/Chat.tsx` (picker position, grouping, blocks), `src/ui/board/symbols.tsx`
(`Onlooker`), `src/ui/room/PlayerCard.tsx` (the glyph swap). No change to
`src/state/chat.ts` — `Message` already carries `channel`, `team` and
`spymaster`, which is everything the grouping needs.
