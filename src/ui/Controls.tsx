import {Volume2, VolumeX} from 'lucide-react'
import {getPrefs, setPrefs, usePrefs} from '../state/prefs'
import {IconButton} from './atoms'
import {sfx} from './sound/audio'

/** Mute is a preference, not a game action, so it lives in the corner on every screen. */
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
      className="backdrop-blur"
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </IconButton>
  )
}
