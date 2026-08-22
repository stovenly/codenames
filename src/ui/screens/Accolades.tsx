import {motion} from 'motion/react'
import {VenetianMask} from 'lucide-react'
import type {Accolade} from '../../game/accolades'
import type {Player, Team} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {Agent} from '../board/symbols'
import {Label, Panel, Rule} from '../atoms'
import {cx} from '../cx'

const TINT: Record<Team, string> = {
  red: 'border-red-500/45 bg-red-500/10',
  blue: 'border-blue-500/45 bg-blue-500/10'
}

const NAME: Record<Team, string> = {red: 'text-red-lit', blue: 'text-blue-lit'}

/**
 * Dealt face up under the result while the confetti is still falling. Four is
 * the roster minimum, so four always fits and always fills.
 */
export const Accolades = ({cards, players}: {cards: Accolade[]; players: Player[]}) => {
  if (!cards.length) return null

  return (
    <div className="relative z-20 mt-8 flex w-full max-w-4xl flex-wrap items-stretch justify-center gap-3">
      {cards.map((card, i) => {
        const player = players.find(p => p.id === card.who)
        return (
          <motion.div
            key={card.id}
            initial={{opacity: 0, y: 26, rotate: i % 2 ? 2.5 : -2.5}}
            animate={{opacity: 1, y: 0, rotate: 0}}
            transition={{type: 'spring', stiffness: 260, damping: 22, delay: 0.7 + i * 0.35}}
            className="w-[min(44vw,11rem)]"
          >
            <Panel
              level={2}
              glossy
              className={cx(
                'flex h-full flex-col items-center gap-2 px-3 py-4 text-center',
                player?.team && TINT[player.team]
              )}
            >
              <span className="rounded-sm bg-stage-000 p-[3px] ring-1 ring-gold-500/35">
                {player && <AvatarView spec={player.avatar} size={52} />}
              </span>
              <span
                className={cx(
                  'flex items-center gap-1.5',
                  player?.team ? NAME[player.team] : 'text-text'
                )}
              >
                {player?.spymaster ? (
                  <VenetianMask className="size-3.5 shrink-0" />
                ) : (
                  <Agent className="size-3.5 shrink-0" />
                )}
                <span className="type-plate truncate text-lg leading-none">
                  {player?.name ?? 'someone'}
                </span>
              </span>
              <Rule className="max-w-16" lit />
              <span className="type-marquee text-[11px] leading-tight tracking-[0.1em] text-lamp-300">
                {card.title}
              </span>
              <Label className="leading-tight">{card.detail}</Label>
            </Panel>
          </motion.div>
        )
      })}
    </div>
  )
}
