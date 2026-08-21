import {AnimatePresence, motion} from 'motion/react'
import {useEffect} from 'react'
import {derive} from '../game/reducer'
import {publishRoomToHash} from '../state/net'
import {start, useRoom} from '../state/room'
import * as words from '../state/words'
import {Diagnostics} from './Diagnostics'
import {Panel} from './atoms'
import {spring} from './motion'
import {Landing} from './screens/Landing'
import {Waiting} from './screens/Waiting'

const Banner = ({text, tone}: {text: string; tone: 'brass' | 'danger'}) => (
  <motion.div
    initial={{opacity: 0, y: -12}}
    animate={{opacity: 1, y: 0}}
    exit={{opacity: 0, y: -12}}
    transition={spring.firm}
    className="fixed inset-x-0 top-3 z-50 mx-auto w-fit max-w-[92vw] px-3"
  >
    <Panel
      className={`px-4 py-2 text-sm ${
        tone === 'danger'
          ? 'border-void-rim/60 bg-void-rim/15 text-bone'
          : 'rule-brass border bg-brass-400/10 text-brass-200'
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
        <main className="flex min-h-full items-center justify-center">
          <p className="type-mono animate-pulse text-sm text-text-dim">Connecting…</p>
        </main>
      ) : view && view.phase !== 'setup' ? (
        <main className="flex min-h-full items-center justify-center">
          <p className="type-mono text-sm text-text-dim">Game in progress…</p>
        </main>
      ) : (
        <Waiting />
      )}

      <Diagnostics />
    </>
  )
}
