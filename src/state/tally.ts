/**
 * What a player did that leaves no trace in the step log: messages sent, cards
 * pointed at. Counted locally and reported to the host, because neither is
 * something one client can observe for everyone — a team channel never reaches
 * the other team, and a mark can be lost on the way like any other message.
 *
 * Absolute counts, not deltas, so a report that goes missing costs nothing.
 */
let game = ''
let chats = 0
let marks = 0
let dirty = false

export const noteChat = () => {
  chats++
  dirty = true
}

export const noteMark = () => {
  marks++
  dirty = true
}

/** The counts to report, or null when the host already has them. */
export const takeTally = (gameKey: string): {chats: number; marks: number} | null => {
  if (gameKey !== game) {
    game = gameKey
    chats = 0
    marks = 0
    dirty = false
    return {chats, marks}
  }
  if (!dirty) return null
  dirty = false
  return {chats, marks}
}
