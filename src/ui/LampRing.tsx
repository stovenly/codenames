import {useMemo} from 'react'
import {cx} from './cx'

/** Evenly spaced points around the edge of a box, clockwise from the top left. */
const perimeter = (across: number, down: number) => {
  const points: Array<{x: number; y: number}> = []
  for (let i = 0; i < across; i++) points.push({x: (i / across) * 100, y: 0})
  for (let i = 0; i < down; i++) points.push({x: 100, y: (i / down) * 100})
  for (let i = across; i > 0; i--) points.push({x: (i / across) * 100, y: 100})
  for (let i = down; i > 0; i--) points.push({x: 0, y: (i / down) * 100})
  return points
}

/**
 * A marquee border of bulbs chasing around whatever it is placed inside. The
 * sign on the landing screen and the result panel are the same idea and should
 * be the same object, rather than each having its own take on lights.
 */
export const LampRing = ({
  across = 13,
  down = 6,
  className
}: {
  across?: number
  down?: number
  className?: string
}) => {
  const lamps = useMemo(() => perimeter(across, down), [across, down])

  return (
    <span aria-hidden className={cx('pointer-events-none absolute inset-0', className)}>
      {lamps.map((p, i) => (
        <span
          key={i}
          className="lamp lamp-run"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            ['--i' as string]: i,
            ['--n' as string]: lamps.length
          }}
        />
      ))}
    </span>
  )
}
