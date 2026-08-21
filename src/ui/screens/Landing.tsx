import {useMemo, useState} from 'react'
import {abandonSeat, offeredSeat, resumedSeat, takeSeat} from '../../net/identity'
import {joinedExisting} from '../../state/net'
import {createRoom, joinRoom, myDisplayName} from '../../state/room'
import {Button, Enter, Field, Item, Label, Panel, Rule, input} from '../atoms'
import {cx} from '../cx'
import {useMotion} from '../motion'

/** Three beams on coprime-ish periods, so they never fall back into step. */
const BEAMS = [
  {tint: 'rgba(255,197,61,.20)', anim: 'sweep-a 13s ease-in-out infinite', left: '4%'},
  {tint: 'rgba(240,68,56,.16)', anim: 'sweep-b 17s ease-in-out infinite', left: '30%'},
  {tint: 'rgba(46,134,255,.16)', anim: 'sweep-c 21s ease-in-out infinite', left: '58%'}
]

const Backdrop = () => {
  const {reduced} = useMotion()

  const motes = useMemo(
    () =>
      Array.from({length: 14}, (_, i) => ({
        left: `${(i * 7.3 + 4) % 96}%`,
        size: 3 + ((i * 5) % 6),
        duration: 16 + ((i * 3) % 11),
        delay: -(i * 2.4)
      })),
    []
  )

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="rays absolute top-1/2 left-1/2 size-[150vmax] -translate-x-1/2 -translate-y-1/2" />

      {BEAMS.map((b, i) => (
        <span
          key={i}
          className="beam"
          style={{
            left: b.left,
            background: `linear-gradient(to bottom, ${b.tint} 0%, transparent 68%)`,
            animation: reduced ? undefined : b.anim
          }}
        />
      ))}

      {!reduced &&
        motes.map((m, i) => (
          <span
            key={i}
            className="mote"
            style={{
              left: m.left,
              bottom: '-4vh',
              width: m.size,
              height: m.size,
              animationDuration: `${m.duration}s`,
              animationDelay: `${m.delay}s`
            }}
          />
        ))}

      <span
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(58% 46% at 50% 42%, rgba(255,197,61,.10), transparent 70%)',
          animation: reduced ? undefined : 'breathe 7s ease-in-out infinite'
        }}
      />

      <span
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 45%, transparent 40%, rgba(5,6,11,.75) 100%)'
        }}
      />
    </div>
  )
}

/** Bulb rails on all four sides, chasing in a loop the way a real marquee does. */
const SignFrame = ({children}: {children: React.ReactNode}) => (
  <div className="relative px-7 py-6 sm:px-10 sm:py-8">
    <span
      aria-hidden
      className="absolute inset-0 rounded-lg border border-gold-500/45"
      style={{
        background:
          'linear-gradient(180deg, rgba(38,54,90,.5) 0%, rgba(10,13,24,.75) 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,.14), inset 0 -3px 14px rgba(0,0,0,.7), 0 24px 60px -26px rgba(0,0,0,1)'
      }}
    />
    <span aria-hidden className="bulbs bulbs-lit bulbs-chase absolute inset-x-3 top-1.5" />
    <span aria-hidden className="bulbs bulbs-lit bulbs-chase absolute inset-x-3 bottom-1.5" />
    <span aria-hidden className="bulbs-v bulbs-lit bulbs-chase-v absolute inset-y-3 left-1.5" />
    <span aria-hidden className="bulbs-v bulbs-lit bulbs-chase-v absolute inset-y-3 right-1.5" />
    <div className="relative">{children}</div>
  </div>
)

const Wordmark = () => {
  const {reduced} = useMotion()
  const size = 'text-[clamp(2.4rem,10.5vw,5.5rem)]'

  return (
    <span className="relative block">
      <span
        aria-hidden
        className={cx('type-marquee neon absolute inset-0 text-lamp-300', size)}
        style={{animation: reduced ? undefined : 'flicker 7s steps(1, end) infinite'}}
      >
        Codenames
      </span>

      <h1 className={cx('type-marquee relative text-lamp-300', size)}>Codenames</h1>

      {!reduced && (
        <span
          aria-hidden
          className={cx('type-marquee absolute inset-0', size)}
          style={{
            backgroundImage:
              'linear-gradient(100deg, transparent 38%, rgba(255,255,255,.85) 50%, transparent 62%)',
            backgroundSize: '220% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            animation: 'sheen 6.5s ease-in-out infinite'
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
      <Backdrop />

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
          {/* No animation behind the form — the backdrop stays a backdrop. */}
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
