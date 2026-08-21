import {AnimatePresence, motion} from 'motion/react'
import {Activity, Check, Copy, X} from 'lucide-react'
import {useEffect, useState} from 'react'
import {refreshStats, roomId, self, useNet} from '../state/net'
import {setPrefs, usePrefs} from '../state/prefs'
import {Button, Heading, IconButton, Label, Panel, Rule} from './atoms'
import {EffectsToggle, MuteToggle} from './Controls'
import {cx} from './cx'
import {spring, useMotion} from './motion'

const advice = (report: ReturnType<typeof useNet>['report']) => {
  if (!report.transports.some(t => t.relaysOpen > 0))
    return 'Nothing is reachable. A VPN, a school or office network, or strict DNS filtering will do this — try turning the VPN off first.'
  if (report.peers.length === 0) return 'Check everyone opened the same link.'
  if (report.peers.every(p => p.relayed))
    return 'Everyone is coming through a relay, which is slower. Usually a strict firewall on one end.'
  return 'Everything looks healthy.'
}

const Toggle = ({label, on, onClick}: {label: string; on: boolean; onClick: () => void}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-stage-600 px-3 py-2 text-left transition-colors duration-[120ms] hover:border-gold-500/50"
  >
    <Label>{label}</Label>
    <span
      className={cx(
        'relative h-4 w-8 shrink-0 rounded-full transition-colors',
        on ? 'bg-lamp-500' : 'bg-stage-600'
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 size-3 rounded-full bg-stage-000 transition-[left]',
          on ? 'left-4' : 'left-0.5'
        )}
      />
    </span>
  </button>
)

export const Diagnostics = () => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const {report} = useNet()
  const prefs = usePrefs()
  const {reduced} = useMotion()

  useEffect(() => {
    if (!open) return
    void refreshStats()
    const t = setInterval(() => void refreshStats(), 3000)
    return () => clearInterval(t)
  }, [open])

  const relays = report.transports.reduce((n, t) => n + t.relaysOpen, 0)
  const down = report.transports.length > 0 && relays === 0

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({roomId, self, ...report}, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked; the panel still shows everything */
    }
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
        <MuteToggle />
        <EffectsToggle />
        <IconButton
          label={down ? 'Offline' : `${report.router.directPeers} connected`}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className={cx('backdrop-blur', down && 'border-kill-lit/70 text-kill-lit')}
        >
          <Activity className="size-4" />
        </IconButton>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? {opacity: 0} : {opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            exit={reduced ? {opacity: 0} : {opacity: 0, y: 12}}
            transition={spring.firm}
            className="fixed bottom-16 left-4 z-40 w-[min(92vw,25rem)]"
          >
            <Panel level={2} className="max-h-[70vh] overflow-y-auto p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <Heading>Connection</Heading>
                <IconButton label="Close" onClick={() => setOpen(false)} className="size-8">
                  <X className="size-3.5" />
                </IconButton>
              </div>

              <Rule className="my-3" />

              <section className="flex flex-col gap-2">
                {report.transports.map(t => (
                  <div key={t.name} className="flex items-center justify-between gap-2">
                    <span
                      className={cx(
                        'type-label',
                        t.status === 'ready'
                          ? 'text-lamp-300'
                          : t.status === 'failed'
                            ? 'text-kill-lit'
                            : ''
                      )}
                    >
                      {t.name}
                    </span>
                    <Label>{t.error ?? `${t.relaysOpen}/${t.relaysTotal} · ${t.peers} links`}</Label>
                  </div>
                ))}
              </section>

              <Rule className="my-3" />

              <section className="flex flex-col gap-2">
                {report.peers.length === 0 ? (
                  <p className="type-body">Nobody else connected.</p>
                ) : (
                  report.peers.map(p => (
                    <div key={p.playerId} className="flex items-center justify-between gap-2">
                      <span className="type-read text-sm text-text">{p.playerId.slice(0, 6)}</span>
                      <Label>
                        {p.ice}
                        {p.relayed ? ' · relayed' : ''}
                        {p.rttMs === null ? '' : ` · ${Math.round(p.rttMs)}ms`}
                      </Label>
                    </div>
                  ))
                )}
              </section>

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
              </section>

              <Button
                variant="ghost"
                size="sm"
                onClick={copy}
                className="mt-4 flex w-full items-center justify-center gap-2"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Copy details'}
              </Button>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
