import {AnimatePresence} from 'motion/react'
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
import {AssassinTakeover, BoardBreath, SpymasterChrome} from '../hud/Overlays'
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

  if (!shared) return null

  const list = words.get(shared.settings.wordListHash)
  const view = derive(shared.settings, list, shared.steps, shownCursor)
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

  return (
    <>
      {player?.spymaster && <SpymasterChrome />}

      <main className="mx-auto flex min-h-full max-w-5xl flex-col items-center gap-4 px-3 py-8 sm:px-6">
        <div className="w-full" style={{maxWidth: 'min(94vw, 74vh)'}}>
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
            size={shared.settings.size}
          />
        </div>
      </main>

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
      </AnimatePresence>

      {panel}
    </>
  )
}
