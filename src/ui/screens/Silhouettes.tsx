import {cx} from '../cx'
import {useMotion} from '../motion'

/**
 * Drawn here rather than vendored. CC0 spy clipart exists, but a silhouette
 * lives or dies on its outline and these are being read at 30vh through fog —
 * shipping art nobody looked at is how you end up with a detailed line drawing
 * that turns into a smudge. Drawing them also keeps the no-network-assets rule.
 *
 * All internal detail is wasted on a solid fill, so every one of these earns its
 * character from the outline alone: hat brim, shoulder line, coat flare, and one
 * thing that breaks the profile.
 */

const HAT = (
  <>
    <ellipse cx="60" cy="42" rx="35" ry="7.5" />
    <path d="M43 43c0-4 1-11 2-14 1.5-4 6-6 15-6s13.5 2 15 6c1 3 2 10 2 14z" />
  </>
)

/** Hands in pockets. The plainest one, so it reads as the anchor of the group. */
const Sentry = () => (
  <g>
    {HAT}
    <path d="M60 48c-13 0-22 7-25 19l-9 74 8 5 3-46 2 62h42l2-62 3 46 8-5-9-74c-3-12-12-19-25-19z" />
    <path d="M45 162h13l2 76h-15z" />
    <path d="M62 162h13l2 76h-15z" />
    <ellipse cx="52" cy="240" rx="10" ry="5" />
    <ellipse cx="70" cy="240" rx="10" ry="5" />
  </g>
)

/** Briefcase: one hard rectangle hanging off the profile. */
const Courier = () => (
  <g>
    {HAT}
    <path d="M60 48c-13 0-22 7-25 19l-8 70 7 4 3-42 2 61h42l2-61 3 42 7-4-8-70c-3-12-12-19-25-19z" />
    <rect x="86" y="128" width="26" height="20" rx="2" />
    <rect x="95" y="123" width="8" height="6" rx="2" />
    <path d="M45 158h13l2 80h-15z" />
    <path d="M62 158h13l2 80h-15z" />
    <ellipse cx="52" cy="240" rx="10" ry="5" />
    <ellipse cx="70" cy="240" rx="10" ry="5" />
  </g>
)

/** No hat, collar up, turned away. Taller and narrower than the others. */
const Watcher = () => (
  <g>
    <ellipse cx="58" cy="36" rx="14" ry="16" />
    <path d="M58 50c-12 0-20 7-23 18l-7 76 7 4 3-48 2 66h38l2-66 3 48 7-4-7-76c-3-11-11-18-23-18z" />
    <path d="M40 62l6-10 12 14-12 8zM76 62l-6-10-12 14 12 8z" />
    <path d="M44 164h13l2 74h-15z" />
    <path d="M60 164h13l2 74h-15z" />
    <ellipse cx="51" cy="240" rx="9" ry="5" />
    <ellipse cx="68" cy="240" rx="9" ry="5" />
  </g>
)

/** Hand to the brim. The raised arm is the whole point of this profile. */
const Tipping = () => (
  <g>
    {HAT}
    <path d="M60 48c-13 0-22 7-25 19l-8 72 7 4 3-44 2 63h42l2-63 3 44 7-4-8-72c-3-12-12-19-25-19z" />
    <path d="M84 74c6-4 10-11 8-18l-9-3c-1 6-4 10-9 12z" />
    <path d="M45 160h13l2 78h-15z" />
    <path d="M62 160h13l2 78h-15z" />
    <ellipse cx="52" cy="240" rx="10" ry="5" />
    <ellipse cx="70" cy="240" rx="10" ry="5" />
  </g>
)

/** Depth: further back is smaller, higher, paler and slower to drift. */
const CROWD = [
  {Figure: Watcher, x: 9, height: 27, opacity: 0.42, sway: 64, flip: false},
  {Figure: Courier, x: 26, height: 33, opacity: 0.55, sway: 52, flip: true},
  {Figure: Sentry, x: 44, height: 24, opacity: 0.34, sway: 71, flip: false},
  {Figure: Tipping, x: 63, height: 36, opacity: 0.62, sway: 47, flip: false},
  {Figure: Sentry, x: 81, height: 30, opacity: 0.5, sway: 58, flip: true},
  {Figure: Watcher, x: 94, height: 22, opacity: 0.3, sway: 78, flip: true}
]

export const Crowd = () => {
  const {reduced} = useMotion()
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62vh]">
      {CROWD.map(({Figure, x, height, opacity, sway, flip}, i) => (
        <svg
          key={i}
          viewBox="0 0 120 250"
          preserveAspectRatio="xMidYMax meet"
          className={cx('absolute bottom-0 -translate-x-1/2', !reduced && 'anim-sway')}
          style={{
            left: `${x}%`,
            height: `${height}vh`,
            color: '#05060B',
            opacity,
            transform: flip ? 'scaleX(-1)' : undefined,
            animationDuration: `${sway}s`,
            animationDelay: `${-i * 7}s`
          }}
        >
          <g fill="currentColor">
            <Figure />
          </g>
        </svg>
      ))}

      {/* Fog: legs dissolve into the floor rather than standing on a hard line. */}
      <span
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,13,24,0) 0%, rgba(12,18,34,.5) 46%, rgba(14,22,42,.92) 78%, rgba(16,25,48,1) 100%)'
        }}
      />
    </div>
  )
}
