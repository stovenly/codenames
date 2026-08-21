import {AnimatePresence, motion} from 'motion/react'
import {useEffect, useState} from 'react'
import {refreshStats, roomId, self, useNet} from '../state/net'
import {setPrefs, usePrefs} from '../state/prefs'
import {Button, Heading, Label, Panel, Pill, Rule} from './atoms'
import {spring, useReducedMotion} from './motion'

const Toggle = ({
  label,
  on,
  onClick
}: {
  label: string
  on: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-ink-600 px-3 py-2 text-left transition-colors duration-[120ms] hover:border-brass-400/45"
  >
    <Label>{label}</Label>
    <span
      className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${
        on ? 'bg-brass-400' : 'bg-ink-600'
      }`}
    >
      <span
        className={`absolute top-0.5 size-3 rounded-full bg-ink-900 transition-[left] ${
          on ? 'left-4' : 'left-0.5'
        }`}
      />
    </span>
  </button>
)

const STATUS_TONE = {
  ready: 'brass',
  connecting: 'neutral',
  failed: 'red'
} as const

const advice = (report: ReturnType<typeof useNet>['report']) => {
  const anyRelay = report.transports.some(t => t.relaysOpen > 0)
  const anyPeer = report.peers.length > 0

  if (!anyRelay)
    return 'No signalling relay is reachable. A VPN, a school or corporate network, or strict DNS filtering will do this. Try disabling the VPN first.'
  if (!anyPeer)
    return 'Relays are up but no peer has been found. Check everyone is on the same link, and that the other player has the tab open.'
  if (report.peers.every(p => p.relayed))
    return 'Every connection is going through a TURN relay, which is slower and shares a public quota. Usually a symmetric NAT or a strict firewall on one end.'
  return 'Connections look healthy.'
}

export const Diagnostics = () => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const {report} = useNet()
  const prefs = usePrefs()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return
    void refreshStats()
    const t = setInterval(() => void refreshStats(), 3000)
    return () => clearInterval(t)
  }, [open])

  const relays = report.transports.reduce((n, t) => n + t.relaysOpen, 0)
  const health =
    report.transports.length === 0
      ? 'idle'
      : relays === 0
        ? 'down'
        : report.router.directPeers === 0
          ? 'alone'
          : 'ok'

  const tone = {
    idle: 'border-ink-600 text-text-dim',
    down: 'border-void-rim/70 text-red-glow',
    alone: 'border-brass-400/50 text-brass-200',
    ok: 'border-ink-600 text-text-dim'
  }[health]

  const copy = async () => {
    const text = JSON.stringify({roomId, self, ...report}, null, 2)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked; the panel still shows everything */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`type-mono fixed bottom-3 left-3 z-40 flex cursor-pointer items-center gap-2 rounded-full border bg-ink-800/90 px-3 py-1.5 text-[11px] backdrop-blur transition-colors hover:border-brass-400/50 hover:text-brass-200 ${tone}`}
      >
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${
            health === 'down' ? 'bg-void-rim' : health === 'alone' ? 'bg-brass-400' : health === 'ok' ? 'bg-brass-400/70' : 'bg-text-dim/50'
          }`}
        />
        {health === 'down'
          ? 'offline'
          : `${report.router.directPeers} peer${report.router.directPeers === 1 ? '' : 's'}`}
        <span className="opacity-50">diagnostics</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? {opacity: 0} : {opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            exit={reduced ? {opacity: 0} : {opacity: 0, y: 12}}
            transition={spring.firm}
            className="fixed bottom-14 left-3 z-40 w-[min(92vw,26rem)]"
          >
            <Panel level={2} className="max-h-[70vh] overflow-y-auto p-4 backdrop-blur">
              <div className="flex items-baseline justify-between gap-3">
                <Heading>Diagnostics</Heading>
                <Label>
                  {roomId} · {self.slice(0, 6)}
                </Label>
              </div>

              <Rule className="my-3" />

              <section className="flex flex-col gap-2">
                {report.transports.map(t => (
                  <div key={t.name} className="flex items-center justify-between gap-2">
                    <Pill tone={STATUS_TONE[t.status]}>{t.name}</Pill>
                    <span className="type-label">
                      {t.error ?? `${t.relaysOpen}/${t.relaysTotal} relays · ${t.peers} links`}
                    </span>
                  </div>
                ))}
              </section>

              <Rule className="my-3" />

              <section className="flex flex-col gap-2">
                {report.peers.length === 0 ? (
                  <p className="type-body">No peers yet.</p>
                ) : (
                  report.peers.map(p => (
                    <div key={p.playerId} className="flex items-center justify-between gap-2">
                      <span className="type-mono text-[11px] text-text">{p.playerId.slice(0, 6)}</span>
                      <span className="type-label">
                        {p.ice}
                        {p.relayed ? ' · TURN' : ''}
                        {p.rttMs === null ? '' : ` · ${Math.round(p.rttMs)}ms`} · {p.transports.join('+')}
                      </span>
                    </div>
                  ))
                )}
              </section>

              <Rule className="my-3" />

              <p className="type-label">
                direct {report.router.directPeers} · sent {report.router.sent} · recv{' '}
                {report.router.received} · fwd {report.router.forwarded} · dup {report.router.dropped}
              </p>

              <p className="type-body mt-3">{advice(report)}</p>

              <Rule className="my-3" />

              <section className="flex flex-col gap-1.5">
                <Heading>Display</Heading>
                <Toggle
                  label="Reduce motion"
                  on={reduced}
                  onClick={() => setPrefs({motion: reduced ? 'full' : 'reduced'})}
                />
                <Toggle
                  label="Colourblind contrast"
                  on={prefs.colourblind}
                  onClick={() => setPrefs({colourblind: !prefs.colourblind})}
                />
                <Toggle label="Sound" on={!prefs.muted} onClick={() => setPrefs({muted: !prefs.muted})} />
              </section>

              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={copy} className="w-full">
                  {copied ? 'Copied' : 'Copy diagnostics'}
                </Button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
