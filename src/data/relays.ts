/**
 * Overrides, not a replacement.
 *
 * Trystero ships a maintained default list per transport, chosen for relays
 * that accept the ephemeral events it publishes. A hand-picked list looks more
 * careful and is usually worse — two attempts at one shipped relays that were
 * rate-limiting, refusing on policy, or simply gone.
 *
 * **A failed WebSocket is logged by the browser itself.** No library setting
 * silences it, so the only fix for console noise is to not list an endpoint
 * that is down. Everything here was probed for a live connection rather than
 * recalled; anything that failed the probe is listed at the bottom so the next
 * person does not put it back.
 *
 * Nostr keeps the defaults: a relay can accept a socket and still reject the
 * events, which a connection probe cannot see, and the defaults are picked for
 * exactly that.
 *
 * Note that supplying `urls` makes Trystero ignore `redundancy` and connect to
 * every entry, so a list here must be short enough to be the whole set, and
 * identical on every client — no per-room shuffling, or two players pick
 * disjoint relays and never find each other.
 */

export const REDUNDANCY = 5

export const NOSTR_RELAYS: string[] | null = null

export const MQTT_RELAYS: string[] | null = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://public:public@public.cloud.shiftr.io'
]

export const TORRENT_RELAYS: string[] | null = [
  'wss://tracker.webtorrent.dev',
  'wss://tracker.openwebtorrent.com',
  'wss://open.ftorrent.com'
]

/**
 * Probed and dead. Do not re-add without probing again:
 *
 *   mqtt     broker.emqx.io:8084, broker-cn.emqx.io:8084,
 *            test.mosquitto.org:8081, mqtt.eclipseprojects.io
 *   torrent  tracker.files.fm:7073, tracker.btorrent.xyz, tracker.novage.com.ua
 *
 * Reachable but useless for signalling, which is why nostr takes the defaults:
 *
 *   nostr    relay.damus.io (rate-limits), offchain.pub (web-of-trust policy)
 */
