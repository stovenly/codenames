import {useEffect} from 'react'
import {AWAY_NOTICE_MS, useRoom} from '../state/room'
import {Pill} from './atoms'

const BASE_TITLE = 'Codenames'

/**
 * The host cannot see its own UI while hidden, so the first rungs use the two
 * surfaces that are visible from another tab: the document title and the
 * favicon. Neither needs a permission prompt.
 */
const paintFavicon = (dot: 'none' | 'amber' | 'red') => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const g = canvas.getContext('2d')
  if (!g) return

  g.fillStyle = '#0D1220'
  g.beginPath()
  g.roundRect(2, 2, 60, 60, 14)
  g.fill()
  g.strokeStyle = '#D9A441'
  g.lineWidth = 4
  g.stroke()

  g.fillStyle = '#F0D18A'
  g.font = 'bold 38px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('C', 32, 35)

  if (dot !== 'none') {
    g.fillStyle = dot === 'red' ? '#E0503F' : '#D9A441'
    g.beginPath()
    g.arc(50, 14, 12, 0, Math.PI * 2)
    g.fill()
  }

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.append(link)
  }
  link.href = canvas.toDataURL('image/png')
}

export const AwayWatch = () => {
  const {role, hiddenMs, degrading} = useRoom()
  const hosting = role === 'host'
  const away = hosting && hiddenMs >= AWAY_NOTICE_MS

  useEffect(() => {
    if (!away) {
      document.title = BASE_TITLE
      paintFavicon('none')
      return
    }
    if (degrading) {
      document.title = '(!!) Come back — game is lagging'
      paintFavicon('red')
    } else {
      document.title = `(!) ${BASE_TITLE}`
      paintFavicon('amber')
    }
  }, [away, degrading])

  return null
}

/** What everyone else sees while the host's tab is in the background. */
export const HostAwayPill = () => {
  const {shared, role} = useRoom()
  if (!shared || role === 'host' || !shared.hostHidden) return null
  return (
    <div className="fixed top-3 right-3 z-40">
      <Pill tone={shared.hostDegraded ? 'warn' : 'neutral'}>
        {shared.hostDegraded ? 'Host away, connections unstable' : 'Host is away'}
      </Pill>
    </div>
  )
}
