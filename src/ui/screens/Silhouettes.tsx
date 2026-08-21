import {cx} from '../cx'
import {useMotion} from '../motion'
import {AIMING, PAIR, type Figure} from './figures'

/**
 * Two equal columns, each centring its own figure. No offsets to compute and
 * nothing that has to stay in sync with the width of the menu.
 */
const FLANK: Array<{
  figure: Figure
  side: 'left' | 'right'
  height: number
  opacity: number
  sway: number
  flip: boolean
  /**
   * The lone figure is traced with the suit highlights left as gaps in the fill,
   * which reads as holes next to the solid pair. A hairline stroke along every
   * subpath closes them; 0.6 units on a 36-unit figure seals the widest gap and
   * is too little to thicken the profile.
   */
  seal?: number
}> = [
  {figure: PAIR, side: 'left', height: 44, opacity: 0.72, sway: 54, flip: false},
  {figure: AIMING, side: 'right', height: 44, opacity: 0.68, sway: 67, flip: false, seal: 0.6}
]

export const Crowd = () => {
  const {reduced} = useMotion()
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[72vh]">
      <div className="grid h-full grid-cols-2 items-end">
        {FLANK.map(({figure, side, height, opacity, sway, flip, seal}, i) => (
          <div key={side} className="flex justify-center pb-[11vh]">
            <svg
              viewBox={figure.viewBox}
              preserveAspectRatio="xMidYMax meet"
              fill="currentColor"
              stroke={seal ? 'currentColor' : undefined}
              strokeWidth={seal}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={cx('fade-feet', !reduced && 'anim-sway')}
              style={{
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
          </div>
        ))}
      </div>

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
