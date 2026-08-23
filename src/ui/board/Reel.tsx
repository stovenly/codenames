import {motion, useAnimationFrame, useMotionValue, useTransform} from 'motion/react'
import {useEffect, useRef} from 'react'
import type {Colour} from '../../game/board'
import type {Team} from '../../game/types'
import {sfx} from '../sound/audio'
import {FACES, LAND, START, TUNE, buildStrip, launch, step, type Slot} from './wheel'
import {SURFACE, Symbol} from './symbols'

/**
 * The flapper is its own little spring. A peg kicks it in the direction the
 * wheel is going; it overshoots, comes back, and rings down — which is the
 * thing you watch on the real wheel, and the thing the sound is the sound of.
 */
const FLAP_K = 1100
const FLAP_C = 30
/** Degrees per second a passing peg puts into it; harder when the wheel is slow and heavy. */
const KICK_FAST = 360
const KICK_SLOW = 640

const Face = ({slot}: {slot: Slot}) => (
  <span
    className="relative grid aspect-[7/5] w-full shrink-0 place-items-center"
    style={{
      background:
        slot.kind === 'card' ? SURFACE[slot.colour] : 'linear-gradient(168deg, #2C2546 0%, #150F22 100%)',
      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12)'
    }}
  >
    {/* The peg. Every face carries one on its leading edge, and the flapper is
        what it pushes past. */}
    <span
      aria-hidden
      className="absolute top-0 left-1/2 h-[3.2cqw] w-[9cqw] -translate-x-1/2 rounded-b-[2cqw]"
      style={{
        background: 'linear-gradient(180deg, #F2DCA0 0%, #C9962C 55%, #7A5A14 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,.7), inset 0 -1px 0 rgba(0,0,0,.4)'
      }}
    />

    {slot.kind === 'card' ? (
      <Symbol colour={slot.colour} className="size-[38cqw] drop-shadow-[0_2px_3px_rgba(0,0,0,.45)]" />
    ) : (
      <span className="text-[30cqw] leading-none drop-shadow-[0_3px_4px_rgba(0,0,0,.6)] select-none">
        {slot.text}
      </span>
    )}
  </span>
)

const Flapper = ({angle}: {angle: ReturnType<typeof useMotionValue<number>>}) => {
  const rotate = useTransform(angle, a => `${a}deg`)
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2"
      style={{top: '-3.2cqw', width: '11cqw', height: '14cqw', rotate, transformOrigin: '50% 8%'}}
    >
      <svg viewBox="0 0 22 28" className="size-full overflow-visible">
        <defs>
          <linearGradient id="flapper-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFE8B0" />
            <stop offset="0.55" stopColor="#D9A93B" />
            <stop offset="1" stopColor="#6E4F10" />
          </linearGradient>
        </defs>
        {/* The pivot plate. */}
        <circle cx="11" cy="3" r="3.2" fill="#1B1F2E" stroke="#F2DCA0" strokeWidth="0.8" />
        {/* The blade, hanging from it. */}
        <path
          d="M6.2 4.5 L15.8 4.5 L11.6 27 L10.4 27 Z"
          fill="url(#flapper-brass)"
          stroke="#2A1E06"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path d="M8 6 L10 6 L10.8 22" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="0.5" />
      </svg>
    </motion.span>
  )
}

/**
 * The Big Wheel. The outcome is known from the first frame — every client
 * derives the same board — so the whole run is one continuous piece of
 * physics that ends on the card, and everything you see and hear is driven
 * off the same simulation step: the strip's position, the blur, the jolt,
 * the flapper's kick, and the thock.
 */
export const Reel = ({
  target,
  team,
  ms,
  settling
}: {
  target: Colour
  team: Team
  ms: number
  settling: boolean
}) => {
  const strip = useRef(buildStrip(target, team)).current
  const sim = useRef(launch(TUNE)).current

  const p = useMotionValue(START)
  const y = useTransform(p, v => `${(-v * 100) / FACES}%`)

  const blur = useMotionValue(0)
  const filter = useTransform(blur, b => (b > 0.25 ? `blur(${b.toFixed(2)}px)` : 'none'))

  const jolt = useMotionValue(0)
  const flap = useMotionValue(0)
  const flash = useMotionValue(0)

  const flapper = useRef({angle: 0, vel: 0}).current
  const stopped = useRef(false)

  useAnimationFrame((_, delta) => {
    // A backgrounded tab hands back one enormous frame; integrating it whole
    // would fire the wheel off the end of the strip.
    const dt = Math.min(delta, 34) / 1000

    // The flapper keeps ringing down after the wheel has stopped.
    const fa = -FLAP_K * flapper.angle - FLAP_C * flapper.vel
    flapper.vel += fa * dt
    flapper.angle += flapper.vel * dt
    flap.set(flapper.angle)

    jolt.set(jolt.get() * 0.72)
    flash.set(flash.get() * 0.9)

    if (settling || sim.done) {
      blur.set(0)
      return
    }

    const tick = step(sim, dt, ms / 1000)
    p.set(sim.p)
    blur.set(Math.min(2.4, Math.abs(sim.v) / 8))

    if (tick.peg) {
      sfx.peg(tick.progress, tick.dir)
      const kick = KICK_FAST + (KICK_SLOW - KICK_FAST) * tick.progress
      flapper.vel += tick.dir * -kick
      jolt.set(tick.dir * 2.2)
    }

    if (sim.done && !stopped.current) {
      stopped.current = true
      sfx.wheelStop()
      flash.set(1)
      jolt.set(3.5)
    }
  })

  useEffect(() => {
    if (settling) p.set(LAND)
  }, [settling, p])

  const flashBg = useTransform(flash, f => `rgba(255,226,154,${(f * 0.55).toFixed(3)})`)

  return (
    <>
      <motion.span
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
        animate={{opacity: settling ? 0 : 1}}
        transition={{duration: settling ? 0.4 : 0, delay: settling ? 0.25 : 0}}
        style={{y: jolt}}
      >
        <motion.span className="absolute inset-x-0 top-0 flex flex-col" style={{y, filter}}>
          {strip.map((slot, i) => (
            <Face key={i} slot={slot} />
          ))}
        </motion.span>

        {/* The window's own shadow, so faces arrive out of somewhere and leave
            into somewhere. */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,.6) 0%, transparent 24%, transparent 76%, rgba(0,0,0,.6) 100%)'
          }}
        />

        {/* The landing. */}
        <motion.span aria-hidden className="absolute inset-0" style={{background: flashBg}} />
      </motion.span>

      {/* Outside the clipped window: it hangs over the top edge of the card. */}
      <motion.span
        className="pointer-events-none absolute inset-0"
        animate={{opacity: settling ? 0 : 1}}
        transition={{duration: settling ? 0.3 : 0, delay: settling ? 0.25 : 0}}
      >
        <Flapper angle={flap} />
      </motion.span>
    </>
  )
}
