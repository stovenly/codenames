/**
 * Dev only. Imported from a branch that constant-folds away in a production
 * build, so neither this module nor its chunk is emitted.
 *
 * A full reload drops you out of the room: the game only exists in the tabs
 * playing it, so reloading the host ends the game to fix a typo. Vite reloads
 * whenever a module cannot be hot-swapped, which for a project built out of
 * module-scope stores is most of them.
 *
 * So: CSS still applies live, because that costs nothing and loses nothing.
 * Anything else is blocked and announced, and refreshing becomes a decision
 * rather than something that happens to you mid-sentence.
 *
 * Throwing out of the listener is what actually stops it — Vite's client
 * notifies listeners and then reloads on the next line, so an exception in a
 * listener means that line is never reached.
 */

let stale = false

const build = () => {
  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;' +
    'display:flex;align-items:center;gap:12px;padding:9px 12px 9px 16px;border-radius:10px;' +
    'border:1px solid rgba(255,197,61,.45);background:#121A2Eee;backdrop-filter:blur(6px);' +
    'box-shadow:0 20px 48px -22px #000;font:600 12px/1 system-ui,sans-serif;' +
    'letter-spacing:.09em;text-transform:uppercase;color:#FFE29A'

  const label = document.createElement('span')
  label.textContent = 'Code changed'

  const refresh = document.createElement('button')
  refresh.textContent = 'Refresh'
  refresh.style.cssText =
    'cursor:pointer;border:1px solid rgba(255,197,61,.55);border-radius:6px;padding:6px 12px;' +
    'background:linear-gradient(#7C5A15,#43300B);color:#FFE29A;font:inherit'
  /**
   * Back to the landing screen, not the room. The room died with the reload —
   * the host was this tab — so returning to `#r=…` only lands on a dead id.
   *
   * replaceState then reload, rather than assigning href: a URL that differs
   * only by its hash is a same-document navigation and would not reload at all.
   */
  refresh.onclick = () => {
    history.replaceState(null, '', import.meta.env.BASE_URL)
    location.reload()
  }

  const dismiss = document.createElement('button')
  dismiss.textContent = '×'
  dismiss.setAttribute('aria-label', 'Dismiss')
  dismiss.style.cssText =
    'cursor:pointer;border:0;background:none;color:#93A0BF;font:600 16px/1 system-ui;padding:0 4px'
  dismiss.onclick = () => host.remove()

  host.append(label, refresh, dismiss)
  return host
}

const announce = () => {
  if (stale) return
  stale = true
  document.body.append(build())
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', () => {
    announce()
    throw new Error('[dev] full reload blocked — refresh from the notice')
  })

  import.meta.hot.on('vite:beforeUpdate', payload => {
    if (!payload.updates.some(u => u.type === 'js-update')) return
    announce()
    throw new Error('[dev] hot update blocked — refresh from the notice')
  })
}
