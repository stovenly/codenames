import {cx} from '../cx'
import {useMotion} from '../motion'
import {AIMING, PAIR, type Figure} from './figures'

/**
 * Two figures flanking the centre column, one either side.
 *
 * Placement is measured from the middle rather than in percentages: the column
 * is a fixed 28rem, so `calc(50% ± 18rem)` puts each figure just outside it at
 * any width. The min/max clamp stops them sliding off a narrow screen — on a
 * phone they end up behind the panel, which is what the depth is for.
 */
const FLANK: Array<{
  figure: Figure
  side: 'left' | 'right'
  left: string
  height: number
  opacity: number
  sway: number
  flip: boolean
  /**
   * The lone figure is traced with the suit highlights left as gaps in the fill,
   * which reads as holes next to the solid pair. A hairline stroke along every
   * subpath closes them; 0.6 units on a 36-unit figure is enough to seal the
   * thickest gap and too little to thicken the profile.
   */
  seal?: number
}> = [
  {
    figure: PAIR,
    side: 'left',
    left: 'max(12%, calc(50% - 22rem))',
    height: 44,
    opacity: 0.72,
    sway: 54,
    flip: false
  },
  {
    figure: AIMING,
    side: 'right',
    left: 'min(88%, calc(50% + 26rem))',
    height: 44,
    opacity: 0.68,
    sway: 67,
    flip: false,
    seal: 0.6
  }
]

export const Crowd = () => {
  const {reduced} = useMotion()
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[72vh]">
      {FLANK.map(({figure, side, left, height, opacity, sway, flip, seal}, i) => (
        <svg
          key={side}
          viewBox={figure.viewBox}
          preserveAspectRatio="xMidYMax meet"
          fill="currentColor"
          stroke={seal ? 'currentColor' : undefined}
          strokeWidth={seal}
          strokeLinejoin="round"
          strokeLinecap="round"
          className={cx('fade-feet absolute bottom-[11vh] -translate-x-1/2', !reduced && 'anim-sway')}
          style={{
            left,
            height: `${height}vh`,
            color: '#05060B',
            opacity,
            transform: flip ? 'scaleX(-1)' : undefined,
            animationDuration: `${sway}s`,
            animationDelay: `${-i * 13}s`
          }}
        >
          {figure.paths.map((d, j) => (
            <path key={j} d={d} />
          ))}
        </svg>
      ))}

      {/* Fog bank in front of them. The per-figure mask does the dissolving; this
          sits them further back into it. */}
      <span
        className="absolute inset-x-0 bottom-0 h-[46vh]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(12,18,34,0) 0%, rgba(13,20,38,.28) 40%, rgba(14,22,42,.62) 72%, rgba(15,24,46,.88) 100%)'
        }}
      />
    </div>
  )
}
