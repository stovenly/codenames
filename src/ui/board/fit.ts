import {useLayoutEffect, useRef, useState} from 'react'

/** Past this the cards stop being a board and start being furniture. */
const BOARD_MAX = 1350

/**
 * Enough beside the board for a face and the name next to it. One threshold and
 * no hysteresis, which only works because the HUD is the same height either way:
 * it keeps the roster's slot open whether the faces are in it or out in the
 * gutters, and takes its clearance from the viewport rather than from where they
 * went. Anything the placement changes about the height feeds straight back into
 * the gutter it was measured against, and the two placements chase each other.
 *
 * Below this the faces fold into the HUD rather than standing in a gutter too
 * narrow to name them.
 */
const FLANK_MIN = 118

/** Past this a name is a stripe across the window rather than a label. */
const FLANK_MAX = 240

/**
 * The board is 7:5 whatever its size, so its height is (5/7)W + (2/7)(n-1)g —
 * 7:5 plus a gap correction. Solving that for the height on offer is what keeps
 * the play screen inside the window; sizing by width alone is what pushed it out.
 *
 * `flankWidth` is what is left beside it for a team roster, counting the space
 * outside the column as well as the gutter inside it; `overhang` is how much of
 * that falls outside.
 */
export const useBoardFit = (size: number) => {
  const ref = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<
    {width: number; flankWidth: number; overhang: number; flanks: boolean} | null
  >(null)

  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return

    const measure = () => {
      const gap = parseFloat(getComputedStyle(box).getPropertyValue('--board-gap')) || 10
      const correction = ((size - 1) * gap * 2) / 7
      const {width: available, height} = box.getBoundingClientRect()
      const width = Math.max(0, Math.min(available, BOARD_MAX, 1.4 * (height - correction)))
      const gutter = (available - width) / 2
      // The column is capped at 1600 and the board at 1350, so on a wide screen
      // the room for a name is mostly outside the column, not in the gutter.
      const outside = Math.max(0, (window.innerWidth - available) / 2 - 8)
      const flankWidth = Math.min(FLANK_MAX, gutter + outside)
      setFit({
        width,
        flankWidth,
        overhang: Math.max(0, flankWidth - gutter),
        flanks: flankWidth >= FLANK_MIN
      })
    }

    measure()
    addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => {
      removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [size])

  return {ref, fit}
}
