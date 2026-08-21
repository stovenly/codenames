/**
 * Curated signalling relays, one list per transport. Trystero ships its own
 * defaults, but they drift and die; a list we control is updatable with a
 * commit. Order matters: every client takes the same leading `REDUNDANCY`
 * entries, so the slice must be deterministic and identical everywhere or two
 * players pick disjoint relays and never discover each other.
 *
 * Entries past the slice are vetted spares. Promote one by moving it up.
 */

export const REDUNDANCY = 6

export const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://offchain.pub',
  'wss://nostr.mom',
  'wss://relay.snort.social',
  'wss://purplepag.es',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.nostr.bg',
  'wss://nostr.bitcoiner.social',
  'wss://relay.mostr.pub'
]

export const MQTT_RELAYS = [
  'wss://test.mosquitto.org:8081/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://public:public@public.cloud.shiftr.io',
  'wss://broker-cn.emqx.io:8084/mqtt',
  'wss://mqtt.eclipseprojects.io/mqtt'
]

export const TORRENT_RELAYS = [
  'wss://tracker.webtorrent.dev',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://open.ftorrent.com',
  'wss://tracker.files.fm:7073/announce',
  'wss://tracker.novage.com.ua'
]

export const slice = (urls: string[]) => urls.slice(0, REDUNDANCY)
