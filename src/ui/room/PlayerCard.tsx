import {motion} from 'motion/react'
import type {Player, Team} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {Glyph} from '../atoms'
import {spring, useReducedMotion} from '../motion'

const pipTone = (rtt: number | null, connected: boolean) => {
  if (!connected) return 'bg-text-dim/40'
  if (rtt === null) return 'bg-text-dim'
  if (rtt < 120) return 'bg-brass-400'
  if (rtt < 400) return 'bg-brass-200/70'
  return 'bg-void-rim'
}

export const PlayerCard = ({
  player,
  isHost,
  isMe,
  rtt,
  draggable,
  onDragStart
}: {
  player: Player
  isHost: boolean
  isMe: boolean
  rtt: number | null
  draggable: boolean
  onDragStart?: () => void
}) => {
  const reduced = useReducedMotion()
  const team: Team | null = player.team

  return (
    <motion.div
      layout={!reduced}
      layoutId={reduced ? undefined : `player-${player.id}`}
      initial={reduced ? {opacity: 0} : {opacity: 0, scale: 0.94}}
      animate={{opacity: player.connected ? 1 : 0.5, scale: 1}}
      exit={reduced ? {opacity: 0} : {opacity: 0, scale: 0.94}}
      transition={spring.soft}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`relative overflow-hidden rounded-lg border bg-ink-800 p-2.5 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        team === 'red'
          ? 'border-red-500/45'
          : team === 'blue'
            ? 'border-blue-500/45'
            : 'border-ink-600'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="rounded-md border border-brass-400/35 bg-ink-900 p-1">
          <AvatarView spec={player.avatar} size={38} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm text-text">{player.name}</span>
            {isMe && <span className="type-mono shrink-0 text-[10px] text-text-dim">you</span>}
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${pipTone(rtt, player.connected)}`} title={rtt ? `${Math.round(rtt)}ms` : undefined} />
            {isHost && <span className="type-mono text-[10px] tracking-wide text-brass-400">HOST</span>}
            {player.spymaster && team && (
              <span
                className={`type-mono flex items-center gap-1 text-[10px] ${
                  team === 'red' ? 'text-red-glow' : 'text-blue-glow'
                }`}
              >
                <Glyph team={team} className="size-2" />
                SPYMASTER
              </span>
            )}
            {!player.connected && <span className="type-mono text-[10px] text-text-dim">away</span>}
          </span>
        </div>
      </div>

      <motion.span
        aria-hidden
        initial={false}
        animate={{scaleX: player.ready ? 1 : 0}}
        transition={reduced ? {duration: 0.12} : spring.firm}
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brass-400"
      />
    </motion.div>
  )
}
