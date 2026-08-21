import {useMemo, useState} from 'react'
import {abandonSeat, offeredSeat, resumedSeat, takeSeat} from '../../net/identity'
import {joinedExisting} from '../../state/net'
import {createRoom, joinRoom, myDisplayName} from '../../state/room'
import {Button, Enter, Field, Item, Label, Panel, Rule, input} from '../atoms'
import {cx} from '../cx'
import {useMotion} from '../motion'

/**
 * A rig of three lights. Each is a source point, a beam, and the pool it throws
 * on the floor, all inside one element that swings about the source — so the
 * pool travels with its beam, which is the thing that reads as a real light
 * rather than a gradient someone animated.
 */
const RIG = [
  {tint: '255,197,61', anim: 'anim-swing-a', left: '18%', spread: '34vw'},
  {tint: '240,68,56', anim: 'anim-swing-b', left: '50%', spread: '30vw'},
  {tint: '46,134,255', anim: 'anim-swing-c', left: '82%', spread: '32vw'}
]

const GLOWS = [
  {tint: 'rgba(255,197,61,.50)', anim: 'anim-float-a', size: '44vmax', left: '-10%', top: '-16%'},
  {tint: 'rgba(46,134,255,.42)', anim: 'anim-float-b', size: '38vmax', left: '60%', top: '-8%'},
  {tint: 'rgba(240,68,56,.38)', anim: 'anim-float-c', size: '36vmax', left: '16%', top: '54%'}
]

const Spot = ({tint, anim, left, spread}: (typeof RIG)[number]) => {
  const {reduced} = useMotion()
  return (
    <span
      className={cx('absolute top-0 h-[150vh] w-px', !reduced && anim)}
      style={{left, transformOrigin: '50% 0'}}
    >
      <span
        className="source"
        style={{
          width: 90,
          height: 90,
          top: '-2vh',
          left: '50%',
          background: `radial-gradient(circle, rgba(255,255,255,.9) 0%, rgba(${tint},.8) 35%, transparent 70%)`
        }}
      />
      <span
        className="beam"
        style={{
          left: '50%',
          translate: '-50% 0',
          top: '-4vh',
          width: spread,
          ['--beam' as string]: `rgba(${tint},.34)`
        }}
      />
      <span
        className="pool"
        style={{
          bottom: '-6vh',
          left: '50%',
          translate: '-50% 0',
          width: `calc(${spread} * 1.5)`,
          height: '26vh',
          background: `radial-gradient(closest-side, rgba(${tint},.42), transparent)`
        }}
      />
    </span>
  )
}

const Lighting = () => {
  const {reduced} = useMotion()

  const sparkles = useMemo(
    () =>
      Array.from({length: 22}, (_, i) => ({
        left: `${(i * 13.7 + 5) % 97}%`,
        top: `${(i * 21.3 + 7) % 88}%`,
        size: 16 + ((i * 7) % 26),
        duration: 5 + ((i * 3) % 7),
        delay: -(i * 1.37)
      })),
    []
  )

  return (
    <div aria-hidden className="lightbox">
      {GLOWS.map((g, i) => (
        <span
          key={i}
          className={cx('glow', !reduced && g.anim)}
          style={{
            left: g.left,
            top: g.top,
            width: g.size,
            height: g.size,
            background: `radial-gradient(circle, ${g.tint} 0%, transparent 68%)`,
            opacity: reduced ? 0.5 : undefined
          }}
        />
      ))}

      {RIG.map((r, i) => (
        <Spot key={i} {...r} />
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
        className={cx(
          'absolute -bottom-[24vh] left-1/2 h-[44vh] w-[130vw] -translate-x-1/2 rounded-[100%] blur-[70px]',
          !reduced && 'anim-breathe'
        )}
        style={{
          background: 'radial-gradient(closest-side, rgba(255,197,61,.30), transparent)',
          mixBlendMode: 'screen'
        }}
      />

      <span
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(125% 105% at 50% 45%, transparent 34%, rgba(5,6,11,.84) 100%)'
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
  <div className="relative px-10 py-9 sm:px-14 sm:py-11">
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

  return (
    <span className="relative block">
      <span
        aria-hidden
        className={cx('type-marquee neon absolute inset-0 text-lamp-300', size, !reduced && 'anim-flicker')}
      >
        Codenames
      </span>

      <h1 className={cx('type-marquee relative text-lamp-300', size)}>Codenames</h1>

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
                placeholder="Agent"
                className={input}
              />
            </Field>

            {(rejected || !joinedExisting) && (
              <Field
                label={joinedExisting ? 'Password' : 'Password — optional'}
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
