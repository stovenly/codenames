import {Suspense, lazy, useMemo, useState} from 'react'
import {abandonSeat, offeredSeat, resumedSeat, takeSeat} from '../../net/identity'
import {joinedExisting} from '../../state/net'
import {createRoom, joinRoom, myDisplayName} from '../../state/room'
import {Button, Enter, Field, Item, Label, Panel, Rule, input} from '../atoms'
import {cx} from '../cx'
import {useMotion} from '../motion'

/**
 * Traced silhouettes are decoration and stay out of the entry chunk, but the
 * request starts here at module scope rather than when React first renders the
 * component — that is several hundred milliseconds earlier on a cold load.
 */
const silhouettes = import('./Silhouettes')
const Crowd = lazy(() => silhouettes.then(m => ({default: m.Crowd})))

/**
 * The rig. Each light is a lamp head and a conic wedge sharing an apex, on an
 * element 300vmax across — the wedge fades out long before its own box, so the
 * box can never appear no matter how far it swings.
 */
const RIG = [
  {tint: 'rgba(255,197,61,.30)', anim: 'anim-swing-a', x: 18},
  {tint: 'rgba(240,68,56,.24)', anim: 'anim-swing-b', x: 50},
  {tint: 'rgba(46,134,255,.26)', anim: 'anim-swing-c', x: 82}
]

/** Dim house lamps along the top, so the beams come from somewhere. */
const TRUSS = Array.from({length: 15}, (_, i) => ({
  x: 4 + i * 6.6,
  delay: -(i * 0.42)
}))

const Spot = ({tint, anim, x}: (typeof RIG)[number]) => {
  const {reduced} = useMotion()
  return (
    <>
      <span
        className={cx('spotlight', !reduced && anim)}
        style={{left: `${x}%`, top: '-6vh', ['--tint' as string]: tint}}
      />
      <span
        className="bulbhead"
        style={{
          left: `${x}%`,
          top: '-6vh',
          ['--tint' as string]: tint.replace(/[\d.]+\)$/, '.85)')
        }}
      />
    </>
  )
}

const Lighting = () => {
  const {reduced} = useMotion()

  const sparkles = useMemo(
    () =>
      Array.from({length: 24}, (_, i) => ({
        left: `${(i * 13.7 + 5) % 97}%`,
        top: `${(i * 21.3 + 7) % 88}%`,
        size: 14 + ((i * 7) % 26),
        duration: 5 + ((i * 3) % 7),
        delay: -(i * 1.37)
      })),
    []
  )

  return (
    <div aria-hidden className="lightbox">
      <span
        className={cx('ambience', !reduced && 'anim-ambience')}
        style={{
          backgroundImage: [
            'radial-gradient(closest-side, rgba(255,197,61,.30), transparent)',
            'radial-gradient(closest-side, rgba(46,134,255,.26), transparent)',
            'radial-gradient(closest-side, rgba(240,68,56,.22), transparent)'
          ].join(','),
          backgroundSize: '78% 78%, 66% 66%, 60% 60%',
          backgroundPosition: '12% 22%, 86% 12%, 42% 86%'
        }}
      />

      {/* Footlights first: the crowd needs something lit to stand against. */}
      <span
        className={cx('absolute -bottom-[60vmax] left-1/2 size-[120vmax] -translate-x-1/2', !reduced && 'anim-breathe')}
        style={{
          background: 'radial-gradient(closest-side, rgba(255,197,61,.26), transparent 70%)',
          mixBlendMode: 'screen'
        }}
      />

      {/* Behind the beams: a screen-blended spotlight passing over them reads as
          light through fog, which is the whole effect. */}
      <Suspense fallback={null}>
        <Crowd />
      </Suspense>

      {RIG.map((r, i) => (
        <Spot key={i} {...r} />
      ))}

      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gold-500/25" />
      {TRUSS.map((t, i) => (
        <span
          key={i}
          className={cx('absolute top-0 size-1.5 -translate-x-1/2 rounded-full bg-lamp-300', !reduced && 'anim-truss')}
          style={{
            left: `${t.x}%`,
            animationDelay: `${t.delay}s`,
            boxShadow: '0 0 10px 3px rgba(255,197,61,.55)',
            opacity: reduced ? 0.7 : undefined
          }}
        />
      ))}

      {!reduced &&
        sparkles.map((s, i) => (
          <span
            key={i}
            className="sparkle anim-twinkle"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`
            }}
          />
        ))}

      <span
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(125% 105% at 50% 45%, transparent 32%, rgba(5,6,11,.86) 100%)'
        }}
      />
    </div>
  )
}

/** Lamps walked round the perimeter in order, so the chase actually travels. */
const perimeter = (across: number, down: number) => {
  const points: Array<{x: number; y: number}> = []
  for (let i = 0; i < across; i++) points.push({x: (i / across) * 100, y: 0})
  for (let i = 0; i < down; i++) points.push({x: 100, y: (i / down) * 100})
  for (let i = across; i > 0; i--) points.push({x: (i / across) * 100, y: 100})
  for (let i = down; i > 0; i--) points.push({x: 0, y: (i / down) * 100})
  return points
}

const BulbFrame = () => {
  const {reduced} = useMotion()
  const lamps = useMemo(() => perimeter(13, 6), [])
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {lamps.map((p, i) => (
        <span
          key={i}
          className={cx('lamp', !reduced && 'lamp-run')}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            ['--i' as string]: i,
            ['--n' as string]: lamps.length,
            opacity: reduced ? 0.85 : undefined
          }}
        />
      ))}
    </span>
  )
}

const SignFrame = ({children}: {children: React.ReactNode}) => (
  <div className="relative px-10 py-9 select-none sm:px-14 sm:py-11">
    <span
      aria-hidden
      className="absolute inset-4 rounded-md border border-gold-500/45"
      style={{
        background: 'linear-gradient(180deg, rgba(38,54,90,.55) 0%, rgba(10,13,24,.82) 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,.16), inset 0 -3px 16px rgba(0,0,0,.75), 0 26px 70px -28px rgba(0,0,0,1), 0 0 70px -18px rgba(255,197,61,.4)'
      }}
    />
    <BulbFrame />
    <div className="relative">{children}</div>
  </div>
)

const Wordmark = () => {
  const {reduced} = useMotion()
  const size = 'text-[clamp(2.2rem,9.5vw,5rem)]'
  const layer = cx('halo type-marquee', size)

  return (
    <span className={cx('relative block select-none', !reduced && 'anim-lift')}>
      {/* Outer bloom: wide and slow. */}
      <span
        aria-hidden
        className={cx(layer, !reduced && 'anim-glow-drift')}
        style={{color: '#FF9A14', filter: 'blur(28px)', opacity: reduced ? 0.55 : undefined}}
      >
        Codenames
      </span>

      {/* Inner bloom: tighter and brighter, on a period that does not divide the outer one. */}
      <span
        aria-hidden
        className={cx(layer, !reduced && 'anim-glow-swell')}
        style={{color: '#FFD166', filter: 'blur(13px)', opacity: reduced ? 0.8 : undefined}}
      >
        Codenames
      </span>

      <h1 className={cx('type-marquee neon relative text-lamp-300', size)}>Codenames</h1>

      {!reduced && (
        <span
          aria-hidden
          className={cx('type-marquee anim-sheen absolute inset-0', size)}
          style={{
            backgroundImage:
              'linear-gradient(100deg, transparent 38%, rgba(255,255,255,.9) 50%, transparent 62%)',
            backgroundSize: '220% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}
        >
          Codenames
        </span>
      )}
    </span>
  )
}

export const Landing = ({needsPassword: rejected}: {needsPassword: boolean}) => {
  const seat = offeredSeat()
  const [name, setName] = useState(myDisplayName())
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const pass = password.trim() || null
    if (joinedExisting) await joinRoom(trimmed, pass)
    else await createRoom(trimmed, pass)
    setBusy(false)
  }

  return (
    <main className="relative grid min-h-full place-items-center overflow-hidden px-5 py-12">
      <Lighting />

      <Enter className="relative flex w-full max-w-md flex-col items-center gap-7 text-center">
        <Item variant="settle">
          <SignFrame>
            <Wordmark />
          </SignFrame>
        </Item>

        <Item className="w-full">
          {/* Opaque, and nothing animates behind it — the lighting stays a backdrop. */}
          <Panel level={2} glossy className="flex flex-col gap-5 p-6 text-left">
            <Field label="Your name">
              <input
                autoFocus
                value={name}
                maxLength={24}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void go()}
                placeholder={joinedExisting ? 'Guest' : 'Host'}
                className={input}
              />
            </Field>

            {(rejected || !joinedExisting) && (
              <Field
                label={joinedExisting ? 'Lobby password' : 'Lobby password (optional)'}
                hint={
                  rejected ? (
                    <Label className="text-kill-lit">Not accepted. Try again.</Label>
                  ) : undefined
                }
              >
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void go()}
                  className={input}
                />
              </Field>
            )}

            <Button size="lg" onClick={() => void go()} disabled={!name.trim() || busy}>
              {joinedExisting ? 'Take a seat' : 'Start a game'}
            </Button>

            {seat && (
              <>
                <Rule />
                <div className="flex flex-col gap-2">
                  <Label>Been here before?</Label>
                  <Button variant="ghost" onClick={() => takeSeat(seat)}>
                    Rejoin as {seat.name}
                  </Button>
                </div>
              </>
            )}

            {resumedSeat && !seat && (
              <>
                <Rule />
                <div className="flex items-center justify-between gap-3">
                  <Label>Picking up where you left off</Label>
                  <Button variant="quiet" size="sm" onClick={abandonSeat}>
                    Not you?
                  </Button>
                </div>
              </>
            )}
          </Panel>
        </Item>
      </Enter>
    </main>
  )
}
