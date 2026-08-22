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
 * Trystero seeds its shuffle with the app id, not the room, so its pick of the
 * nostr defaults is the same handful for every client of this app forever, and
 * a bad entry in that pick fails for everyone on every load. The list below is
 * chosen from its defaults — so still relays known to accept the events it
 * publishes — favouring the largest and fastest, because small self-hosted
 * relays are the ones a VPN exit or a corporate resolver tends to block.
 *
 * Note that supplying `urls` makes Trystero ignore `redundancy` and connect to
 * every entry, so a list here must be short enough to be the whole set, and
 * identical on every client — no per-room shuffling, or two players pick
 * disjoint relays and never find each other.
 */

export const REDUNDANCY = 5

export const NOSTR_RELAYS: string[] | null = [
  'wss://nos.lol',
  'wss://purplerelay.com',
  'wss://relay.nostr.place',
  'wss://relay.mostr.pub'
]

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
 *   nostr    relay.froth.zone, strfry.openhoofd.nl
 *   torrent  tracker.files.fm:7073, tracker.btorrent.xyz, tracker.novage.com.ua
 *
 * Opens a socket but not worth listing:
 *
 *   nostr    relay.damus.io (rate-limits), offchain.pub (web-of-trust policy),
 *            koru.bitcointxoko.org (reachable here, refused from a VPN exit)
 */
