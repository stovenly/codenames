import {motion} from 'motion/react'
import {Button, BrassRule, Glyph, Panel, Pill} from '../atoms'
import {spring, useReducedMotion} from '../motion'

const SWATCHES = [
  ['ink-900', 'bg-ink-900'],
  ['ink-800', 'bg-ink-800'],
  ['ink-700', 'bg-ink-700'],
  ['ink-600', 'bg-ink-600'],
  ['brass-400', 'bg-brass-400'],
  ['brass-200', 'bg-brass-200'],
  ['red-500', 'bg-red-500'],
  ['blue-500', 'bg-blue-500'],
  ['bone', 'bg-bone'],
  ['void', 'bg-void']
] as const

export const Placeholder = () => {
  const reduced = useReducedMotion()
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <motion.header
        initial={reduced ? {opacity: 0} : {opacity: 0, y: 16}}
        animate={{opacity: 1, y: 0}}
        transition={spring.soft}
        className="flex flex-col gap-3"
      >
        <Pill tone="brass">Briefing room</Pill>
        <h1 className="type-display text-5xl leading-none text-brass-200 sm:text-6xl">Codenames</h1>
        <p className="max-w-md text-sm text-text-dim">
          Peer-to-peer, no server, no accounts. Foundations are in place — transport lands next.
        </p>
      </motion.header>

      <BrassRule />

      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="flex items-center gap-2">
              <span className={`size-6 rounded border border-ink-600 ${cls}`} />
              <span className="type-mono text-[11px] text-text-dim">{name}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className="pattern-red flex items-center gap-3 border-red-500/40 p-5">
          <span className="text-red-glow">
            <Glyph team="red" />
          </span>
          <span className="type-display text-lg text-red-glow">Red team</span>
        </Panel>
        <Panel className="pattern-blue flex items-center gap-3 border-blue-500/40 p-5">
          <span className="text-blue-glow">
            <Glyph team="blue" />
          </span>
          <span className="type-display text-lg text-blue-glow">Blue team</span>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button>Create a game</Button>
        <Button variant="ghost">Diagnostics</Button>
        <span className="type-mono text-xs text-text-dim">01 — foundations</span>
      </div>
    </main>
  )
}
