import * as Slider from '@radix-ui/react-slider'
import {Check, Copy, X} from 'lucide-react'
import {useEffect, useState} from 'react'
import {refreshStats, roomId, self, useNet} from '../state/net'
import {getPrefs, setPrefs, usePrefs} from '../state/prefs'
import {Button, Heading, IconButton, Label, Panel, Rule} from './atoms'
import {cx} from './cx'
import {fontLoading} from './font'
import {sfx} from './sound/audio'

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

const Volume = () => {
  const {volume} = usePrefs()
  return (
    <Slider.Root
      min={0}
      max={100}
      step={5}
      value={[Math.round(volume * 100)]}
      aria-label="Volume"
      onValueChange={([v]) => {
        const next = (v ?? 0) / 100
        setPrefs(next > 0 ? {volume: next, preMute: next} : {preMute: getPrefs().volume || 1, volume: 0})
      }}
      onValueCommit={() => sfx.arm()}
      className="relative flex h-5 w-full touch-none items-center select-none"
    >
      <Slider.Track className="relative h-1 w-full grow rounded-full bg-stage-600">
        <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-gold-500 to-lamp-500" />
      </Slider.Track>
      <Slider.Thumb className="block size-4 cursor-grab rounded-full border border-lamp-300/60 bg-gradient-to-b from-lamp-300 to-lamp-500 shadow-[0_2px_8px_-2px_rgba(255,197,61,.8)] active:cursor-grabbing" />
    </Slider.Root>
  )
}

export const SettingsSheet = ({onClose}: {onClose: () => void}) => {
  const [copied, setCopied] = useState(false)
  const {report} = useNet()
  const prefs = usePrefs()

  useEffect(() => {
    void refreshStats()
    const t = setInterval(() => void refreshStats(), 3000)
    return () => clearInterval(t)
  }, [])

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
    <Panel level={2} className="max-h-[70vh] overflow-y-auto p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <Heading>Settings</Heading>
        <IconButton label="Close" onClick={onClose} className="size-8">
          <X className="size-3.5" />
        </IconButton>
      </div>

      <Rule className="my-3" />

      <section className="flex flex-col gap-2">
        <Label>Audio</Label>
        <Volume />
      </section>

      <Rule className="my-3" />

      <section className="flex flex-col gap-1.5">
        <Label>Accessibility</Label>
        <Toggle
          label="Colourblind mode"
          on={prefs.colourblind}
          onClick={() => setPrefs({colourblind: !prefs.colourblind})}
        />
        <Toggle
          label={fontLoading() ? 'Dyslexia-friendly font — fetching…' : 'Dyslexia-friendly font'}
          on={prefs.dyslexic}
          onClick={() => setPrefs({dyslexic: !prefs.dyslexic})}
        />
      </section>

      <Rule className="my-3" />

      <Label>Connection</Label>

      <section className="mt-2 flex flex-col gap-2">
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
  )
}
