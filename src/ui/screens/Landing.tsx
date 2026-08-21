import {motion} from 'motion/react'
import {useState} from 'react'
import {joinedExisting} from '../../state/net'
import {createRoom, joinRoom, myDisplayName} from '../../state/room'
import {Button, BrassRule, Panel, Pill} from '../atoms'
import {spring, useReducedMotion} from '../motion'

export const Landing = ({needsPassword}: {needsPassword: boolean}) => {
  const [name, setName] = useState(myDisplayName())
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const reduced = useReducedMotion()

  const go = async () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const pass = password.trim() || null
    if (joinedExisting) await joinRoom(trimmed, pass)
    else await createRoom(trimmed, pass)
    setBusy(false)
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-7 px-6 py-16">
      <motion.header
        initial={reduced ? {opacity: 0} : {opacity: 0, y: 18}}
        animate={{opacity: 1, y: 0}}
        transition={spring.soft}
        className="flex flex-col gap-3"
      >
        <Pill tone="brass">Briefing room</Pill>
        <h1 className="type-display text-5xl leading-none text-brass-200">Codenames</h1>
        <p className="text-sm text-text-dim">
          {joinedExisting
            ? 'You have been invited to a room. Pick a name to take a seat.'
            : 'Peer to peer, no server, no accounts. Create a room and share the link.'}
        </p>
      </motion.header>

      <BrassRule />

      <Panel className="flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-2">
          <span className="type-mono text-[11px] tracking-wide text-text-dim">Display name</span>
          <input
            autoFocus
            value={name}
            maxLength={24}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void go()}
            placeholder="Agent"
            className="rounded-md border border-ink-600 bg-ink-900 px-4 py-3 text-sm text-text placeholder:text-text-dim/50"
          />
        </label>

        {(needsPassword || !joinedExisting) && (
          <label className="flex flex-col gap-2">
            <span className="type-mono text-[11px] tracking-wide text-text-dim">
              {joinedExisting ? 'Room password' : 'Room password (optional)'}
            </span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void go()}
              className="rounded-md border border-ink-600 bg-ink-900 px-4 py-3 text-sm text-text"
            />
            {needsPassword && (
              <span className="type-mono text-[11px] text-red-glow">
                That password was not accepted. Try again.
              </span>
            )}
          </label>
        )}

        <Button onClick={() => void go()} disabled={!name.trim() || busy}>
          {joinedExisting ? 'Take a seat' : 'Create a game'}
        </Button>
      </Panel>
    </main>
  )
}
