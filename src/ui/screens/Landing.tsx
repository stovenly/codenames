import {motion} from 'motion/react'
import {useState} from 'react'
import {joinedExisting} from '../../state/net'
import {createRoom, joinRoom, myDisplayName} from '../../state/room'
import {Bulbs, Button, Enter, Field, Item, Label, Panel, input} from '../atoms'
import {useMotion} from '../motion'

/** Bulbs around the wordmark ignite one at a time, so the page opens like a show does. */
const Marquee = () => {
  const {reduced} = useMotion()
  const lamps = 16
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-x-5 -inset-y-4">
      {Array.from({length: lamps}, (_, i) => {
        const t = i / lamps
        const onTop = t < 0.5
        const x = (onTop ? t : 1 - t) * 2 * 100
        return (
          <motion.span
            key={i}
            initial={reduced ? {opacity: 1} : {opacity: 0.12, scale: 0.7}}
            animate={{opacity: 1, scale: 1}}
            transition={{delay: reduced ? 0 : 0.15 + i * 0.045, duration: 0.28}}
            className="absolute size-1.5 rounded-full bg-lamp-500"
            style={{
              left: `${x}%`,
              [onTop ? 'top' : 'bottom']: 0,
              boxShadow: '0 0 8px rgba(255,197,61,.85)'
            }}
          />
        )
      })}
    </span>
  )
}

export const Landing = ({needsPassword: rejected}: {needsPassword: boolean}) => {
  const [name, setName] = useState(myDisplayName())
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const {reduced} = useMotion()

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
    <main className="relative grid min-h-full place-items-center overflow-hidden px-6 py-14">
      {!reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -top-1/3 left-1/2 h-[160vh] w-[45vw] -translate-x-1/2 opacity-45"
          style={{
            background: 'conic-gradient(from 175deg at 50% 0%, transparent, rgba(255,197,61,.14), transparent)'
          }}
          initial={{rotate: -14, opacity: 0}}
          animate={{rotate: 12, opacity: [0, 0.5, 0.22]}}
          transition={{duration: 2.4, ease: 'easeOut'}}
        />
      )}

      <Enter className="flex w-full max-w-md flex-col items-center gap-9 text-center">
        <Item variant="settle" className="relative">
          <Marquee />
          <h1
            className="type-marquee text-[clamp(2.6rem,11vw,4.6rem)] text-lamp-300"
            style={{textShadow: '0 0 26px rgba(255,197,61,.45), 0 3px 0 rgba(0,0,0,.6)'}}
          >
            Codenames
          </h1>
        </Item>

        <Item>
          <p className="type-body max-w-xs">
            {joinedExisting
              ? 'You have been invited. Take a seat and pick a side.'
              : 'Two teams. One assassin. Say the wrong word and it is over.'}
          </p>
        </Item>

        <Item className="w-full">
          <Panel level={2} glossy className="flex flex-col gap-5 p-6 text-left">
            <Bulbs className="-mt-1" />

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
          </Panel>
        </Item>
      </Enter>
    </main>
  )
}
