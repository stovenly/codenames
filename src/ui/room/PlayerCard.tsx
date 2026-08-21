import {motion} from 'motion/react'
import type {Player, Team} from '../../game/types'
import {intend} from '../../state/room'
import {AvatarView} from '../avatar/Avatar'
import {Glyph} from '../atoms'
import {IconButton, Mask} from '../icons'
import {spring, useMotion} from '../motion'

const pip = (rtt: number | null, connected: boolean) => {
  if (!connected) return 'bg-text-dim/30'
  if (rtt === null) return 'bg-text-dim/70'
  if (rtt < 120) return 'bg-brass-400'
  if (rtt < 400) return 'bg-brass-400/55'
  return 'bg-void-rim'
}

const EDGE: Record<'red' | 'blue' | 'none', string> = {
  red: 'before:bg-red-500',
  blue: 'before:bg-blue-500',
  none: 'before:bg-ink-600'
}

export const PlayerCard = ({
  player,
  isHost,
  isMe,
  rtt,
  draggable,
  hostControls = false,
  onDragStart
}: {
  player: Player
  isHost: boolean
  isMe: boolean
  rtt: number | null
  draggable: boolean
  /** Dragging is quick but imprecise, and impossible on touch — the host gets buttons too. */
  hostControls?: boolean
  onDragStart?: () => void
}) => {
  const {reduced} = useMotion()
  const team: Team | null = player.team

  return (
    <motion.div
      layout={!reduced}
      layoutId={reduced ? undefined : `player-${player.id}`}
      initial={reduced ? {opacity: 0} : {opacity: 0, scale: 0.95}}
      animate={{opacity: player.connected ? 1 : 0.45, scale: 1}}
      exit={reduced ? {opacity: 0} : {opacity: 0, scale: 0.95}}
      transition={spring.soft}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`paper surface-2 relative overflow-hidden rounded-md p-2.5 shadow-2 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:content-[''] ${
        EDGE[team ?? 'none']
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-center gap-2.5 pl-1">
        <span className="shrink-0 rounded-sm bg-ink-900/70 p-[3px] ring-1 ring-brass-400/25">
          <AvatarView spec={player.avatar} size={36} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-1.5">
            <span className="truncate text-sm text-text">{player.name}</span>
            {isMe && <span className="type-label shrink-0">you</span>}
          </span>

          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`size-1.5 shrink-0 rounded-full ${pip(rtt, player.connected)}`}
              title={rtt ? `${Math.round(rtt)}ms` : undefined}
            />
            {isHost && <span className="type-label text-brass-400">host</span>}
            {player.spymaster && team && (
              <span
                className={`type-label flex items-center gap-1 ${
                  team === 'red' ? 'text-red-glow' : 'text-blue-glow'
                }`}
              >
                <Glyph team={team} className="size-2" />
                spymaster
              </span>
            )}
            {!player.connected && <span className="type-label">away</span>}
          </span>
        </div>
      </div>

      {hostControls && (
        <div className="mt-2.5 flex items-center gap-1 border-t border-ink-600/70 pt-2 pl-1">
          {([
            ['red', 'Red', 'Move to red'],
            [null, '—', 'Unassign'],
            ['blue', 'Blue', 'Move to blue']
          ] as const).map(([value, glyph, label]) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={team === value}
              onClick={() => intend({kind: 'setTeam', target: player.id, team: value})}
              className={`type-label h-7 flex-1 cursor-pointer rounded-sm border transition-colors duration-[120ms] ${
                team === value
                  ? value === 'red'
                    ? 'border-red-500/60 bg-red-500/15 text-red-glow'
                    : value === 'blue'
                      ? 'border-blue-500/60 bg-blue-500/15 text-blue-glow'
                      : 'border-brass-400/60 bg-brass-400/12 text-brass-200'
                  : 'border-ink-600 hover:border-brass-400/45 hover:text-text'
              }`}
            >
              {glyph}
            </button>
          ))}
          <IconButton
            label={player.spymaster ? 'Remove as spymaster' : 'Make spymaster'}
            active={player.spymaster}
            disabled={!team}
            className="size-7"
            onClick={() =>
              intend({kind: 'setSpymaster', target: player.id, spymaster: !player.spymaster})
            }
          >
            <Mask />
          </IconButton>
        </div>
      )}

      <motion.span
        aria-hidden
        initial={false}
        animate={{scaleX: player.ready ? 1 : 0}}
        transition={reduced ? {duration: 0.12} : spring.firm}
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-brass-400"
      />
    </motion.div>
  )
}
