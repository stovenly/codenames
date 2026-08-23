/**
 * Opens a full lobby of real, separate clients so one person can play test a
 * game that needs four.
 *
 *   npm run playtest                    four windows, all yours to play
 *   npm run playtest -- --players=6
 *   npm run playtest -- --players=5 --seats=red*,red,blue*,blue,blue
 *   npm run playtest -- --auto          the seats you are not in play themselves
 *   npm run playtest -- --auto --seat=1 you keep seat 1 instead of seat 0
 *   npm run playtest -- --auto --seat=none   nobody is yours; it plays itself
 *   npm run playtest -- --headless      no windows; watch the log instead
 *   npm run playtest -- --url=http://localhost:4173/codenames/
 *
 * Every player gets its own browser context, because localStorage holds the
 * seat and a shared one makes each new window resume as the last player.
 *
 * Bots act only through the rendered UI — they type into the clue box and click
 * cards. Nothing here reaches into app state, so a bot is indistinguishable
 * from a person as far as the mesh is concerned, and the paths it exercises are
 * the ones a real client uses.
 */
import {spawn} from 'node:child_process'
import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const arg = (name, fallback) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}
const flag = name => process.argv.includes(`--${name}`)

const URL_BASE = arg('url', 'http://localhost:5173/codenames/')
const PLAYERS = Math.max(4, Number(arg('players', 4)))
const AUTO = flag('auto')
/** Under --auto, the one window still left for you. */
const SEAT = arg('seat', '0')
const HEADLESS = flag('headless')
/** Directory to drop one screenshot per player into, for checking a change landed. */
const SHOT = arg('shot', '')
const PORT = Number(arg('port', 9455))

const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome')

const sleep = ms => new Promise(r => setTimeout(r, ms))

/** Seat 0 is always You, so you can find your own window; the rest are dealt. */
const POOL = [
  'Marlow', 'Vesper', 'Cobb', 'Rook', 'Sable', 'Pike', 'Wren', 'Bex', 'Halloway',
  'Nadia', 'Ozzy', 'Quill', 'Fen', 'Tallis', 'Juno', 'Mercer', 'Kestrel', 'Dov',
  'Sunny', 'Bramble', 'Otto', 'Marisol', 'Zeke', 'Lark', 'Rennick', 'Pip'
]

const NAMES = ['You', ...[...POOL].sort(() => Math.random() - 0.5)]

/**
 * Red spymaster, red spy, blue spymaster, blue spy, then alternating spies —
 * unless --seats says otherwise, as `red*,red,blue*,blue,blue` where a star is
 * the mask. Stacking one side is how you get two people picking at once.
 */
const SEATS = arg('seats', '')
  .split(',')
  .filter(Boolean)
  .map(entry => ({
    team: entry.replace('*', '').trim().toLowerCase() === 'blue' ? 'Blue' : 'Red',
    spymaster: entry.includes('*')
  }))

const seatFor = i =>
  SEATS[i] ??
  (i === 0
    ? {team: 'Red', spymaster: true}
    : i === 1
      ? {team: 'Red', spymaster: false}
      : i === 2
        ? {team: 'Blue', spymaster: true}
        : {team: i % 2 === 1 ? 'Blue' : 'Red', spymaster: false})

// Detached: on Windows the launcher returns as soon as the browser is up, so
// its exit says nothing about whether the windows are still open.
spawn(
  CHROME,
  [
    ...(HEADLESS ? ['--headless=new', '--window-size=1440,960'] : []),
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'codenames-playtest-'))}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required',
    'about:blank'
  ],
  {stdio: 'ignore', detached: true}
).unref()

const connect = async url => {
  const ws = new WebSocket(url)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = () => reject(new Error(`cannot reach ${url}`))
  })
  let id = 0
  const pending = new Map()
  ws.onmessage = e => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result)
      pending.delete(msg.id)
    }
  }
  return (method, params = {}) =>
    new Promise(resolve => {
      const mid = ++id
      pending.set(mid, resolve)
      ws.send(JSON.stringify({id: mid, method, params}))
    })
}

const version = await (async () => {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return res.json()
    } catch {
      /* still starting */
    }
    await sleep(250)
  }
  throw new Error('Chrome never opened a debugging port')
})()

const browser = await connect(version.webSocketDebuggerUrl)

/**
 * The launcher process returns immediately on Windows, so killing this script
 * does not touch the browser it started. Closing it over the protocol is the
 * only way, and it has to happen on every exit or the windows pile up.
 */
let closing = false
const shutdown = async code => {
  if (closing) return
  closing = true
  try {
    await Promise.race([browser('Browser.close'), sleep(2000)])
  } catch {
    /* already gone */
  }
  process.exit(code)
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => void shutdown(0))
}
for (const fault of ['uncaughtException', 'unhandledRejection']) {
  process.on(fault, err => {
    console.error(err?.message ?? err)
    void shutdown(1)
  })
}

// A grid wide enough that every window shows its board without overlapping.
const cols = PLAYERS <= 4 ? 2 : 3
const rows = Math.ceil(PLAYERS / cols)

const open = async (url, index, label) => {
  const {browserContextId} = await browser('Target.createBrowserContext')
  const {targetId} = await browser('Target.createTarget', {url: 'about:blank', browserContextId})

  if (!HEADLESS) {
    const {windowId} = await browser('Browser.getWindowForTarget', {targetId})
    const width = Math.floor(1920 / cols)
    const height = Math.floor(1040 / rows)
    await browser('Browser.setWindowBounds', {
      windowId,
      bounds: {
        left: (index % cols) * width,
        top: Math.floor(index / cols) * height,
        width,
        height,
        windowState: 'normal'
      }
    })
  }

  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const send = await connect(list.find(t => t.id === targetId).webSocketDebuggerUrl)
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.navigate', {url})

  const evaluate = async expression => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    })
    if (res?.exceptionDetails) return null
    return res?.result?.value
  }

  const shot = async name => {
    const {data} = await send('Page.captureScreenshot', {format: 'png'})
    writeFileSync(join(SHOT, name), Buffer.from(data, 'base64'))
  }

  return {label, index, evaluate, shot}
}

const click = (tab, text) =>
  tab.evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})
    if (!b || b.disabled) return false
    b.click()
    return true
  })()`)

const type = (tab, index, value) =>
  tab.evaluate(`(() => {
    const el = document.querySelectorAll('input')[${index}]
    if (!(el instanceof HTMLInputElement)) return false
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)})
    el.dispatchEvent(new Event('input', {bubbles: true}))
    return true
  })()`)

const waitFor = async (tab, expression, what, seconds = 45) => {
  for (let i = 0; i < seconds * 4; i++) {
    if (await tab.evaluate(expression)) return true
    await sleep(250)
  }
  const screen = await tab.evaluate('document.body.innerText')
  throw new Error(
    `${tab.label}: gave up waiting for ${what}

${String(screen ?? '').slice(0, 400)}`
  )
}

console.log(`opening ${PLAYERS} players against ${URL_BASE}`)

const host = await open(URL_BASE, 0, NAMES[0])
await waitFor(host, `document.querySelectorAll('input').length > 0`, 'the landing screen')
await type(host, 0, NAMES[0])
await click(host, 'Start a game')
await waitFor(host, `location.hash.includes('#r=')`, 'a room id')

const link = await host.evaluate('location.href')
console.log(`room ${link}`)

const tabs = [host]
for (let i = 1; i < PLAYERS; i++) {
  const tab = await open(link, i, NAMES[i % NAMES.length])
  await waitFor(tab, `document.querySelectorAll('input').length > 0`, 'the landing screen')
  await type(tab, 0, tab.label)
  await click(tab, 'Take a seat')
  tabs.push(tab)
  await sleep(1200)
}

// A different face each run, so sessions are told apart at a glance rather than
// by reading the names. Waited for rather than fired hopefully: a guest that has
// not finished rendering the lobby has no dice to click, and an optional call
// on a button that is not there fails quietly.
const roll = (tab, label) =>
  tab.evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(
      b => b.getAttribute('aria-label') === ${JSON.stringify(label)}
    )
    if (!b) return false
    b.click()
    return true
  })()`)

for (const tab of tabs) {
  await waitFor(
    tab,
    `[...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === 'Roll a random one')`,
    'the avatar picker'
  )
  let rolled = 0
  for (let n = 0; n < 3; n++) {
    if (await roll(tab, 'Roll a random one')) rolled++
    await sleep(120)
  }
  const tinted = await roll(tab, 'Roll a random colour')
  if (rolled < 3 || !tinted) console.log(`  ${tab.label}: avatar rolls ${rolled}/3, colour ${tinted}`)
}

for (const tab of tabs) {
  const {team, spymaster} = seatFor(tab.index)
  await waitFor(tab, `!!document.querySelector('button')`, 'the lobby')
  await click(tab, team)
  await sleep(250)
  if (spymaster) await click(tab, 'Spymaster')
  await sleep(250)
  await click(tab, 'Ready')
  console.log(`  ${tab.label.padEnd(8)} ${team}${spymaster ? ' spymaster' : ' spy'}`)
}

// Peers link up at their own pace, and Start stays disabled until they have.
await waitFor(
  host,
  `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Start game')?.disabled === false`,
  'every player to connect and ready up',
  90
)
await click(host, 'Start game')
console.log('game started')

const bots = AUTO ? tabs.filter(t => String(t.index) !== SEAT) : []
const yours = tabs.find(t => String(t.index) === SEAT)
console.log(
  !bots.length
    ? 'every window is yours to play. Ctrl-C when you are done.'
    : `you are ${yours?.label ?? 'nobody'}; the rest play themselves`
)

if (SHOT) {
  await sleep(9000)
  for (const tab of tabs) await tab.shot(`${tab.index}-${tab.label}.png`)
  console.log(`screenshots in ${SHOT}`)
  if (!bots.length) await shutdown(0)
}

const CLUES = ['ORBIT', 'CIPHER', 'HARBOR', 'LANTERN', 'THICKET', 'VELVET', 'QUARRY', 'MERIDIAN']

/**
 * One move per tick, chosen from what the UI is currently offering: a clue box
 * means it is our turn to give one, an enabled card means it is our turn to
 * guess. Anything else is somebody else's turn.
 */
const act = (tab, clue) =>
  tab.evaluate(`(() => {
    const box = document.querySelector('main input')
    if (box) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, ${JSON.stringify(clue)})
      box.dispatchEvent(new Event('input', {bubbles: true}))
      const give = [...document.querySelectorAll('button')].find(b => /give clue/i.test(b.textContent))
      if (give && !give.disabled) { give.click(); return 'clue' }
      return null
    }
    const lock = [...document.querySelectorAll('button')].find(b => /^lock in/i.test(b.textContent))
    if (lock) { lock.click(); return lock.textContent.trim().toLowerCase() }

    const cards = [...document.querySelectorAll('main button[aria-label]')].filter(b => !b.disabled)
    if (!cards.length) return null
    const card = cards[Math.floor(Math.random() * cards.length)]
    card.click()
    return 'picks ' + card.getAttribute('aria-label')
  })()`)

let turn = 0
let done = false
for (; bots.length; ) {
  await sleep(1800)

  if (await host.evaluate(`/play again|new game|rematch/i.test(document.body.innerText)`)) {
    if (!done) console.log('game over — the windows stay open, start another from any of them')
    done = true
    continue
  }
  done = false

  for (const bot of bots) {
    const did = await act(bot, CLUES[turn++ % CLUES.length])
    if (did) console.log(`  ${bot.label}: ${did}`)
  }
}

// Nothing to drive, but the windows are the point. A pending promise does not
// keep the event loop alive on its own, so hold it open with a timer.
setInterval(() => {}, 1 << 30)
