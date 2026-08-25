# 01 — Invite link with the password in it

> Shipped. `shareLink(roomId, password?)`, `passwordFromHash()` and
> `stripPasswordFromHash()` in `src/net/identity.ts`; `myPassword()` in
> `src/state/room.ts`; both buttons in the waiting room; the landing screen reads
> `p=` on first paint and strips it in the same breath.
>
> **Since:** both buttons carry the link icon, the second reads **Invite link
> with password**, and the tick fades in over the label instead of replacing it —
> a button that changes width on click shoves its neighbour along. The caution
> line came off: the button's own name says what it hands out.


**Done when:** a host with a password set has two copy buttons in the waiting
room, and a link from the second one drops the recipient into the lobby without
them typing anything.

### The link

```
https://…/codenames/#r=<roomId>              existing
https://…/codenames/#r=<roomId>&p=<secret>   new
```

`roomFromHash()` already reads `r=` out of a hash with other keys in it, so the
existing form is untouched. `<secret>` is the password, UTF-8, base64url, no
padding. **This is encoding, not encryption** — anyone holding the link holds the
password, which is exactly the point of the button. It is base64 only so the
lobby password is not sitting in plain sight in a pasted URL or a hover preview.

### Two buttons, not one

The plain link stays first and stays the default. The second appears only when
`hasPassword()`, reads **Invite + password**, and carries one line of caution
under the pair: *anyone with this link can join without the password*. A single
button that silently changes what it copies depending on whether a password is
set is the version where a host gives away the room's only lock without knowing
they did.

Both buttons keep their own copied state, so the tick lands on the one that was
pressed.

### Reading it back

`Landing` reads `p=` on first paint, base64url-decodes it into the password
field, and **immediately rewrites the hash to drop `p=`** with
`history.replaceState`. Three reasons: a refresh should not re-supply it, a
screenshot of the lobby should not contain it, and the in-room **Invite link**
button builds its link from `roomId` and would otherwise hand out a URL the host
did not choose to share.

The field is prefilled rather than submitted for them: the name field still needs
a value, and a join that fires before the player has typed one seats them as
`Agent`. With a name remembered in prefs the form is already complete and one
click finishes it.

A wrong or stale `p=` fails exactly as a mistyped password does today — `reject`
with `reason: 'password'`, back to the landing screen with the existing *Not
accepted. Try again.* hint.

### Files

| File | Change |
|---|---|
| `src/net/identity.ts:137` | `shareLink(roomId, password?)`; add `passwordFromHash()` and `stripPasswordFromHash()` |
| `src/state/room.ts:1158` | export `myPassword()` — the plaintext off the session, host only, `null` otherwise |
| `src/ui/screens/Waiting.tsx:160` | the second button, beside the existing one |
| `src/ui/screens/Landing.tsx:196` | prefill from the hash, then strip it |

`saveSession` already holds the plaintext (`src/state/room.ts:104`), so nothing
new is persisted anywhere.

### Not doing

The host panel's mid-game password field (`src/ui/host/HostPanel.tsx:255`) does
not grow a copy button. Changing the password and sharing it are different
moments, and the waiting room is where people are invited from.
