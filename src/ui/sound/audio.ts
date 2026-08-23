import {getPrefs} from '../../state/prefs'

/**
 * Synthesized, with one exception: the peg knock is a recording, because a
 * struck wooden thing is all transient and body and a synth makes a poor fist
 * of it. See CREDITS.md.
 */
let ctx: AudioContext | null = null
let master: GainNode | null = null

const context = () => {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Everything routes through here, so the slider is one value and not a rewrite of every cue. */
const out = () => {
  const ac = context()
  if (!master) {
    master = ac.createGain()
    master.connect(ac.destination)
  }
  master.gain.setTargetAtTime(getPrefs().volume, ac.currentTime, 0.01)
  return master
}

const enabled = () => getPrefs().volume > 0

/**
 * One sample, fetched once and decoded once. Anything that asks before it has
 * landed gets nothing back and falls through to a synthesized stand-in, so the
 * first peg of the first spin is never silence.
 */
const KNOCK = `${import.meta.env.BASE_URL}sfx/peg-knock.mp3`
let knock: AudioBuffer | null = null
let knocking: Promise<void> | null = null

export const loadSamples = () => {
  if (knock || knocking) return
  knocking = fetch(KNOCK)
    .then(res => res.arrayBuffer())
    .then(buf => context().decodeAudioData(buf))
    .then(decoded => {
      knock = decoded
    })
    .catch(() => {
      // A missing sample is not worth taking the room down for; the synth
      // stand-in covers it.
    })
}

/** `rate` is playback speed, which moves pitch and length together — as a real knock does. */
const strike = (buffer: AudioBuffer, rate: number, gain: number) => {
  if (!enabled()) return
  const ac = context()
  const src = ac.createBufferSource()
  src.buffer = buffer
  src.playbackRate.value = rate

  const amp = ac.createGain()
  amp.gain.value = gain

  src.connect(amp).connect(out())
  src.start(ac.currentTime)
}

type ToneOpts = {
  freq: number
  to?: number
  type?: OscillatorType
  dur: number
  gain?: number
  delay?: number
  sweep?: [number, number]
  q?: number
  /** Seconds to full level. Defaults to a soft 20ms; a knock wants near zero. */
  attack?: number
}

const tone = ({freq, to, type = 'sine', dur, gain = 0.15, delay = 0, sweep, q = 1, attack}: ToneOpts) => {
  if (!enabled()) return
  const ac = context()
  const at = ac.currentTime + delay

  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), at + dur)

  const amp = ac.createGain()
  amp.gain.setValueAtTime(0.0001, at)
  amp.gain.exponentialRampToValueAtTime(gain, at + (attack ?? Math.min(0.02, dur * 0.2)))
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur)

  let tail: AudioNode = osc
  if (sweep) {
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = q
    filter.frequency.setValueAtTime(sweep[0], at)
    filter.frequency.exponentialRampToValueAtTime(sweep[1], at + dur)
    osc.connect(filter)
    tail = filter
  }

  tail.connect(amp).connect(out())
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

const noise = (dur: number, gain = 0.12, cutoff = 1400, delay = 0) => {
  if (!enabled()) return
  const ac = context()
  const at = ac.currentTime + delay
  const frames = Math.floor(ac.sampleRate * dur)
  const buffer = ac.createBuffer(1, frames, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)

  const src = ac.createBufferSource()
  src.buffer = buffer

  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(cutoff, at)

  const amp = ac.createGain()
  amp.gain.setValueAtTime(gain, at)
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur)

  src.connect(filter).connect(amp).connect(out())
  src.start(at)
}

export const unlockAudio = () => {
  try {
    context()
    loadSamples()
  } catch {
    /* no WebAudio; the game is silent */
  }
}

export const sfx = {
  hover: () => tone({freq: 2100, type: 'triangle', dur: 0.035, gain: 0.025}),

  arm: () => {
    tone({freq: 880, type: 'square', dur: 0.05, gain: 0.05})
    tone({freq: 1320, type: 'square', dur: 0.04, gain: 0.03, delay: 0.04})
  },

  disarm: () => tone({freq: 420, to: 260, type: 'square', dur: 0.07, gain: 0.04}),

  /** The lever pull: a low thunk under a mechanical clack. */
  confirm: () => {
    tone({freq: 150, to: 70, type: 'sine', dur: 0.22, gain: 0.3})
    noise(0.09, 0.16, 2600)
  },


  /**
   * A peg hitting the flapper. Heavy and wooden, with no pitch to it: a low
   * body that drops as it rings out, a knock on top, and a hair of contact.
   * Gets fuller as the wheel slows — a fast peg has less time to resonate —
   * and a peg pushed back over on a rock-back lands lighter than a fall.
   */
  /**
   * A peg passing the blade. The recording is a shade long and low on its own,
   * so it is always played faster than recorded — and faster still early in the
   * spin, where a peg is moving quickest. `progress` runs 0 at launch to 1 at
   * rest, so the run tightens and drops as the wheel slows.
   */
  peg: (progress: number, dir: -1 | 1) => {
    const strength = (0.7 + 0.3 * progress) * (dir === 1 ? 0.72 : 1)
    if (knock) {
      strike(knock, 2.1 - 0.5 * progress, 0.3 * strength)
      return
    }
    tone({freq: 340, to: 190, type: 'sine', dur: 0.021, gain: 0.058 * strength, attack: 0.001})
    noise(0.008, 0.042 * strength, 2200)
    noise(0.003, 0.018 * strength, 7500)
  },

  /** The wheel coming to rest: the last peg, and the frame taking the weight. */
  /**
   * The frame taking the weight once the wheel gives up. No knock in it: the
   * last peg has just sounded one, and two knocks a frame apart is not a
   * heavier landing, it is a stutter.
   */
  wheelStop: () => {
    tone({freq: 90, to: 58, type: 'sine', dur: 0.16, gain: 0.075, attack: 0.002})
  },

  /** Held under the whole wind-up, climbing as the reel slows. */
  riser: (dur: number) => {
    tone({freq: 90, to: 420, type: 'sawtooth', dur, gain: 0.07, sweep: [220, 2600], q: 6})
    tone({freq: 180, to: 840, type: 'sine', dur, gain: 0.035})
  },


  /** One reel finding its stop. Each is a semitone up, so three landing reads as a phrase. */
  detent: (index: number) => {
    tone({freq: 320 * Math.pow(2, index / 12), type: 'square', dur: 0.06, gain: 0.09})
    noise(0.07, 0.16, 2400)
  },

  land: () => {
    noise(0.12, 0.2, 3200)
    tone({freq: 240, to: 120, type: 'sine', dur: 0.16, gain: 0.22})
  },

  correct: (team: 'red' | 'blue') => {
    const root = team === 'red' ? 392 : 466.16
    ;[0, 4, 7, 12].forEach((semi, i) => {
      tone({
        freq: root * Math.pow(2, semi / 12),
        type: 'triangle',
        dur: 0.5 - i * 0.06,
        gain: 0.13,
        delay: i * 0.055
      })
    })
  },

  wrong: () => {
    tone({freq: 190, to: 90, type: 'sine', dur: 0.34, gain: 0.22})
    tone({freq: 96, to: 60, type: 'square', dur: 0.3, gain: 0.09, delay: 0.03})
  },

  /**
   * A klaxon, not a smoke alarm. The shrillness was a bare sawtooth at 760Hz
   * with a square under it — all upper harmonics and nothing holding them down.
   * This wails an octave lower through a closing filter, with two triangles a
   * few cents apart so they beat against each other, and a sub underneath doing
   * the actual frightening.
   */
  assassin: () => {
    for (let i = 0; i < 4; i++) {
      const at = i * 0.46
      tone({freq: 440, to: 300, type: 'sawtooth', dur: 0.44, gain: 0.09, delay: at, sweep: [1500, 480], q: 2})
      tone({freq: 442, to: 302, type: 'triangle', dur: 0.44, gain: 0.12, delay: at})
      tone({freq: 435, to: 296, type: 'triangle', dur: 0.44, gain: 0.08, delay: at})
    }
    tone({freq: 72, to: 46, type: 'sine', dur: 2.2, gain: 0.24})
    noise(2, 0.035, 420)
  },

  turn: (team: 'red' | 'blue') => {
    const root = team === 'red' ? 293.66 : 349.23
    tone({freq: root, type: 'triangle', dur: 0.32, gain: 0.11})
    tone({freq: root * 1.5, type: 'triangle', dur: 0.4, gain: 0.09, delay: 0.09})
  },

  clueDrop: () => {
    tone({freq: 1400, type: 'square', dur: 0.03, gain: 0.04})
    tone({freq: 520, to: 300, type: 'sine', dur: 0.2, gain: 0.14, delay: 0.05})
  },

  type: () => tone({freq: 1650 + Math.random() * 260, type: 'square', dur: 0.016, gain: 0.022}),

  timerTick: (urgent: boolean) =>
    tone({freq: urgent ? 1500 : 1000, type: 'square', dur: 0.03, gain: urgent ? 0.07 : 0.035}),

  victory: () => {
    ;[0, 4, 7, 12, 16, 19].forEach((semi, i) => {
      tone({
        freq: 349.23 * Math.pow(2, semi / 12),
        type: 'triangle',
        dur: 0.7,
        gain: 0.11,
        delay: i * 0.085
      })
    })
  },

  defeat: () => {
    ;[0, -3, -7, -12].forEach((semi, i) => {
      tone({freq: 330 * Math.pow(2, semi / 12), type: 'sine', dur: 0.8, gain: 0.13, delay: i * 0.13})
    })
  }
}
