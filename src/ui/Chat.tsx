import {useEffect, useRef, useState} from 'react'
import {SendHorizontal, VenetianMask} from 'lucide-react'
import {
  markRead,
  readable,
  rooms,
  say,
  useChat,
  whyLocked,
  writable,
  type Channel,
  type Message,
  type Room
} from '../state/chat'
import type {Player} from '../game/types'
import {useRoom} from '../state/room'
import {AvatarView} from './avatar/Avatar'
import {Agent, Onlooker} from './board/symbols'
import {Heading, IconButton, Label, Panel, input} from './atoms'
import {cx} from './cx'

const NAME: Record<Channel, string> = {all: 'All', team: 'Team', spymasters: 'Spymasters'}

const teamTint = (team: string | null) =>
  team === 'red' ? 'text-red-lit' : team === 'blue' ? 'text-blue-lit' : 'text-text-dim'

const BLOCK: Record<Exclude<Room, 'all'>, {frame: string; label: string; tint: string}> = {
  'team:red': {frame: 'border-red-500/40 bg-red-500/[.08]', label: 'Red', tint: 'text-red-lit/80'},
  'team:blue': {
    frame: 'border-blue-500/40 bg-blue-500/[.08]',
    label: 'Blue',
    tint: 'text-blue-lit/80'
  },
  spymasters: {frame: 'border-stage-600 bg-stage-800/70', label: 'Spymasters', tint: 'text-text-dim'}
}

const Said = ({msg, who}: {msg: Message; who: Player | undefined}) => {
  // No team is no team, whether they are watching or waiting: the fedora is the
  // mark of somebody playing for a side.
  const onASide = !!msg.team
  const Mark = msg.spymaster ? VenetianMask : onASide ? Agent : Onlooker

  return (
    <div className="flex items-start gap-2">
      {who && (
        <span className="mt-0.5 shrink-0 rounded-full ring-1 ring-gold-500/25">
          <AvatarView spec={who.avatar} size={22} className="rounded-full" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <Mark className={cx('size-3.5 shrink-0', teamTint(msg.team))} />
          <span className={cx('type-read truncate text-sm', teamTint(msg.team))}>
            {who?.name ?? 'someone'}
          </span>
        </span>
        <p className="type-body break-words">{msg.text}</p>
      </div>
    </div>
  )
}

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

  const blocks = rooms(messages)
  const person = (id: string) => shared?.players.find(p => p.id === id)

  return (
    <Panel level={2} className="flex max-h-[70vh] flex-col p-4 backdrop-blur">
      <Heading>Chat</Heading>

      <div className="mt-3 flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="type-body text-text-dim">Nobody has said anything.</p>
        ) : (
          blocks.map((block, i) =>
            block.room === 'all' ? (
              block.items.map(msg => <Said key={msg.id} msg={msg} who={person(msg.from)} />)
            ) : (
              <div
                key={`${block.room}-${block.items[0]!.id}-${i}`}
                className={cx(
                  'flex flex-col gap-2 rounded-md border px-2.5 pt-1.5 pb-2',
                  BLOCK[block.room].frame
                )}
              >
                <Label className={BLOCK[block.room].tint}>{BLOCK[block.room].label}</Label>
                {block.items.map(msg => (
                  <Said key={msg.id} msg={msg} who={person(msg.from)} />
                ))}
              </div>
            )
          )
        )}
        <div ref={foot} />
      </div>

      {/* Beside the box it governs: who is about to hear this and the thing that
          sends it are one decision. */}
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

      <div className="mt-2 flex items-center gap-2">
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
