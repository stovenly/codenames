import {getPrefs} from '../../state/prefs'

/** Synthesized, so there are no audio assets and no download weight. */
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

type ToneOpts = {
  freq: number
  to?: number
  type?: OscillatorType
  dur: number
  gain?: number
  delay?: number
  sweep?: [number, number]
  q?: number
}

const tone = ({freq, to, type = 'sine', dur, gain = 0.15, delay = 0, sweep, q = 1}: ToneOpts) => {
  if (!enabled()) return
  const ac = context()
  const at = ac.currentTime + delay

  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), at + dur)

  const amp = ac.createGain()
  amp.gain.setValueAtTime(0.0001, at)
  amp.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.02, dur * 0.2))
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

  assassin: () => {
    for (let i = 0; i < 4; i++) {
      tone({freq: 760, to: 430, type: 'sawtooth', dur: 0.42, gain: 0.16, delay: i * 0.44})
      tone({freq: 380, to: 215, type: 'square', dur: 0.42, gain: 0.08, delay: i * 0.44})
    }
    noise(1.9, 0.06, 700)
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
