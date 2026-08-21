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
  {figure: AIMING, x: 7, height: 26, opacity: 0.62, sway: 74, flip: false},
  {figure: PAIR, x: 24, height: 36, opacity: 0.82, sway: 55, flip: true},
  {figure: AIMING, x: 41, height: 21, opacity: 0.5, sway: 83, flip: true},
  {figure: PAIR, x: 63, height: 42, opacity: 0.92, sway: 46, flip: false},
  {figure: AIMING, x: 81, height: 31, opacity: 0.72, sway: 63, flip: false},
  {figure: AIMING, x: 95, height: 23, opacity: 0.55, sway: 90, flip: true}
]

export const Crowd = () => {
  const {reduced} = useMotion()
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[70vh]">
      {CROWD.map(({figure, x, height, opacity, sway, flip}, i) => (
        <svg
          key={i}
          viewBox={figure.viewBox}
          preserveAspectRatio="xMidYMax meet"
          fill="currentColor"
          className={cx('absolute bottom-[13vh] -translate-x-1/2', !reduced && 'anim-sway')}
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

      {/* Fog, at the feet only. An earlier version ran the gradient to full
          opacity across the whole band and simply painted the figures out. */}
      <span
        className="absolute inset-x-0 bottom-0 h-[26vh]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(12,18,34,0) 0%, rgba(13,20,38,.45) 46%, rgba(14,22,42,.8) 100%)'
        }}
      />
    </div>
  )
}
