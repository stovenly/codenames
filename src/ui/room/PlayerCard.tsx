import {motion} from 'motion/react'
import {Crown, UserMinus, VenetianMask} from 'lucide-react'
import type {Player, Team} from '../../game/types'
import {intend} from '../../state/room'
import {AvatarView} from '../avatar/Avatar'
import {Agent, Onlooker} from '../board/symbols'
import {IconButton, Label} from '../atoms'
import {cx} from '../cx'
import {spring} from '../motion'

const pip = (rtt: number | null, connected: boolean) => {
  if (!connected) return 'bg-text-dim/25'
  if (rtt === null) return 'bg-text-dim/70'
  if (rtt < 120) return 'bg-lamp-500'
  if (rtt < 400) return 'bg-lamp-500/55'
  return 'bg-kill-lit'
}

const BAND: Record<'red' | 'blue' | 'none', string> = {
  red: 'from-red-500 to-red-deep',
  blue: 'from-blue-500 to-blue-deep',
  none: 'from-stage-600 to-stage-800'
}

/**
 * Every row is a fixed height whether or not it has anything to say, so a card
 * never changes size. A card that grows when someone volunteers as spymaster
 * shoves the whole column around, which reads as the roster glitching.
 *
 * That is also why the spymaster badge lives in the team band and the host mark
 * is pinned to a corner: both used to sit in the meta line and reflow it.
 */
export const PlayerCard = ({
  player,
  isHost,
  isMe,
  rtt,
  draggable,
  hostControls = false,
  instant = false,
  onDragStart
}: {
  player: Player
  isHost: boolean
  isMe: boolean
  rtt: number | null
  draggable: boolean
  hostControls?: boolean
  /** A whole roster reseated at once: there is no move to follow, so do not draw one. */
  instant?: boolean
  onDragStart?: () => void
}) => {
    const team: Team | null = player.team

  return (
    <motion.div
      layout={instant ? false : 'position'}
      layoutId={instant ? undefined : `player-${player.id}`}
      initial={instant ? false : {opacity: 0, y: 14, scale: 0.97}}
      animate={{opacity: player.connected ? 1 : 0.45, y: 0, scale: 1}}
      exit={instant ? {opacity: 0} : {opacity: 0, scale: 0.95}}
      transition={instant ? {duration: 0} : spring.soft}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cx(
        'plate gloss relative overflow-hidden rounded-md',
        !player.connected && 'border-dashed grayscale-[.55]',
        draggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      {/* The team band. Tall enough for the badge on every card, occupied or not. */}
      <span
        className={cx(
          'flex h-6 items-center gap-1.5 bg-gradient-to-r px-2.5 pt-[3px] text-white/95',
          BAND[team ?? 'none']
        )}
      >
        {player.spectator && (
          <>
            <Onlooker className="size-3.5" />
            <span className="type-label text-white/80">Watching</span>
          </>
        )}
        {team && (
          <>
            {player.spymaster ? (
              <VenetianMask className="size-3.5" />
            ) : (
              <Agent className="size-3.5" />
            )}
            <span className="type-marquee text-[10px] tracking-[0.16em] drop-shadow-[0_1px_2px_rgba(0,0,0,.55)]">
              {player.spymaster ? 'Spymaster' : 'Spy'}
            </span>
          </>
        )}
      </span>

      {isHost && (
        <span
          title="Host"
          className="absolute top-8 right-2 grid size-6 place-items-center rounded-full bg-stage-000/70 text-lamp-300 ring-1 ring-lamp-500/40"
        >
          <Crown className="size-3.5" />
        </span>
      )}

      <div className="flex items-center gap-3 p-2.5 pr-9">
        <span className="relative shrink-0 rounded-sm bg-stage-000 p-[3px] ring-1 ring-gold-500/30">
          <AvatarView spec={player.avatar} size={46} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-plate truncate text-xl text-text">{player.name}</span>
          <span className="flex h-4 items-center gap-2">
            <span
              className={cx('size-1.5 shrink-0 rounded-full', pip(rtt, player.connected))}
              title={rtt ? `${Math.round(rtt)}ms` : undefined}
            />
            <Label className="truncate">
              {!player.connected ? 'seat held' : isMe ? 'you' : ''}
            </Label>
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
                'type-label h-8 flex-1 cursor-pointer rounded-sm border transition-colors duration-[120ms]',
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
            className="size-8"
            onClick={() =>
              intend({kind: 'setSpymaster', target: player.id, spymaster: !player.spymaster})
            }
          >
            <VenetianMask className="size-3.5" />
          </IconButton>

          {!player.connected && !isMe && (
            <IconButton
              label={`Give up ${player.name}'s seat`}
              className="size-8 hover:border-kill-lit/60 hover:text-kill-lit"
              onClick={() => intend({kind: 'removePlayer', target: player.id})}
            >
              <UserMinus className="size-3.5" />
            </IconButton>
          )}
        </div>
      )}

      {/* Ready strip: lamps plus a word, so it is legible rather than decorative. */}
      <span
        className={cx(
          'flex h-7 items-center justify-between gap-2 border-t px-2.5 transition-colors duration-200',
          player.ready
            ? 'border-lamp-500/40 bg-lamp-500/12'
            : 'border-stage-600/70 bg-stage-000/40'
        )}
      >
        <span className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map(i => (
            <span
              key={i}
              className={cx(
                'size-1.5 rounded-full transition-colors duration-200',
                player.ready ? 'bg-lamp-500 shadow-[0_0_6px_1px_rgba(255,197,61,.7)]' : 'bg-lamp-dim'
              )}
            />
          ))}
        </span>
        <Label className={player.ready ? 'text-lamp-300' : 'text-text-dim/60'}>
          {player.ready ? 'Ready' : 'Not ready'}
        </Label>
      </span>
    </motion.div>
  )
}
