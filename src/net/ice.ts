import type {TurnServerConfig} from '@trystero-p2p/core'

/**
 * Several STUN servers because candidate gathering succeeds more often with
 * more of them, and all are public and account-free.
 */
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']},
    {urls: 'stun:stun.cloudflare.com:3478'},
    {urls: 'stun:openrelay.metered.ca:80'}
  ],
  iceCandidatePoolSize: 4
}

/**
 * Open Relay publishes shared public credentials, so there is no account.
 * Best-effort by construction: a shared 20GB/month pool that can be slow,
 * rate-limited or withdrawn. Ports 80/443 and TLS survive corporate firewalls
 * that drop everything else.
 */
export const OPEN_RELAY: TurnServerConfig[] = [
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]
