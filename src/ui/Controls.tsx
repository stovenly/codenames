import {Sparkles, Volume2, VolumeX} from 'lucide-react'
import {getPrefs, setPrefs, usePrefs} from '../state/prefs'
import {IconButton} from './atoms'
import {useMotion} from './motion'
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

/**
 * The OS reduced-motion setting is honoured by default, which means a machine
 * with animations turned off sees a completely still stage and no way to tell
 * that was deliberate. This is that way out, and it sits next to the mute so it
 * is findable from any screen.
 */
export const EffectsToggle = () => {
  const {reduced} = useMotion()
  return (
    <IconButton
      label={reduced ? 'Turn effects on' : 'Turn effects off'}
      active={!reduced}
      onClick={() => setPrefs({motion: reduced ? 'full' : 'reduced'})}
      className="backdrop-blur"
    >
      <Sparkles className="size-4" />
    </IconButton>
  )
}
