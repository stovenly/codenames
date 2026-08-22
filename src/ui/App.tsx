import {AnimatePresence, motion} from 'motion/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import {Suspense, lazy, useEffect} from 'react'
import {derive} from '../game/reducer'
import {start, useRoom} from '../state/room'
import * as words from '../state/words'
import {AwayWatch, HostAwayPill} from './Away'
import {Diagnostics} from './Diagnostics'
import {Label, Panel, Stage} from './atoms'
import {cx} from './cx'
import {spring} from './motion'
import {Connecting} from './screens/Connecting'
import {Landing} from './screens/Landing'

const Waiting = lazy(() => import('./screens/Waiting').then(m => ({default: m.Waiting})))
const Game = lazy(() => import('./screens/Game').then(m => ({default: m.Game})))

const Loading = ({label}: {label: string}) => (
  <main className="flex min-h-full items-center justify-center">
    <Label className="animate-pulse">{label}</Label>
  </main>
)

const Banner = ({text, tone}: {text: string; tone: 'lamp' | 'danger'}) => (
  <motion.div
    initial={{opacity: 0, y: -12}}
    animate={{opacity: 1, y: 0}}
    exit={{opacity: 0, y: -12}}
    transition={spring.firm}
    className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[92vw] px-3"
  >
    <Panel
      level={2}
      className={cx(
        'px-4 py-2',
        tone === 'danger' ? 'border-kill-lit/60 text-bone' : 'border-lamp-500/50 text-lamp-300'
      )}
    >
      <span className="type-read text-xs">{text}</span>
    </Panel>
  </motion.div>
)

export const App = () => {
  const {role, shared, banner, split} = useRoom()
  words.useWords()

  useEffect(() => {
    start()
  }, [])

  const view = shared
    ? derive(shared.settings, words.get(shared.settings.wordListHash), shared.steps, shared.cursor)
    : null

  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={200}>
      <Stage />
      <AwayWatch />

      <AnimatePresence>
        {split && (
          <Banner key="split" tone="danger" text="The room has split in two. Someone should reload." />
        )}
        {banner && !split && <Banner key={banner} tone="lamp" text={banner} />}
      </AnimatePresence>

      {role === 'idle' || role === 'rejected' ? (
        <Landing rejected={role === 'rejected'} />
      ) : role === 'joining' ? (
        <Connecting title="Taking your seat" />
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
    </Tooltip.Provider>
  )
}
