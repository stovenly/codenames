/**
 * Overrides, not a replacement.
 *
 * Trystero ships a maintained default list per transport, chosen for relays
 * that actually accept the ephemeral events it publishes. A hand-picked list
 * looks more careful and is usually worse: `relay.damus.io` rate-limits the
 * signalling traffic and `offchain.pub` rejects it outright as a web-of-trust
 * policy violation, which is console noise and two dead relays.
 *
 * So: use the defaults unless a specific default is observed failing. Anything
 * listed here is a correction with a reason, and `null` means "take the
 * defaults".
 *
 * Note that supplying `urls` makes Trystero ignore `redundancy` and connect to
 * every entry, so a list here must be short enough to be the whole set. The
 * order must also be identical on every client — no per-room shuffling, or two
 * players pick disjoint relays and never find each other.
 */

export const REDUNDANCY = 5

export const NOSTR_RELAYS: string[] | null = null

/** `test.mosquitto.org:8081` refuses the WSS upgrade more often than not. */
export const MQTT_RELAYS: string[] | null = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://public:public@public.cloud.shiftr.io',
  'wss://broker-cn.emqx.io:8084/mqtt'
]

/** `tracker.btorrent.xyz` has been down long enough to stop counting as flaky. */
export const TORRENT_RELAYS: string[] | null = [
  'wss://tracker.webtorrent.dev',
  'wss://tracker.openwebtorrent.com',
  'wss://open.ftorrent.com',
  'wss://tracker.files.fm:7073/announce'
]
