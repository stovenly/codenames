import {motion} from 'motion/react'
import {Crown, VenetianMask} from 'lucide-react'
import type {Player, Team} from '../../game/types'
import {intend} from '../../state/room'
import {AvatarView} from '../avatar/Avatar'
import {Bulbs, IconButton, Label} from '../atoms'
import {cx} from '../cx'
import {spring, useMotion} from '../motion'

const pip = (rtt: number | null, connected: boolean) => {
  if (!connected) return 'bg-text-dim/25'
  if (rtt === null) return 'bg-text-dim/70'
  if (rtt < 120) return 'bg-lamp-500'
  if (rtt < 400) return 'bg-lamp-500/55'
  return 'bg-kill-lit'
}

const RAIL: Record<'red' | 'blue' | 'none', string> = {
  red: 'from-red-500 to-red-deep',
  blue: 'from-blue-500 to-blue-deep',
  none: 'from-stage-600 to-stage-800'
}

/** A lit podium rather than a list row: glass, name plate, and a lamp for ready. */
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
  hostControls?: boolean
  onDragStart?: () => void
}) => {
  const {reduced} = useMotion()
  const team: Team | null = player.team

  return (
    <motion.div
      layout={!reduced}
      layoutId={reduced ? undefined : `player-${player.id}`}
      initial={reduced ? {opacity: 0} : {opacity: 0, y: 14, scale: 0.97}}
      animate={{opacity: player.connected ? 1 : 0.45, y: 0, scale: 1}}
      exit={reduced ? {opacity: 0} : {opacity: 0, scale: 0.95}}
      transition={spring.soft}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cx(
        'plate gloss overflow-hidden rounded-md',
        draggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <span aria-hidden className={cx('block h-1 w-full bg-gradient-to-r', RAIL[team ?? 'none'])} />

      <div className="flex items-center gap-3 p-2.5">
        <span className="relative shrink-0 rounded-sm bg-stage-000 p-[3px] ring-1 ring-gold-500/30">
          <AvatarView spec={player.avatar} size={40} />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-sm"
            style={{
              background: 'linear-gradient(155deg, rgba(255,255,255,.22) 0%, transparent 45%)'
            }}
          />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-1.5">
            <span className="type-plate truncate text-base text-text">{player.name}</span>
            {isMe && <Label className="shrink-0">you</Label>}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cx('size-1.5 shrink-0 rounded-full', pip(rtt, player.connected))}
              title={rtt ? `${Math.round(rtt)}ms` : undefined}
            />
            {isHost && (
              <span className="type-label flex items-center gap-1 text-lamp-300">
                <Crown className="size-3" /> host
              </span>
            )}
            {player.spymaster && team && (
              <span
                className={cx(
                  'type-label flex items-center gap-1',
                  team === 'red' ? 'text-red-lit' : 'text-blue-lit'
                )}
              >
                <VenetianMask className="size-3" /> spymaster
              </span>
            )}
            {!player.connected && <Label>away</Label>}
          </span>
        </div>
      </div>

      {hostControls && (
        <div className="flex items-center gap-1 border-t border-stage-600/70 px-2.5 py-2">
          {(
            [
              ['red', 'Red', 'Move to red'],
              [null, '—', 'Unassign'],
              ['blue', 'Blue', 'Move to blue']
            ] as const
          ).map(([value, glyph, label]) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={team === value}
              onClick={() => intend({kind: 'setTeam', target: player.id, team: value})}
              className={cx(
                'type-label h-7 flex-1 cursor-pointer rounded-sm border transition-colors duration-[120ms]',
                team === value
                  ? value === 'red'
                    ? 'border-red-500/60 bg-red-500/15 text-red-lit'
                    : value === 'blue'
                      ? 'border-blue-500/60 bg-blue-500/15 text-blue-lit'
                      : 'border-lamp-500/60 bg-lamp-500/12 text-lamp-300'
                  : 'border-stage-600 hover:border-gold-500/50 hover:text-text'
              )}
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
            <VenetianMask className="size-3.5" />
          </IconButton>
        </div>
      )}

      <Bulbs lit={player.ready} className="opacity-90" />
    </motion.div>
  )
}
