import {AnimatePresence, motion} from 'motion/react'
import {useEffect, useState} from 'react'
import {shareLink} from '../../net/identity'
import {roomId, useNet} from '../../state/net'
import {intend, setAvatar, useRoom} from '../../state/room'
import * as words from '../../state/words'
import {validate} from '../../game/settings'
import type {Player, Team} from '../../game/types'
import {AvatarPicker} from '../avatar/Picker'
import {Button, BrassRule, Panel, Pill} from '../atoms'
import {SettingsPanel} from '../host/SettingsPanel'
import {spring, useReducedMotion} from '../motion'
import {PlayerCard} from '../room/PlayerCard'

const HOST_NOTICE_KEY = 'cn.hostNoticeSeen'

const COLUMNS: Array<{team: Team | null; label: string; tone: string}> = [
  {team: 'red', label: 'Red', tone: 'border-red-500/40 text-red-glow'},
  {team: null, label: 'Unassigned', tone: 'border-ink-600 text-text-dim'},
  {team: 'blue', label: 'Blue', tone: 'border-blue-500/40 text-blue-glow'}
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
    <div className="rule-brass flex items-start gap-3 border-l-2 bg-brass-400/5 px-3 py-2">
      <p className="flex-1 text-xs leading-relaxed text-brass-200">
        You&apos;re hosting. Keep this tab in front — a backgrounded tab gets throttled by the browser
        and everyone&apos;s connection suffers.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.setItem(HOST_NOTICE_KEY, '1')
          } catch {
            /* dismissal just will not persist */
          }
          setSeen(true)
        }}
        className="type-mono cursor-pointer text-[11px] text-text-dim hover:text-brass-200"
      >
        got it
      </button>
    </div>
  )
}

export const Waiting = () => {
  const {shared, role, me} = useRoom()
  const {report} = useNet()
  const reduced = useReducedMotion()
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

  const teamsFor = (team: Team | null) => shared.players.filter(p => p.team === team)
  const missingSpymaster = (['red', 'blue'] as Team[]).filter(
    t => !teamsFor(t).some(p => p.spymaster)
  )
  const emptyTeams = (['red', 'blue'] as Team[]).filter(t => teamsFor(t).length === 0)

  const blockers = [
    ...problems.map(p => p.message),
    ...emptyTeams.map(t => `${t === 'red' ? 'Red' : 'Blue'} team has no players`),
    ...missingSpymaster
      .filter(t => !emptyTeams.includes(t))
      .map(t => `${t === 'red' ? 'Red' : 'Blue'} team has no spymaster`)
  ]

  const readyCount = shared.players.filter(p => p.ready).length
  const outstanding = shared.players.filter(p => !p.ready).map(p => p.name)

  const rttFor = (id: string) => report.peers.find(p => p.playerId === id)?.rttMs ?? null

  const drop = (team: Team | null) => {
    if (!dragging || !isHost) return
    intend({kind: 'setTeam', target: dragging, team})
    setDragging(null)
  }

  const copy = () => {
    void navigator.clipboard.writeText(shareLink(roomId))
    setCopied(true)
  }

  return (
    <main className="mx-auto flex min-h-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Pill tone="brass">{isHost ? 'You are hosting' : 'Waiting room'}</Pill>
          <h1 className="type-display text-3xl text-brass-200 sm:text-4xl">Codenames</h1>
        </div>
        <div className="flex items-center gap-2">
          <code className="type-mono hidden max-w-64 truncate rounded-md border border-ink-600 bg-ink-800 px-3 py-2 text-[11px] text-text-dim sm:block">
            {shareLink(roomId)}
          </code>
          <Button variant="ghost" onClick={copy}>
            {copied ? 'Copied' : 'Copy invite'}
          </Button>
        </div>
      </header>

      {isHost && <HostNotice />}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {COLUMNS.map(col => (
              <div
                key={col.label}
                onDragOver={e => isHost && e.preventDefault()}
                onDrop={() => drop(col.team)}
                className={`flex min-h-32 flex-col gap-2 rounded-lg border border-dashed p-2.5 ${col.tone} ${
                  dragging && isHost ? 'bg-brass-400/5' : ''
                }`}
              >
                <div className="flex items-baseline justify-between px-1">
                  <span className="type-display text-xs">{col.label}</span>
                  <span className="type-mono text-[10px] opacity-60">{teamsFor(col.team).length}</span>
                </div>
                <AnimatePresence initial={false}>
                  {teamsFor(col.team).map((p: Player) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      isHost={p.id === shared.hostId}
                      isMe={p.id === me}
                      rtt={p.id === me ? 0 : rttFor(p.id)}
                      draggable={isHost}
                      onDragStart={() => setDragging(p.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <Panel className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-mono text-[11px] text-text-dim">Your seat</span>
              <div className="flex flex-wrap gap-1.5">
                {COLUMNS.map(col => (
                  <button
                    key={col.label}
                    type="button"
                    onClick={() => intend({kind: 'setTeam', target: me, team: col.team})}
                    className={`type-mono cursor-pointer rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
                      mine?.team === col.team
                        ? 'border-brass-400 bg-brass-400/15 text-brass-200'
                        : 'border-ink-600 text-text-dim hover:border-brass-400/50'
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!mine?.team}
                  onClick={() =>
                    intend({kind: 'setSpymaster', target: me, spymaster: !mine?.spymaster})
                  }
                  className={`type-mono cursor-pointer rounded-md border px-2.5 py-1.5 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    mine?.spymaster
                      ? 'border-brass-400 bg-brass-400/15 text-brass-200'
                      : 'border-ink-600 text-text-dim hover:border-brass-400/50'
                  }`}
                >
                  Spymaster
                </button>
              </div>
            </div>
            {mine && <AvatarPicker value={mine.avatar} onChange={setAvatar} />}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <SettingsPanel settings={shared.settings} editable={isHost} wordCount={list.length} />
        </div>
      </div>

      <Panel className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 p-3 backdrop-blur">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="type-mono text-[11px] text-text-dim">
              {readyCount} / {shared.players.length} ready
            </span>
            {outstanding.length > 0 && outstanding.length <= 3 && (
              <span className="type-mono text-[11px] text-text-dim/70">
                waiting on {outstanding.join(', ')}
              </span>
            )}
          </div>
          <AnimatePresence>
            {blockers.length > 0 && (
              <motion.span
                initial={reduced ? {opacity: 0} : {opacity: 0, y: 4}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0}}
                transition={spring.firm}
                className="type-mono text-[11px] text-red-glow"
              >
                {blockers[0]}
              </motion.span>
            )}
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

      <BrassRule />
    </main>
  )
}
