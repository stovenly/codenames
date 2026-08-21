import {useState} from 'react'
import {joinedExisting} from '../../state/net'
import {createRoom, joinRoom, myDisplayName} from '../../state/room'
import {Button, Field, Item, Label, Panel, Rule, Stack, input} from '../atoms'

export const Landing = ({needsPassword: rejected}: {needsPassword: boolean}) => {
  const [name, setName] = useState(myDisplayName())
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

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
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-6 py-16">
      <Stack className="flex flex-col gap-10 sm:gap-14">
        <Item variant="settle" className="flex flex-col gap-4">
          <Label className="text-brass-400/70">Briefing room · classified</Label>
          <h1 className="type-title text-[clamp(3.5rem,13vw,9rem)] text-brass-200">
            Code
            <span className="text-text">names</span>
          </h1>
          <div className="max-w-lg">
            <Rule />
          </div>
          <p className="type-body max-w-sm">
            {joinedExisting
              ? 'Take a seat, pick a side, and wait for the briefing.'
              : 'Two teams. One assassin. Say the wrong word and it is over.'}
          </p>
        </Item>

        <Item className="w-full max-w-sm">
          <Panel className="flex flex-col gap-5 p-6" marks>
            <Field label="Display name">
              <input
                autoFocus
                value={name}
                maxLength={24}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void go()}
                placeholder="Agent"
                className={input}
              />
            </Field>

            {(rejected || !joinedExisting) && (
              <Field
                label={joinedExisting ? 'Room password' : 'Room password — optional'}
                hint={
                  rejected ? (
                    <span className="type-label text-red-glow">Not accepted. Try again.</span>
                  ) : undefined
                }
              >
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void go()}
                  className={input}
                />
              </Field>
            )}

            <Button onClick={() => void go()} disabled={!name.trim() || busy} className="mt-1">
              {joinedExisting ? 'Take a seat' : 'Create a game'}
            </Button>
          </Panel>
        </Item>

      </Stack>
    </main>
  )
}
