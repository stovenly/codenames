import {useEffect, useState} from 'react'
import {on, publishRoomToHash, roomId, self, send, startMesh, useNet} from '../../state/net'
import {shareLink} from '../../net/identity'
import {Button, BrassRule, Panel, Pill} from '../atoms'

type Line = {from: string; text: string; at: number}

/** Step 02 harness: proves the router carries text between browsers. Replaced by the real screens in 05. */
export const Echo = () => {
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState('')
  const {report} = useNet()

  useEffect(() => {
    startMesh()
    publishRoomToHash()
    return on('echo', (body, env) => {
      const text = typeof body === 'string' ? body : JSON.stringify(body)
      setLines(l => [...l.slice(-40), {from: env.from, text, at: Date.now()}])
    })
  }, [])

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    send('echo', text)
    setLines(l => [...l.slice(-40), {from: self, text, at: Date.now()}])
    setDraft('')
  }

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-6 py-14">
      <header className="flex flex-col gap-3">
        <Pill tone="brass">02 — transport</Pill>
        <h1 className="type-display text-4xl text-brass-200">Mesh check</h1>
        <p className="text-sm text-text-dim">
          Open this link in another browser or on a phone. Anything typed here travels the router.
        </p>
      </header>

      <Panel className="flex items-center justify-between gap-3 p-4">
        <code className="type-mono truncate text-xs text-text">{shareLink(roomId)}</code>
        <Button variant="ghost" onClick={() => void navigator.clipboard.writeText(shareLink(roomId))}>
          Copy
        </Button>
      </Panel>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Say something"
          className="type-mono flex-1 rounded-md border border-ink-600 bg-ink-800 px-4 py-3 text-sm text-text placeholder:text-text-dim/60"
        />
        <Button onClick={submit} disabled={!draft.trim()}>
          Send
        </Button>
      </div>

      <Panel className="min-h-40 p-4">
        <BrassRule className="mb-3" />
        {lines.length === 0 ? (
          <p className="text-xs text-text-dim">
            Nothing yet. {report.router.directPeers} peer
            {report.router.directPeers === 1 ? '' : 's'} connected.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {lines.map(l => (
              <li key={`${l.at}-${l.from}-${l.text}`} className="type-mono text-xs">
                <span className={l.from === self ? 'text-brass-200' : 'text-blue-glow'}>
                  {l.from === self ? 'you' : l.from.slice(0, 6)}
                </span>
                <span className="text-text-dim"> · </span>
                <span className="text-text">{l.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  )
}
