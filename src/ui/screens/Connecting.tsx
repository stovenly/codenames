import {AnimatePresence, motion} from 'motion/react'
import {Check} from 'lucide-react'
import {useEffect, useState} from 'react'
import {useNet} from '../../state/net'
import {Bulbs, Label, Panel} from '../atoms'
import {cx} from '../cx'
import {spring, useMotion} from '../motion'

/**
 * What a player wants to know while waiting is roughly "is this stuck?", which
 * a spinner cannot answer. These stages are the honest shape of what is
 * happening without naming a single relay or transport at them.
 */
const STAGES = ['Powering up the rig', 'Finding the signal', 'Reaching the room', 'Taking your seat']

const SLOW_MS = 12_000

export const Connecting = ({title = 'Connecting'}: {title?: string}) => {
  const {report} = useNet()
  const {reduced} = useMotion()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_MS)
    return () => clearTimeout(t)
  }, [])

  const relays = report.transports.reduce((n, t) => n + t.relaysOpen, 0)
  const stage =
    report.transports.length === 0 ? 0 : relays === 0 ? 1 : report.router.directPeers === 0 ? 2 : 3

  return (
    <main className="grid min-h-full place-items-center px-6 py-16">
      <Panel level={2} glossy className="w-full max-w-sm px-7 py-7">
        <Bulbs lit chase={!reduced} className="-mt-1 mb-5" />

        <h1 className="type-marquee mb-5 text-center text-xl text-lamp-300">{title}</h1>

        <ol className="flex flex-col gap-2.5">
          {STAGES.map((label, i) => {
            const done = i < stage
            const live = i === stage
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={cx(
                    'grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
                    done
                      ? 'border-lamp-500 bg-lamp-500/20 text-lamp-300'
                      : live
                        ? 'border-lamp-500/70'
                        : 'border-stage-600'
                  )}
                >
                  {done ? (
                    <Check className="size-3" />
                  ) : live ? (
                    <motion.span
                      className="size-1.5 rounded-full bg-lamp-300"
                      animate={reduced ? {} : {opacity: [0.3, 1, 0.3], scale: [0.8, 1.25, 0.8]}}
                      transition={{duration: 1.3, repeat: Infinity, ease: 'easeInOut'}}
                    />
                  ) : (
                    <span className="size-1.5 rounded-full bg-stage-600" />
                  )}
                </span>

                <span
                  className={cx(
                    'type-read text-sm transition-colors',
                    done ? 'text-text-dim' : live ? 'text-text' : 'text-text-dim/45'
                  )}
                >
                  {label}
                </span>
              </li>
            )
          })}
        </ol>

        <div className="mt-6 h-1 overflow-hidden rounded-full bg-stage-600/70">
          <motion.span
            className="block h-full rounded-full bg-gradient-to-r from-gold-500 to-lamp-300"
            initial={false}
            animate={{width: `${((stage + 0.35) / STAGES.length) * 100}%`}}
            transition={reduced ? {duration: 0.12} : spring.soft}
          />
        </div>

        <AnimatePresence>
          {slow && stage < 3 && (
            <motion.p
              initial={{opacity: 0, y: 6}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              className="mt-5 text-center"
            >
              <Label>Taking longer than usual — a VPN or office network can block this</Label>
            </motion.p>
          )}
        </AnimatePresence>
      </Panel>
    </main>
  )
}
