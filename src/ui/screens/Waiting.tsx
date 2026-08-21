import {AnimatePresence, motion} from 'motion/react'
import {Check, CheckSquare, Link2, Square, VenetianMask} from 'lucide-react'
import {useEffect, useState} from 'react'
import {shareLink} from '../../net/identity'
import {roomId, useNet} from '../../state/net'
import {intend, setAvatar, useRoom} from '../../state/room'
import * as words from '../../state/words'
import {validate} from '../../game/settings'
import type {Player, Team} from '../../game/types'
import {AvatarPicker} from '../avatar/Picker'
import {Bulbs, Button, Enter, Heading, Item, Label, Panel, Rule} from '../atoms'
import {cx} from '../cx'
import {SettingsPanel} from '../host/SettingsPanel'
import {useMotion} from '../motion'
import {PlayerCard} from '../room/PlayerCard'

const HOST_NOTICE_KEY = 'cn.hostNoticeSeen'

const COLUMNS: Array<{team: Team | null; label: string; tint: string; glow: string}> = [
  {team: 'red', label: 'Red', tint: 'text-red-lit', glow: 'rgba(240,68,56,.18)'},
  {team: null, label: 'Bench', tint: 'text-text-dim', glow: 'transparent'},
  {team: 'blue', label: 'Blue', tint: 'text-blue-lit', glow: 'rgba(46,134,255,.18)'}
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
    <div className="flex items-center gap-4 border-l-2 border-lamp-500/60 py-1 pl-4">
      <p className="type-body flex-1 text-lamp-300/85">
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
        Got it
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
    ...emptyTeams.map(t => `${t === 'red' ? 'Red' : 'Blue'} has nobody on it`),
    ...missingSpymaster.map(t => `${t === 'red' ? 'Red' : 'Blue'} needs a spymaster`)
  ]

  const readyCount = shared.players.filter(p => p.ready).length
  const outstanding = shared.players.filter(p => !p.ready).map(p => p.name)
  const rttFor = (id: string) => report.peers.find(p => p.playerId === id)?.rttMs ?? null

  return (
    <main className="mx-auto w-full max-w-[1350px] px-5 py-9 sm:px-8">
      <Enter className="flex flex-col gap-7">
        <Item className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-lamp-500/80">
              {isHost ? 'You are running the room' : 'Waiting room'}
            </Label>
            <h1 className="type-marquee text-2xl text-lamp-300 sm:text-3xl">Codenames</h1>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(shareLink(roomId))
              setCopied(true)
            }}
            className="flex items-center gap-2"
          >
            {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
            {copied ? 'Copied' : 'Invite link'}
          </Button>
        </Item>

        {isHost && (
          <Item>
            <HostNotice />
          </Item>
        )}

        <Item className="grid gap-7 lg:grid-cols-[1fr_23rem]">
          <div className="flex flex-col gap-7">
            <section className="grid gap-4 sm:grid-cols-3">
              {COLUMNS.map(col => (
                <div
                  key={col.label}
                  onDragOver={e => isHost && e.preventDefault()}
                  onDrop={() => {
                    if (!dragging || !isHost) return
                    intend({kind: 'setTeam', target: dragging, team: col.team})
                    setDragging(null)
                  }}
                  className="relative flex min-h-40 flex-col gap-2.5 rounded-md px-2 pt-2 pb-4"
                  style={{
                    background:
                      dragging && isHost
                        ? 'rgba(255,197,61,.05)'
                        : `radial-gradient(90% 60% at 50% 100%, ${col.glow}, transparent 70%)`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className={cx('type-marquee text-base tracking-[0.1em]', col.tint)}>
                      {col.label}
                    </span>
                    <Label>{on(col.team).length}</Label>
                  </div>
                  <Bulbs lit={col.team !== null && on(col.team).length > 0} className="-mt-1 mb-1" />

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
                <span aria-hidden className="mx-1 h-8 w-px self-center bg-stage-600" />

                <Button
                  size="sm"
                  variant={mine?.spymaster ? 'primary' : 'ghost'}
                  disabled={!mine?.team}
                  onClick={() =>
                    intend({kind: 'setSpymaster', target: me, spymaster: !mine?.spymaster})
                  }
                  className="flex items-center gap-1.5"
                >
                  <VenetianMask className="size-3.5" />
                  Spymaster
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <Heading>Your avatar</Heading>
              <Rule />
              {mine && <AvatarPicker value={mine.avatar} onChange={setAvatar} />}
            </section>
          </div>

          <SettingsPanel settings={shared.settings} editable={isHost} wordCount={list.length} />
        </Item>
      </Enter>

      <div className="sticky bottom-4 z-30 mt-9">
        <Panel level={2} glossy className="flex flex-wrap items-center gap-4 px-4 py-3 backdrop-blur">
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
                className={cx('type-label', blockers.length && 'text-kill-lit')}
              >
                {blockers[0] ??
                  (outstanding.length && outstanding.length <= 3
                    ? `Waiting on ${outstanding.join(', ')}`
                    : 'Everyone is ready')}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            {/* One label, a box that fills. Two labels made it read as two
                different actions rather than one thing being on or off. */}
            <Button
              variant={mine?.ready ? 'primary' : 'ghost'}
              role="checkbox"
              aria-checked={!!mine?.ready}
              onClick={() => intend({kind: 'ready', ready: !mine?.ready})}
              className="flex items-center gap-2"
            >
              {mine?.ready ? (
                <CheckSquare className="size-4" />
              ) : (
                <Square className="size-4 opacity-70" />
              )}
              Ready
            </Button>
            {isHost && (
              <Button size="lg" onClick={() => intend({kind: 'startGame'})} disabled={blockers.length > 0}>
                Start
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </main>
  )
}
