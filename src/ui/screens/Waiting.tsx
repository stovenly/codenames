import {AnimatePresence, motion} from 'motion/react'
import {useEffect, useState} from 'react'
import {shareLink} from '../../net/identity'
import {roomId, useNet} from '../../state/net'
import {intend, setAvatar, useRoom} from '../../state/room'
import * as words from '../../state/words'
import {validate} from '../../game/settings'
import type {Player, Team} from '../../game/types'
import {AvatarPicker} from '../avatar/Picker'
import {Button, Heading, Item, Label, Panel, Rule, Stack} from '../atoms'
import {SettingsPanel} from '../host/SettingsPanel'
import {useMotion} from '../motion'
import {PlayerCard} from '../room/PlayerCard'

const HOST_NOTICE_KEY = 'cn.hostNoticeSeen'

const COLUMNS: Array<{team: Team | null; label: string; rail: string; text: string}> = [
  {team: 'red', label: 'Red', rail: 'bg-red-500', text: 'text-red-glow'},
  {team: null, label: 'Unassigned', rail: 'bg-ink-600', text: 'text-text-dim'},
  {team: 'blue', label: 'Blue', rail: 'bg-blue-500', text: 'text-blue-glow'}
]

const HostNotice = () => {
  const [seen, setSeen] = useState(() => {
    try {
      return sessionStorage.getItem(HOST_NOTICE_KEY) === '1'
    } catch {
      return false
    }
  })
  if (seen) return null
  return (
    <div className="flex items-start gap-4 border-l-2 border-brass-400/60 py-1 pl-4">
      <p className="type-body flex-1 text-brass-200/85">
        You&apos;re running the room — keep this tab in front while you play.
      </p>
      <Button
        variant="quiet"
        size="sm"
        onClick={() => {
          try {
            sessionStorage.setItem(HOST_NOTICE_KEY, '1')
          } catch {
            /* dismissal just will not persist */
          }
          setSeen(true)
        }}
      >
        Dismiss
      </Button>
    </div>
  )
}

export const Waiting = () => {
  const {shared, role, me} = useRoom()
  const {report} = useNet()
  const {reduced} = useMotion()
  const [dragging, setDragging] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  words.useWords()

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  if (!shared) return null

  const isHost = role === 'host'
  const mine = shared.players.find(p => p.id === me)
  const list = words.get(shared.settings.wordListHash)
  const problems = validate(shared.settings, list.length)

  const on = (team: Team | null) => shared.players.filter(p => p.team === team)
  const emptyTeams = (['red', 'blue'] as Team[]).filter(t => on(t).length === 0)
  const missingSpymaster = (['red', 'blue'] as Team[]).filter(
    t => !emptyTeams.includes(t) && !on(t).some(p => p.spymaster)
  )

  const blockers = [
    ...problems.map(p => p.message),
    ...emptyTeams.map(t => `${t === 'red' ? 'Red' : 'Blue'} team has no players`),
    ...missingSpymaster.map(t => `${t === 'red' ? 'Red' : 'Blue'} team has no spymaster`)
  ]

  const readyCount = shared.players.filter(p => p.ready).length
  const outstanding = shared.players.filter(p => !p.ready).map(p => p.name)
  const rttFor = (id: string) => report.peers.find(p => p.playerId === id)?.rttMs ?? null

  const drop = (team: Team | null) => {
    if (!dragging || !isHost) return
    intend({kind: 'setTeam', target: dragging, team})
    setDragging(null)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <Stack className="flex flex-col gap-8">
        <Item className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-brass-400/70">
              {isHost ? 'You are hosting' : 'Waiting room'} · {shared.players.length} in the room
            </Label>
            <h1 className="type-title text-4xl text-brass-200 sm:text-5xl">
              Code<span className="text-text">names</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <code className="type-mono hidden max-w-72 truncate rounded-md border border-ink-600 bg-ink-900/70 px-3 py-2 text-[11px] text-text-dim sm:block">
              {shareLink(roomId)}
            </code>
            <Button
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(shareLink(roomId))
                setCopied(true)
              }}
            >
              {copied ? 'Copied' : 'Copy invite'}
            </Button>
          </div>
        </Item>

        {isHost && (
          <Item>
            <HostNotice />
          </Item>
        )}

        <Item className="grid gap-8 lg:grid-cols-[1fr_19rem]">
          <div className="flex flex-col gap-8">
            <section className="grid gap-4 sm:grid-cols-3">
              {COLUMNS.map(col => (
                <div
                  key={col.label}
                  onDragOver={e => isHost && e.preventDefault()}
                  onDrop={() => drop(col.team)}
                  className={`flex min-h-36 flex-col gap-2.5 rounded-md pl-3 transition-colors ${
                    dragging && isHost ? 'bg-brass-400/[0.04]' : ''
                  }`}
                  style={{borderLeft: '2px solid transparent'}}
                >
                  <div className="-ml-3 flex items-center gap-2.5">
                    <span className={`h-4 w-0.5 rounded-full ${col.rail}`} />
                    <span className={`type-heading ${col.text}`}>{col.label}</span>
                    <span className="type-label ml-auto pr-1">{on(col.team).length}</span>
                  </div>
                  <AnimatePresence initial={false}>
                    {on(col.team).map((p: Player) => (
                      <PlayerCard
                        key={p.id}
                        player={p}
                        isHost={p.id === shared.hostId}
                        isMe={p.id === me}
                        rtt={p.id === me ? 0 : rttFor(p.id)}
                        draggable={isHost}
                        hostControls={isHost}
                        onDragStart={() => setDragging(p.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </section>

            <section className="flex flex-col gap-4">
              <Heading>Your seat</Heading>
              <Rule />
              <div className="flex flex-wrap gap-1.5">
                {COLUMNS.map(col => (
                  <Button
                    key={col.label}
                    size="sm"
                    variant={mine?.team === col.team ? 'primary' : 'ghost'}
                    onClick={() => intend({kind: 'setTeam', target: me, team: col.team})}
                  >
                    {col.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant={mine?.spymaster ? 'primary' : 'ghost'}
                  disabled={!mine?.team}
                  onClick={() =>
                    intend({kind: 'setSpymaster', target: me, spymaster: !mine?.spymaster})
                  }
                >
                  Spymaster
                </Button>
              </div>
              {mine && <AvatarPicker value={mine.avatar} onChange={setAvatar} />}
            </section>
          </div>

          <SettingsPanel settings={shared.settings} editable={isHost} wordCount={list.length} />
        </Item>
      </Stack>

      <div className="sticky bottom-4 z-30 mt-10">
        <Panel level={2} className="flex flex-wrap items-center gap-4 px-4 py-3 backdrop-blur">
          <div className="flex min-w-40 flex-1 flex-col gap-0.5">
            <span className="type-read text-sm text-text">
              {readyCount} <span className="text-text-dim">/ {shared.players.length} ready</span>
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={blockers[0] ?? outstanding.join()}
                initial={reduced ? {opacity: 0} : {opacity: 0, y: 4}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0}}
                className={`type-label ${blockers.length ? 'text-red-glow' : ''}`}
              >
                {blockers[0] ??
                  (outstanding.length && outstanding.length <= 3
                    ? `Waiting on ${outstanding.join(', ')}`
                    : 'Everyone is ready')}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={mine?.ready ? 'primary' : 'ghost'}
              onClick={() => intend({kind: 'ready', ready: !mine?.ready})}
            >
              {mine?.ready ? 'Ready' : 'Ready up'}
            </Button>
            {isHost && (
              <Button onClick={() => intend({kind: 'startGame'})} disabled={blockers.length > 0}>
                Start game
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </main>
  )
}
