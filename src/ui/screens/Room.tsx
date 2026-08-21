import {AnimatePresence, motion} from 'motion/react'
import {shareLink} from '../../net/identity'
import {roomId} from '../../state/net'
import {useRoom} from '../../state/room'
import {Button, BrassRule, Panel, Pill} from '../atoms'
import {spring, useReducedMotion} from '../motion'

export const Room = () => {
  const {shared, role, banner, split, me} = useRoom()
  const reduced = useReducedMotion()
  if (!shared) return null

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Pill tone="brass">{role === 'host' ? 'You are hosting' : 'Waiting room'}</Pill>
          <h1 className="type-display text-3xl text-brass-200">Codenames</h1>
        </div>
        <Button variant="ghost" onClick={() => void navigator.clipboard.writeText(shareLink(roomId))}>
          Copy invite
        </Button>
      </header>

      <AnimatePresence>
        {split && (
          <motion.div
            initial={reduced ? {opacity: 0} : {opacity: 0, y: -8}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0}}
            transition={spring.firm}
          >
            <Panel className="border-void-rim/60 bg-void-rim/10 p-4 text-sm text-bone">
              The room looks split in two. Someone should reload to bring it back together.
            </Panel>
          </motion.div>
        )}
        {banner && (
          <motion.div
            initial={reduced ? {opacity: 0} : {opacity: 0, y: -8}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0}}
            transition={spring.firm}
          >
            <Panel className="rule-brass border bg-brass-400/10 p-3 text-sm text-brass-200">{banner}</Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel className="p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="type-display text-sm text-text-dim">Roster</h2>
          <span className="type-mono text-[11px] text-text-dim">{shared.players.length} in room</span>
        </div>
        <BrassRule className="my-3" />
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {shared.players.map(p => (
              <motion.li
                key={p.id}
                layout={!reduced}
                initial={reduced ? {opacity: 0} : {opacity: 0, x: -10}}
                animate={{opacity: p.connected ? 1 : 0.45, x: 0}}
                exit={{opacity: 0}}
                transition={spring.soft}
                className="flex items-center justify-between gap-3 rounded-md border border-ink-600 bg-ink-700/50 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm text-text">{p.name}</span>
                  {p.id === me && <span className="type-mono text-[11px] text-text-dim">you</span>}
                </span>
                <span className="flex items-center gap-2">
                  {!p.connected && <Pill>away</Pill>}
                  {p.id === shared.hostId && <Pill tone="brass">host</Pill>}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Panel>

      <p className="type-mono text-[11px] text-text-dim">
        epoch {shared.hostEpoch} · version {shared.version}
        {shared.hostHidden ? ' · host tab hidden' : ''}
      </p>
    </main>
  )
}
