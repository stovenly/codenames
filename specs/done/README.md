# Done

Improvements that have shipped. Each one is the spec as it was written, with a
note at the top saying what actually landed and where the build differs from
the plan. Work still outstanding lives in [IMPROVEMENTS.MD](../../IMPROVEMENTS.MD).

| | Change | Note |
|---|---|---|
| 01 | [Invite link with the password in it](01-invite-link-with-password.md) | as specified |
| 02 | [Randomize teams](02-randomize-teams.md) | seating math extracted to a pure function |
| 03 | [Spectator, a fourth role](03-spectator-role.md) | as specified |
| 04 | [The play screen fits the window](04-play-screen-fits-the-window.md) | measured variant; one viewport verified |
| 05 | [The first team's bonus cards](05-first-teams-bonus-cards.md) | reverses a resolution in 04 |
| 06 | [The full board on the end screen](06-full-board-on-the-end-screen.md) | not yet seen in a browser |
| 07 | [Who is on your team, while you play](07-who-is-on-your-team.md) | measurement lifted to the play screen |
| 08 | [A clue cannot be a word on the board](08-a-clue-is-not-a-board-word.md) | refusal line not yet seen in a browser |
| 09 | [A message says which room it was said in](09-a-message-says-which-room.md) | grouping rule moved beside the messages |

## Standing decisions

Neither of these belongs to any one change. They are here because the shipped
work is what settled them.

### Out of scope: phones

**None of these are specified for a phone.** The play screen is targeted at
820px wide and up; below that it should stay usable and is allowed to scroll, and
nothing above should be bent out of shape to avoid it.

A phone does not want a smaller version of this screen. A 5×5 board at 358px wide
puts a 71px card under a thumb, the HUD's clue composer and the board cannot both
be on screen, and the rail, the chat sheet and the action row are all competing
for the same bottom edge. That is a different layout — probably a board that
scrolls under a pinned HUD, or a card-at-a-time guess flow — and it is a piece of
design work, not a breakpoint.

#### And the transport underneath it will not hold

Worth writing down because it decides whether that layout is ever worth
designing: a phone browser suspends a backgrounded tab, and a suspended tab is a
dropped peer. Not throttled — gone. iOS Safari is the strict case, but every
mobile browser does some version of it, and nothing in a static page can opt out:
there is no service worker path for `RTCPeerConnection`, and `navigator.wakeLock`
only survives while the tab is in front. A player who reads a message mid-turn
comes back to a dead mesh.

The room is already built for people leaving and returning, and that machinery is
what would carry it:

| Already there | What it does |
|---|---|
| `src/net/beat.worker.ts` | the host's beat runs in a worker, which is throttled far less than a hidden tab's timers |
| `hostHidden` / `MISSING_HOST_HIDDEN_MS` | the missing-host window widens while the host advertises a hidden tab, so alt-tabbing does not trigger an election |
| `AWAY_TRANSFER_MS` and `bestSuccessor()` | a host away for a minute hands the room to a tab that is actually in front, reversibly |
| `src/ui/Away.tsx` | title and favicon ladder, because a host who cannot see the page can still see its tab |
| the seat in `localStorage` (`src/net/identity.ts`) | returning takes the same seat rather than joining as somebody new |

All of that makes a **backgrounded host** survivable. None of it makes a
**suspended peer** survivable, because there is no code running to survive it.
The honest position: phones work while the tab is in front, and a phone player is
one notification away from a rejoin. If phones ever become a real target, that is
the problem to solve first — the layout is the easy half.

### Wire compatibility, in one place

Two features change broadcast shapes. Neither is a version bump; both are
additive and read defensively.

| Field | Added to | An old client sees | A new client reading old state |
|---|---|---|---|
| `spectator?: boolean` | `Player` | a bench player | `undefined` → not spectating |
| `bonusCards: number` | `Settings` | ignores it, deals from `teamCards` | `?? 0` — an identical board |
| `shuffleTeams` | `Intent` | never sends it; an old host ignores it | — |

The `bonusCards` default of 0 on read is the one that matters. The board is
rebuilt from the seed on every client, so a settings field two clients disagree
about is two different boards, not two different labels.
