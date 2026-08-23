import {Button, Label} from '../atoms'
import {cx} from '../cx'
import {ACK_GIVE_UP_MS, ACK_WORRY_MS, useRoom} from '../../state/room'

/** Back to the landing screen: the room this tab was in is the thing that broke. */
const reload = () => {
  history.replaceState(null, '', import.meta.env.BASE_URL)
  location.reload()
}

const HOST_WORRY_MS = 3_000
const HOST_LOST_MS = 10_000

/**
 * Whether anything this player does is reaching anyone.
 *
 * Both halves of that are invisible without it. A move that never arrives
 * looks exactly like a move nobody has made yet, and a host that has gone
 * quiet looks exactly like a host who is thinking — so people play into the
 * void for a whole turn rather than refreshing in five seconds.
 */
export const HostLink = () => {
  const {hostHeardMsAgo, unacked} = useRoom()

  const lost = hostHeardMsAgo !== null && hostHeardMsAgo > HOST_LOST_MS
  const shaky = hostHeardMsAgo !== null && hostHeardMsAgo > HOST_WORRY_MS
  const stuck = unacked !== null && unacked.oldestMs > ACK_GIVE_UP_MS
  const slow = unacked !== null && unacked.oldestMs > ACK_WORRY_MS

  if (!shaky && !slow) return null

  const bad = lost || stuck
  const said = lost
    ? 'Lost the host'
    : stuck
      ? 'Your move is not getting through'
      : slow
        ? 'Still sending your move…'
        : 'Reconnecting…'

  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className={cx(
          'size-1.5 shrink-0 rounded-full',
          bad ? 'bg-kill-lit' : 'animate-pulse bg-lamp-300'
        )}
      />
      <Label className={bad ? 'text-kill-lit' : 'text-lamp-300'}>{said}</Label>
      {bad && (
        <Button variant="quiet" size="sm" onClick={reload}>
          Reload
        </Button>
      )}
    </span>
  )
}
