import {AnimatePresence, motion} from 'motion/react'
import {Check, CheckSquare, Link2, Square, VenetianMask} from 'lucide-react'
import {useEffect, useState} from 'react'
import {shareLink} from '../../net/identity'
import {roomId, useNet} from '../../state/net'
import {intend, setAvatar, useRoom} from '../../state/room'
import * as words from '../../state/words'
import {validate} from '../../game/settings'
import {rosterProblems, type Player, type Team} from '../../game/types'
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
    <div className="flex w-fit items-center gap-3 rounded-md border border-lamp-500/35 bg-lamp-500/[.07] py-2 pr-2 pl-4">
      <p className="type-body text-lamp-300/85">
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

  const roster = rosterProblems(shared.players)
  const blockers = [...problems.map(p => p.message), ...roster.map(r => r.message)]

  /** Each side answers for itself, red above blue, so nobody has to wait their turn to be told. */
  const faults = [
    ...problems.map(p => ({key: p.field, message: p.message, tint: 'text-kill-lit'})),
    ...roster.map(r => ({
      key: r.team,
      message: r.message,
      tint: r.team === 'red' ? 'text-red-lit' : 'text-blue-lit'
    }))
  ]

  const hostName = shared.players.find(p => p.id === shared.hostId)?.name
  const here = shared.players.filter(p => p.connected).length
  const readyCount = shared.players.filter(p => p.ready).length
  const rttFor = (id: string) => report.peers.find(p => p.playerId === id)?.rttMs ?? null

  return (
    <main className="mx-auto w-full max-w-[1350px] px-5 py-9 sm:px-8">
      <Enter className="flex flex-col gap-7">
        <Item className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-lamp-500/80">
              {here} {here === 1 ? 'player' : 'players'} in lobby
            </Label>
            <h1 className="type-marquee text-2xl text-lamp-300 sm:text-3xl">
              {hostName ? `${hostName}'s Lobby` : 'Codenames'}
            </h1>
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
            <section className="flex flex-col gap-3">
              <Heading>Your avatar</Heading>
              <Rule />
              {mine && <AvatarPicker value={mine.avatar} onChange={setAvatar} />}
            </section>

            <section className="flex flex-col gap-4">
              <Heading>Your team</Heading>
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
              <Heading>Lobby</Heading>
              <Rule />
              <Panel level={2} glossy className="flex flex-wrap items-center gap-4 px-4 py-3">
                <div className="flex min-w-40 flex-1 flex-col gap-0.5">
                  <span className="type-read text-sm text-text">
                    {readyCount}{' '}
                    <span className="text-text-dim">/ {shared.players.length} ready</span>
                  </span>
                  <AnimatePresence initial={false}>
                    {faults.length === 0 && (
                      <motion.span
                        key="clear"
                        initial={reduced ? {opacity: 0} : {opacity: 0, y: 4}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0}}
                        className="type-label"
                      >
                        Everyone is ready
                      </motion.span>
                    )}
                    {faults.map(f => (
                      <motion.span
                        key={f.key}
                        initial={reduced ? {opacity: 0} : {opacity: 0, y: 4}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0}}
                        className={cx('type-label', f.tint)}
                      >
                        {f.message}
                      </motion.span>
                    ))}
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
                    <Button
                      size="lg"
                      onClick={() => intend({kind: 'startGame'})}
                      disabled={blockers.length > 0}
                    >
                      Start game
                    </Button>
                  )}
                </div>
              </Panel>
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
            </section>
          </div>

          <SettingsPanel settings={shared.settings} editable={isHost} wordCount={list.length} />
        </Item>
      </Enter>
    </main>
  )
}
