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
    <div className="relative z-20 mt-8 flex w-full max-w-5xl flex-wrap items-stretch justify-center gap-4">
      {cards.map((card, i) => {
        const player = players.find(p => p.id === card.who)
        return (
          <motion.div
            key={card.id}
            initial={{opacity: 0, y: 26, rotate: i % 2 ? 2.5 : -2.5}}
            animate={{opacity: 1, y: 0, rotate: 0}}
            transition={{type: 'spring', stiffness: 260, damping: 22, delay: 0.7 + i * 0.35}}
            className="max-w-72 flex-1 basis-[min(44vw,13rem)]"
          >
            <Panel
              level={2}
              glossy
              className={cx(
                'flex h-full flex-col items-center gap-2.5 px-4 py-5 text-center',
                player?.team && TINT[player.team]
              )}
            >
              <span
                className="overflow-hidden rounded-sm ring-1 ring-gold-500/35"
                style={{background: player && `#${player.avatar.bg.replace('#', '')}`}}
              >
                {player && <AvatarView spec={player.avatar} size={72} />}
              </span>
              <span
                className={cx(
                  'flex items-center gap-1.5',
                  player?.team ? NAME[player.team] : 'text-text'
                )}
              >
                {player?.spymaster ? (
                  <VenetianMask className="size-4 shrink-0" />
                ) : (
                  <Agent className="size-4 shrink-0" />
                )}
                <span className="type-plate truncate text-xl leading-none">
                  {player?.name ?? 'someone'}
                </span>
              </span>
              <Rule className="max-w-20" lit />
              <span className="type-marquee text-xs leading-tight tracking-[0.1em] text-lamp-300">
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
