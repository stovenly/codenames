import {useLayoutEffect, useRef, useState} from 'react'

/** Past this the cards stop being a board and start being furniture. */
const BOARD_MAX = 1350

/**
 * Two thresholds, not one. Folding the rosters into the HUD makes it taller,
 * which shrinks the board, which widens the gutter they were folded away for —
 * so a single threshold sits on a loop and flickers. The band is wider than the
 * ~21px of gutter that switching costs, so whichever side it lands on, it stays.
 */
const FLANK_ON = 88
const FLANK_OFF = 56

/**
 * The board is 7:5 whatever its size, so its height is (5/7)W + (2/7)(n-1)g —
 * 7:5 plus a gap correction. Solving that for the height on offer is what keeps
 * the play screen inside the window; sizing by width alone is what pushed it out.
 *
 * `gutter` is what is left over at each side, which is where the team rosters go
 * when there is enough of it.
 */
export const useBoardFit = (size: number) => {
  const ref = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<
    {width: number; gutter: number; outside: number; flanks: boolean} | null
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
      setFit(prev => ({
        width,
        gutter,
        outside,
        flanks: gutter >= (prev?.flanks ? FLANK_OFF : FLANK_ON)
      }))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [size])

  return {ref, fit}
}
