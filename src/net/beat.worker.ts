/**
 * The host's liveness beat runs here because a hidden tab's main-thread timers
 * are throttled to roughly once a minute in Chrome, which would fire a spurious
 * election every time the host alt-tabs. Worker timers are throttled far less.
 */

let timer: ReturnType<typeof setInterval> | null = null

self.onmessage = (e: MessageEvent<{type: 'start'; ms: number} | {type: 'stop'}>) => {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
  if (e.data.type === 'start') {
    timer = setInterval(() => self.postMessage('tick'), e.data.ms)
  }
}
