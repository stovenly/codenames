import {useMemo, useState} from 'react'
import {abandonSeat, offeredSeat, resumedSeat, takeSeat} from '../../net/identity'
import {joinedExisting} from '../../state/net'
import {createRoom, joinRoom, myDisplayName} from '../../state/room'
import {Button, Enter, Field, Item, Label, Panel, Rule, input} from '../atoms'
import {cx} from '../cx'
import {useMotion} from '../motion'

const BEAMS = [
  {tint: 'rgba(255,197,61,.30)', anim: 'anim-swing-a', left: '-4%'},
  {tint: 'rgba(240,68,56,.24)', anim: 'anim-swing-b', left: '32%'},
  {tint: 'rgba(46,134,255,.26)', anim: 'anim-swing-c', left: '64%'}
]

const GLOWS = [
  {tint: 'rgba(255,197,61,.55)', anim: 'anim-float-a', size: '46vmax', left: '-8%', top: '-14%'},
  {tint: 'rgba(46,134,255,.45)', anim: 'anim-float-b', size: '40vmax', left: '58%', top: '-6%'},
  {tint: 'rgba(240,68,56,.42)', anim: 'anim-float-c', size: '38vmax', left: '18%', top: '52%'},
  {tint: 'rgba(255,226,154,.35)', anim: 'anim-float-b', size: '30vmax', left: '68%', top: '48%'}
]

const Lighting = () => {
  const {reduced} = useMotion()

  const motes = useMemo(
    () =>
      Array.from({length: 16}, (_, i) => ({
        left: `${(i * 6.4 + 3) % 96}%`,
        size: 3 + ((i * 5) % 7),
        duration: 14 + ((i * 3) % 12),
        delay: -(i * 2.1)
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

      {BEAMS.map((b, i) => (
        <span
          key={i}
          className={cx('beam', !reduced && b.anim)}
          style={{left: b.left, ['--beam' as string]: b.tint}}
        />
      ))}

      {!reduced &&
        motes.map((m, i) => (
          <span
            key={i}
            className="mote anim-rise"
            style={{
              left: m.left,
              bottom: '-6vh',
              width: m.size,
              height: m.size,
              animationDuration: `${m.duration}s`,
              animationDelay: `${m.delay}s`
            }}
          />
        ))}

      {/* Footlights: the stage is lit from below as well as above. */}
      <span
        className={cx('absolute -bottom-[22vh] left-1/2 h-[42vh] w-[130vw] -translate-x-1/2 rounded-[100%] blur-[70px]', !reduced && 'anim-breathe')}
        style={{
          background: 'radial-gradient(closest-side, rgba(255,197,61,.34), transparent)',
          mixBlendMode: 'screen'
        }}
      />

      <span
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(125% 105% at 50% 45%, transparent 34%, rgba(5,6,11,.82) 100%)'
        }}
      />
    </div>
  )
}

/** Bulb rails on all four sides, chasing continuously the way a real marquee does. */
const SignFrame = ({children}: {children: React.ReactNode}) => {
  const {reduced} = useMotion()
  return (
    <div className="relative px-8 py-7 sm:px-12 sm:py-9">
      <span
        aria-hidden
        className="absolute inset-0 rounded-lg border border-gold-500/45"
        style={{
          background: 'linear-gradient(180deg, rgba(38,54,90,.55) 0%, rgba(10,13,24,.8) 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,.16), inset 0 -3px 16px rgba(0,0,0,.75), 0 26px 70px -28px rgba(0,0,0,1), 0 0 60px -20px rgba(255,197,61,.35)'
        }}
      />
      <span
        aria-hidden
        className={cx('bulbs bulbs-lit absolute inset-x-4 top-2', !reduced && 'bulbs-chase')}
      />
      <span
        aria-hidden
        className={cx('bulbs bulbs-lit absolute inset-x-4 bottom-2', !reduced && 'bulbs-chase')}
      />
      <span
        aria-hidden
        className={cx('bulbs-v bulbs-lit absolute inset-y-4 left-2', !reduced && 'bulbs-chase-v')}
      />
      <span
        aria-hidden
        className={cx('bulbs-v bulbs-lit absolute inset-y-4 right-2', !reduced && 'bulbs-chase-v')}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

const Wordmark = () => {
  const {reduced} = useMotion()
  const size = 'text-[clamp(2.4rem,10.5vw,5.5rem)]'

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
    <main className="relative grid min-h-full place-items-center overflow-hidden px-5 py-14">
      <Lighting />

      <Enter className="relative flex w-full max-w-md flex-col items-center gap-8 text-center">
        <Item variant="settle">
          <SignFrame>
            <Wordmark />
            <p className="type-label mt-3 text-lamp-500/85">Two teams · one assassin</p>
          </SignFrame>
        </Item>

        <Item>
          <p className="type-body max-w-sm text-base">
            {joinedExisting
              ? 'You have been invited. Take a seat and pick a side.'
              : 'Give the clue. Take the risk. Say the wrong word and it is over.'}
          </p>
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
