import {Volume2, VolumeX} from 'lucide-react'
import {getPrefs, setPrefs, usePrefs} from '../state/prefs'
import {IconButton} from './atoms'
import {sfx} from './sound/audio'

/** Mute is a preference, not a game action, so it lives in the corner on every screen. */
export const MuteToggle = () => {
  const {volume} = usePrefs()
  const off = volume === 0

  return (
    <IconButton
      label={off ? 'Unmute' : 'Mute'}
      active={!off}
      onClick={() => {
        const {volume: now, preMute} = getPrefs()
        // Muting is the slider going to zero and back, so the two never disagree.
        if (now > 0) setPrefs({preMute: now, volume: 0})
        else {
          setPrefs({volume: preMute || 1})
          sfx.arm()
        }
      }}
      className="backdrop-blur"
    >
      {off ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </IconButton>
  )
}
