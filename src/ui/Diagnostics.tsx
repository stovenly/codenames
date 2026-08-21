import {AnimatePresence, motion} from 'motion/react'
import {useEffect, useState} from 'react'
import {refreshStats, roomId, self, useNet} from '../state/net'
import {Button, BrassRule, Panel, Pill} from './atoms'
import {spring, useReducedMotion} from './motion'

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
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return
    void refreshStats()
    const t = setInterval(() => void refreshStats(), 3000)
    return () => clearInterval(t)
  }, [open])

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
        className="type-mono fixed bottom-3 left-3 z-40 cursor-pointer rounded-full border border-ink-600 bg-ink-800/90 px-3 py-1.5 text-[11px] text-text-dim backdrop-blur transition-colors hover:border-brass-400/50 hover:text-brass-200"
      >
        {report.router.directPeers} peer{report.router.directPeers === 1 ? '' : 's'} · diagnostics
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
            <Panel className="max-h-[70vh] overflow-y-auto p-4 backdrop-blur">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="type-display text-sm text-brass-200">Diagnostics</h2>
                <span className="type-mono text-[11px] text-text-dim">
                  {roomId} · {self.slice(0, 6)}
                </span>
              </div>

              <BrassRule className="my-3" />

              <section className="flex flex-col gap-2">
                {report.transports.map(t => (
                  <div key={t.name} className="flex items-center justify-between gap-2">
                    <Pill tone={STATUS_TONE[t.status]}>{t.name}</Pill>
                    <span className="type-mono text-[11px] text-text-dim">
                      {t.error ?? `${t.relaysOpen}/${t.relaysTotal} relays · ${t.peers} links`}
                    </span>
                  </div>
                ))}
              </section>

              <BrassRule className="my-3" />

              <section className="flex flex-col gap-2">
                {report.peers.length === 0 ? (
                  <p className="text-xs text-text-dim">No peers yet.</p>
                ) : (
                  report.peers.map(p => (
                    <div key={p.playerId} className="flex items-center justify-between gap-2">
                      <span className="type-mono text-[11px] text-text">{p.playerId.slice(0, 6)}</span>
                      <span className="type-mono text-[11px] text-text-dim">
                        {p.ice}
                        {p.relayed ? ' · TURN' : ''}
                        {p.rttMs === null ? '' : ` · ${Math.round(p.rttMs)}ms`} · {p.transports.join('+')}
                      </span>
                    </div>
                  ))
                )}
              </section>

              <BrassRule className="my-3" />

              <p className="type-mono text-[11px] text-text-dim">
                direct {report.router.directPeers} · sent {report.router.sent} · recv{' '}
                {report.router.received} · fwd {report.router.forwarded} · dup {report.router.dropped}
              </p>

              <p className="mt-3 text-xs leading-relaxed text-text-dim">{advice(report)}</p>

              <div className="mt-4">
                <Button variant="ghost" onClick={copy} className="w-full">
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
