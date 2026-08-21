import {cx} from '../cx'
import {useMotion} from '../motion'
import {AIMING, PAIR, type Figure} from './figures'

/**
 * Depth is atmospheric, not blurred: further back is smaller, paler and slower,
 * because the background is lit and distance washes a dark shape toward it.
 *
 * The pair is wide and the lone figure is narrow, so alternating them and
 * flipping some gives a group that does not read as one shape stamped repeatedly.
 */
const CROWD: Array<{
  figure: Figure
  x: number
  height: number
  opacity: number
  sway: number
  flip: boolean
}> = [
  {figure: AIMING, x: 7, height: 21, opacity: 0.3, sway: 74, flip: false},
  {figure: PAIR, x: 24, height: 31, opacity: 0.5, sway: 55, flip: true},
  {figure: AIMING, x: 41, height: 17, opacity: 0.24, sway: 83, flip: true},
  {figure: PAIR, x: 62, height: 37, opacity: 0.62, sway: 46, flip: false},
  {figure: AIMING, x: 80, height: 26, opacity: 0.42, sway: 63, flip: false},
  {figure: AIMING, x: 95, height: 19, opacity: 0.28, sway: 90, flip: true}
]

export const Crowd = () => {
  const {reduced} = useMotion()
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62vh]">
      {CROWD.map(({figure, x, height, opacity, sway, flip}, i) => (
        <svg
          key={i}
          viewBox={figure.viewBox}
          preserveAspectRatio="xMidYMax meet"
          fill="currentColor"
          className={cx('absolute bottom-[6vh] -translate-x-1/2', !reduced && 'anim-sway')}
          style={{
            left: `${x}%`,
            height: `${height}vh`,
            color: '#05060B',
            opacity,
            transform: flip ? 'scaleX(-1)' : undefined,
            animationDuration: `${sway}s`,
            animationDelay: `${-i * 9}s`
          }}
        >
          {figure.paths.map((d, j) => (
            <path key={j} d={d} />
          ))}
        </svg>
      ))}

      {/* Fog: feet dissolve into the floor rather than standing on a hard line. */}
      <span
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,13,24,0) 0%, rgba(12,18,34,.42) 44%, rgba(14,22,42,.88) 74%, rgba(16,25,48,1) 100%)'
        }}
      />
    </div>
  )
}
