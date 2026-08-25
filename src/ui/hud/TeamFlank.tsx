import * as Tooltip from '@radix-ui/react-tooltip'
import {VenetianMask} from 'lucide-react'
import type {Player, PlayerId, Team} from '../../game/types'
import {AvatarView} from '../avatar/Avatar'
import {Label} from '../atoms'
import {cx} from '../cx'

const EDGE: Record<Team, string> = {
  red: 'border-red-500/70',
  blue: 'border-blue-500/70'
}

const SHOWN = 6

const Face = ({
  player,
  isMe,
  size,
  withName,
  align,
  badgeLeft
}: {
  player: Player
  isMe: boolean
  size: number
  withName: boolean
  align: 'left' | 'right'
  badgeLeft: boolean
}) => {
  const team = player.team ?? 'red'
  // A square with the avatar clipped inside it, like the cards: a round frame
  // over a square face leaves the corners hanging out of it.
  const face = (
    <span className="relative block shrink-0">
      <span
        className={cx(
          'block overflow-hidden rounded-sm border-2',
          isMe ? 'border-lamp-500' : EDGE[team],
          !player.connected && 'opacity-45 grayscale'
        )}
        // The avatar is drawn with rounded corners of its own, so the square is
        // filled with the colour behind it rather than left showing through.
        style={{width: size, height: size, background: `#${player.avatar.bg.replace('#', '')}`}}
      >
        <AvatarView spec={player.avatar} size={size} className="block size-full" />
      </span>
      {player.spymaster && (
        <span
          className={cx(
            'absolute -bottom-1 grid size-4 place-items-center rounded-full bg-stage-000 text-lamp-300 ring-1 ring-lamp-500/50',
            badgeLeft ? '-left-1' : '-right-1'
          )}
        >
          <VenetianMask className="size-2.5" />
        </span>
      )}
    </span>
  )

  if (withName) {
    // The face keeps the edge nearest the board; the name is what reaches out
    // into the space beside it.
    return (
      <span
        className={cx(
          'flex w-full min-w-0 items-center gap-2',
          align === 'right' && 'flex-row-reverse'
        )}
      >
        {face}
        <span
          className={cx(
            'type-read min-w-0 truncate text-sm text-text-dim',
            align === 'right' && 'text-right'
          )}
        >
          {player.name}
        </span>
      </span>
    )
  }

  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>{face}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="type-label z-50 rounded-sm border border-stage-600 bg-stage-900 px-2 py-1 text-text"
        >
          {player.name}
          {player.spymaster && ' · spymaster'}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/**
 * Who is on each side, during the game. Renders `Player` and never `View`: a
 * spymaster's row has to look exactly like a spy's.
 *
 * Two placements, needed under opposite conditions. Beside the board when the
 * board is height-bound and the gutters are wide, which costs no height at all;
 * folded under the scores when it is width-bound, which is when the HUD has
 * height to spare.
 */
export const TeamFlank = ({
  players,
  team,
  me,
  layout,
  withNames = false,
  align = 'left'
}: {
  players: Player[]
  team: Team
  me: PlayerId
  layout: 'column' | 'row'
  withNames?: boolean
  /** Which side of the board this column sits on, so the faces stay flush to it. */
  align?: 'left' | 'right'
}) => {
  const side = players.filter(p => p.team === team)
  const shown = side.slice(0, SHOWN)
  const rest = side.length - shown.length

  return (
    <div
      className={cx(
        'flex',
        layout === 'column'
          ? cx('w-full min-w-0 flex-col gap-2.5', align === 'right' ? 'items-end' : 'items-start')
          : 'items-center gap-2'
      )}
    >
      {shown.map(p => (
        <Face
          key={p.id}
          player={p}
          isMe={p.id === me}
          size={layout === 'column' ? 40 : 26}
          withName={withNames}
          align={align}
          badgeLeft={layout === 'row'}
        />
      ))}
      {rest > 0 && <Label>+{rest}</Label>}
    </div>
  )
}
