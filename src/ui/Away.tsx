import {useEffect} from 'react'
import {AWAY_NOTICE_MS, useRoom} from '../state/room'
import {Label} from './atoms'
import {cx} from './cx'

const BASE_TITLE = 'Codenames'

/**
 * A host who cannot see the page can still see its tab, so the first rungs use
 * the title and the favicon. Neither needs a permission prompt.
 */
const paintFavicon = (dot: 'none' | 'amber' | 'red') => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const g = canvas.getContext('2d')
  if (!g) return

  g.fillStyle = '#0A0D18'
  g.beginPath()
  g.roundRect(2, 2, 60, 60, 14)
  g.fill()
  g.strokeStyle = '#C9962C'
  g.lineWidth = 4
  g.stroke()

  g.fillStyle = '#FFC53D'
  g.font = 'bold 40px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('C', 32, 36)

  if (dot !== 'none') {
    g.fillStyle = dot === 'red' ? '#FF2D2D' : '#FFC53D'
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
  const away = role === 'host' && hiddenMs >= AWAY_NOTICE_MS

  useEffect(() => {
    if (!away) {
      document.title = BASE_TITLE
      paintFavicon('none')
      return
    }
    if (degrading) {
      document.title = 'Come back — the game is lagging'
      paintFavicon('red')
    } else {
      document.title = `(!) ${BASE_TITLE}`
      paintFavicon('amber')
    }
  }, [away, degrading])

  return null
}

export const HostAwayPill = () => {
  const {shared, role} = useRoom()
  if (!shared || role === 'host' || !shared.hostHidden) return null
  return (
    <div
      className={cx(
        'fixed top-4 right-4 z-40 rounded-full border px-3 py-1.5 backdrop-blur',
        shared.hostDegraded ? 'border-lamp-500/60 bg-lamp-500/10' : 'border-stage-600 bg-stage-800/80'
      )}
    >
      <Label className={shared.hostDegraded ? 'text-lamp-300' : undefined}>
        {shared.hostDegraded ? 'Host away · connection unstable' : 'Host is away'}
      </Label>
    </div>
  )
}
