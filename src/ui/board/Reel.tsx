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
    {/* The peg straddles the seam between this face and the one above, because
        that seam is what the model counts: a peg passes when the boundary
        reaches the middle of the window, which is where the blade sits. */}
    <span
      aria-hidden
      className="absolute top-0 right-0 h-[9cqw] w-[7cqw] -translate-y-1/2 rounded-l-[2.5cqw]"
      style={{
        background: 'linear-gradient(90deg, #7A5A14 0%, #C9962C 45%, #F2DCA0 100%)',
        boxShadow: '-1px 0 3px rgba(0,0,0,.7), inset -1px 0 0 rgba(0,0,0,.35)'
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

/**
 * Mounted on the right rim, blade reaching back across the strip. A peg coming
 * down catches the tip and drives it down; it springs back and rings out.
 */
const Flapper = ({angle}: {angle: ReturnType<typeof useMotionValue<number>>}) => {
  const rotate = useTransform(angle, a => `${a}deg`)
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute z-40"
      style={{
        // Centred on the window, which is where a seam is when the model says a
        // peg has passed. Written as a calc rather than a translate so it does
        // not fight the rotation for the transform.
        top: 'calc(50% - 5.5cqw)',
        right: '-3cqw',
        width: '26cqw',
        height: '11cqw',
        rotate,
        transformOrigin: '92% 50%'
      }}
    >
      <svg viewBox="0 0 34 14" className="size-full overflow-visible">
        <defs>
          <linearGradient id="flapper-brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE8B0" />
            <stop offset="0.5" stopColor="#D9A93B" />
            <stop offset="1" stopColor="#6E4F10" />
          </linearGradient>
        </defs>
        {/* The blade, reaching in from the mount. */}
        <path
          d="M31 4.6 L31 9.4 L3 8.3 L3 5.7 Z"
          fill="url(#flapper-brass)"
          stroke="#2A1E06"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <path d="M28 6 L6 6.5" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="0.6" />
        {/* The pivot it hangs off. */}
        <circle cx="31" cy="7" r="3.6" fill="#1B1F2E" stroke="#F2DCA0" strokeWidth="0.9" />
        <circle cx="31" cy="7" r="1.1" fill="#F2DCA0" />
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
  settling,
  onStopped
}: {
  target: Colour
  team: Team
  ms: number
  settling: boolean
  onStopped: () => void
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
      onStopped()
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
        transition={{duration: settling ? 0.16 : 0}}
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
        transition={{duration: settling ? 0.16 : 0}}
      >
        <Flapper angle={flap} />
      </motion.span>
    </>
  )
}
