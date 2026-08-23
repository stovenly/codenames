import {AnimatePresence, motion} from 'motion/react'
import {Suspense, lazy, useEffect} from 'react'
import {accolades} from '../../game/accolades'
import {derive} from '../../game/reducer'
import {startPresence} from '../../state/presence'
import {useRoom} from '../../state/room'
import {syncTheatre, useTheatre} from '../../state/theatre'
import * as words from '../../state/words'
import {Label} from '../atoms'
import {Board} from '../board/Board'
import {ClueReveal, TurnBand} from '../hud/ClueReveal'
import {Curtain} from '../hud/Curtain'
import {Hud} from '../hud/Hud'
import {cx} from '../cx'
import {AssassinTakeover, BoardBreath, MissFlare, SpymasterChrome} from '../hud/Overlays'
import {unlockAudio} from '../sound/audio'
import {GameOver} from './GameOver'

/** Host-only and not needed on first paint. */
const HostPanel = lazy(() => import('../host/HostPanel').then(m => ({default: m.HostPanel})))

export const Game = () => {
  const {shared, role, me} = useRoom()
  const {shownCursor, stage} = useTheatre()
  words.useWords()

  useEffect(() => {
    startPresence()
    unlockAudio()
    syncTheatre()
  }, [])

  const list = shared ? words.get(shared.settings.wordListHash) : []
  const view = shared ? derive(shared.settings, list, shared.steps, shownCursor) : null

  // On the root, because the wash it drives is fixed to the viewport and sits
  // behind everything — there is no element inside the page to hang it on.
  const myTeam = shared?.players.find(p => p.id === me)?.team ?? null
  useEffect(() => {
    const el = document.documentElement
    if (myTeam) el.setAttribute('data-team', myTeam)
    else el.removeAttribute('data-team')
    return () => el.removeAttribute('data-team')
  }, [myTeam])

  if (!shared || !view) return null

  const player = shared.players.find(p => p.id === me) ?? null
  const isHost = role === 'host'
  const busy = stage.kind !== 'idle' && stage.kind !== 'finish'

  const panel = isHost ? (
    <Suspense fallback={null}>
      <HostPanel />
    </Suspense>
  ) : null

  if (stage.kind === 'finish' || (view.phase === 'gameover' && stage.kind === 'idle')) {
    return (
      <>
        <GameOver
          view={view}
          me={player}
          isHost={isHost}
          players={shared.players}
          honours={accolades(shared.settings, list, shared.steps, shared.players)}
        />
        {panel}
      </>
    )
  }

  if (!list.length) {
    return (
      <main className="grid min-h-full place-items-center">
        <Label className="animate-pulse">Fetching the words…</Label>
      </main>
    )
  }

  const timerTotal =
    view.phase === 'clue' ? (shared.settings.clueTimer ?? 0) : (shared.settings.guessTimer ?? 0)

  const miss = stage.kind === 'aftermath' && !stage.correct && stage.colour !== 'assassin'

  return (
    <>
      {player?.spymaster && player.team && <SpymasterChrome team={player.team} />}

      <motion.main
        // The knock of turning over someone else's card. Keyed off the miss
        // itself, so it runs once when the plate lands and not on any other
        // render.
        animate={miss ? {x: [0, -8, 7, -5, 3, 0]} : {x: 0}}
        transition={{duration: 0.42, ease: 'easeOut'}}
        className={cx(
          'mx-auto flex max-w-[1350px] flex-col items-center gap-4 px-4 py-6 sm:px-8',
          // The band above is 1.5rem of the page, so the screen is that much
          // shorter rather than that much taller.
          player?.spymaster ? 'min-h-[calc(100%-1.5rem)]' : 'min-h-full'
        )}
      >
        {/* Width decides it. Every board is 7:5 whatever its size, so a cap
            tied to the viewport height was the thing holding it in the middle
            of the page; the column's own max width is the only limit now. */}
        <div className="w-full">
          <Board
            view={view}
            stage={stage}
            size={shared.settings.size}
            players={shared.players}
            canGuess={player?.team === view.turn && !player?.spymaster && view.phase === 'guess'}
            spymaster={!!player?.spymaster}
          />
        </div>

        <div className="w-full max-w-3xl">
          <Hud
            view={view}
            me={player}
            deadline={shared.deadline}
            timerTotal={timerTotal}
            busy={busy}
          />
        </div>
      </motion.main>

      <AnimatePresence>
        {stage.kind === 'deal' && <Curtain key="deal" team={stage.team} />}
        {stage.kind === 'clue' && <ClueReveal key="clue" clue={stage.clue} />}
        {stage.kind === 'turn' && <TurnBand key={`turn-${stage.team}`} team={stage.team} />}
        {stage.kind === 'aftermath' && stage.colour === 'assassin' && (
          <AssassinTakeover key="assassin" />
        )}
        {stage.kind === 'aftermath' && stage.correct && (
          <BoardBreath key={`breath-${stage.card}`} team={stage.team} />
        )}
        {stage.kind === 'aftermath' && !stage.correct && stage.colour !== 'assassin' && (
          <MissFlare key={`miss-${stage.card}`} colour={stage.colour} />
        )}
      </AnimatePresence>

      {panel}
    </>
  )
}
