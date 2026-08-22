import {useEffect, useRef, useState} from 'react'
import {SendHorizontal} from 'lucide-react'
import {
  markRead,
  readable,
  say,
  useChat,
  whyLocked,
  writable,
  type Channel
} from '../state/chat'
import {useRoom} from '../state/room'
import {AvatarView} from './avatar/Avatar'
import {Heading, IconButton, Label, Panel, input} from './atoms'
import {cx} from './cx'

const NAME: Record<Channel, string> = {all: 'All', team: 'Team', spymasters: 'Spymasters'}

const tint = (msg: {channel: Channel}, team: string | null) =>
  msg.channel === 'spymasters'
    ? 'text-lamp-300'
    : msg.channel === 'team'
      ? team === 'red'
        ? 'text-red-lit'
        : 'text-blue-lit'
      : 'text-text-dim'

export const Chat = () => {
  const {shared} = useRoom()
  const messages = useChat()
  const channels = readable()
  const [channel, setChannel] = useState<Channel>('all')
  const [draft, setDraft] = useState('')
  const foot = useRef<HTMLDivElement>(null)

  // A channel can be taken away mid-game — a guesser made spymaster loses Team.
  const active = channels.includes(channel) ? channel : 'all'
  const locked = whyLocked(active)

  useEffect(() => {
    markRead()
    foot.current?.scrollIntoView({block: 'end'})
  }, [messages.length])

  const submit = () => {
    say(active, draft)
    setDraft('')
  }

  return (
    <Panel level={2} className="flex max-h-[70vh] flex-col p-4 backdrop-blur">
      <Heading>Chat</Heading>

      <div className="mt-3 flex gap-1.5">
        {channels.map(c => (
          <button
            key={c}
            type="button"
            aria-pressed={active === c}
            onClick={() => setChannel(c)}
            className={cx(
              'type-label cursor-pointer rounded-sm border px-2.5 py-1 transition-colors duration-[120ms]',
              active === c
                ? 'border-lamp-500/70 bg-lamp-500/10 text-lamp-300'
                : 'border-stage-600 hover:border-gold-500/50 hover:text-text'
            )}
          >
            {NAME[c]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="type-body text-text-dim">Nobody has said anything.</p>
        ) : (
          messages.map(msg => {
            const who = shared?.players.find(p => p.id === msg.from)
            return (
              <div key={msg.id} className="flex items-start gap-2">
                {who && (
                  <span className="mt-0.5 shrink-0 rounded-full ring-1 ring-gold-500/25">
                    <AvatarView spec={who.avatar} size={22} className="rounded-full" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="type-read truncate text-sm text-text">
                      {who?.name ?? 'someone'}
                    </span>
                    <Label className={tint(msg, who?.team ?? null)}>{NAME[msg.channel]}</Label>
                  </span>
                  <p className="type-body break-words">{msg.text}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={foot} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          maxLength={400}
          disabled={!!locked}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={locked ?? `Say something to ${NAME[active]}`}
          className={cx(input, 'flex-1 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60')}
        />
        <IconButton
          label="Send"
          disabled={!draft.trim() || !writable(active)}
          onClick={submit}
          className="size-9"
        >
          <SendHorizontal className="size-4" />
        </IconButton>
      </div>
    </Panel>
  )
}
