import {getPrefs, setPrefs, usePrefs} from '../state/prefs'
import {sfx} from './sound/audio'
import {IconButton, SoundOff, SoundOn} from './icons'

/**
 * Persistent corner controls. Mute belongs here rather than in the HUD: it is a
 * preference, not a game action, and it has to be reachable from every screen.
 */
export const MuteToggle = () => {
  const {muted} = usePrefs()
  return (
    <IconButton
      label={muted ? 'Unmute' : 'Mute'}
      active={!muted}
      onClick={() => {
        const next = !getPrefs().muted
        setPrefs({muted: next})
        if (!next) sfx.arm()
      }}
      className="surface-1 backdrop-blur"
    >
      {muted ? <SoundOff /> : <SoundOn />}
    </IconButton>
  )
}
