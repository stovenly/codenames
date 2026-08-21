import {AnimatePresence, motion} from 'motion/react'
import {Suspense, lazy, useEffect} from 'react'
import {derive} from '../game/reducer'
import {publishRoomToHash} from '../state/net'
import {start, useRoom} from '../state/room'
import * as words from '../state/words'
import {AwayWatch, HostAwayPill} from './Away'
import {Diagnostics} from './Diagnostics'
import {Panel} from './atoms'
import {spring} from './motion'
import {Landing} from './screens/Landing'

const Waiting = lazy(() => import('./screens/Waiting').then(m => ({default: m.Waiting})))
const Game = lazy(() => import('./screens/Game').then(m => ({default: m.Game})))

const Loading = ({label}: {label: string}) => (
  <main className="flex min-h-full items-center justify-center">
    <p className="type-label animate-pulse">{label}</p>
  </main>
)

const Banner = ({text, tone}: {text: string; tone: 'brass' | 'danger'}) => (
  <motion.div
    initial={{opacity: 0, y: -12}}
    animate={{opacity: 1, y: 0}}
    exit={{opacity: 0, y: -12}}
    transition={spring.firm}
    className="fixed inset-x-0 top-3 z-50 mx-auto w-fit max-w-[92vw] px-3"
  >
    <Panel
      level={2}
      className={`border px-4 py-2 text-xs ${
        tone === 'danger'
          ? 'border-void-rim/60 text-bone'
          : 'border-brass-400/40 text-brass-200'
      }`}
    >
      {text}
    </Panel>
  </motion.div>
)

export const App = () => {
  const {role, shared, banner, split} = useRoom()
  words.useWords()

  useEffect(() => {
    start()
    publishRoomToHash()
  }, [])

  const view = shared
    ? derive(shared.settings, words.get(shared.settings.wordListHash), shared.steps, shared.cursor)
    : null

  return (
    <>
      <AwayWatch />

      <AnimatePresence>
        {split && (
          <Banner
            key="split"
            tone="danger"
            text="The room looks split in two. Someone should reload to bring it back together."
          />
        )}
        {banner && !split && <Banner key={banner} tone="brass" text={banner} />}
      </AnimatePresence>

      {role === 'idle' || role === 'rejected' ? (
        <Landing needsPassword={role === 'rejected'} />
      ) : role === 'joining' ? (
        <Loading label="Connecting…" />
      ) : view && view.phase !== 'setup' ? (
        <Suspense fallback={<Loading label="Dealing the board…" />}>
          <Game />
        </Suspense>
      ) : (
        <Suspense fallback={<Loading label="Opening the room…" />}>
          <Waiting />
        </Suspense>
      )}

      <HostAwayPill />
      <Diagnostics />
    </>
  )
}
