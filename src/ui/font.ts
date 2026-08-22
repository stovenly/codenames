import {getPrefs, setPrefs, subscribePrefs} from '../state/prefs'

/**
 * OpenDyslexic, fetched only when somebody asks for it.
 *
 * 172 KB against a first paint of about 180 KB — bundling it would roughly
 * double what everyone downloads to serve the few who want it. It lives in
 * public/ and is pulled in on demand; index.css swaps the whole type stack
 * behind body.is-dyslexic.
 */
const FAMILY = 'OpenDyslexic'
const BODY_CLASS = 'is-dyslexic'
const URL = `${import.meta.env.BASE_URL}fonts/OpenDyslexic-Regular.otf`

let state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'

const apply = () => {
  const want = getPrefs().dyslexic
  document.body.classList.toggle(BODY_CLASS, want && state === 'ready')

  if (!want || state !== 'idle') return

  state = 'loading'
  void new FontFace(FAMILY, `url(${URL})`)
    .load()
    .then(face => {
      document.fonts.add(face)
      state = 'ready'
      apply()
    })
    .catch(() => {
      // A missing typeface is not worth breaking the game over; the interface
      // keeps its own and the switch simply does nothing.
      state = 'failed'
    })
}

export const watchDyslexicFont = () => {
  apply()
  subscribePrefs(apply)
}

/** Turning it on is a real download, so the switch says so while it happens. */
export const fontLoading = () => state === 'loading'

export const toggleDyslexicFont = () => setPrefs({dyslexic: !getPrefs().dyslexic})
