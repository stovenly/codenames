/**
 * Milliseconds. Every player is reading a board they did not touch, so each
 * beat has to last long enough to notice, register and look up.
 *
 * The theatre plays to these and the host's clocks wait them out, so the two
 * have to agree: a timer that starts under a splash is a timer nobody sees
 * start.
 */
export const PACE = {
  /** Symbols churning on the card, decelerating into the flip. */
  windup: 2800,
  landing: 700,
  correct: 1500,
  wrong: 1900,
  assassin: 3400,
  clue: 3600,
  turn: 1800,
  /** The board arriving, so the first card is not simply there one frame later. */
  deal: 2800
}
