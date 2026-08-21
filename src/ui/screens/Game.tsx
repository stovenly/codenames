import {AnimatePresence} from 'motion/react'
import {useEffect} from 'react'
import {derive} from '../../game/reducer'
import {startPresence} from '../../state/presence'
import {useRoom} from '../../state/room'
import {useTheatre} from '../../state/theatre'
import * as words from '../../state/words'
import {Board} from '../board/Board'
import {HostPanel} from '../host/HostPanel'
import {ClueReveal, TurnBand} from '../hud/ClueReveal'
import {Hud} from '../hud/Hud'
import {AssassinTakeover, BoardBreath, SpymasterChrome} from '../hud/Overlays'
import {unlockAudio} from '../sound/audio'
import {GameOver} from './GameOver'

export const Game = () => {
  const {shared, role, me} = useRoom()
  const {shownCursor, stage} = useTheatre()
  words.useWords()

  useEffect(() => {
    startPresence()
    unlockAudio()
  }, [])

  if (!shared) return null

  const list = words.get(shared.settings.wordListHash)
  const view = derive(shared.settings, list, shared.steps, shownCursor)
  const player = shared.players.find(p => p.id === me) ?? null
  const isHost = role === 'host'
  const busy = stage.kind !== 'idle' && stage.kind !== 'finish'

  if (stage.kind === 'finish' || (view.phase === 'gameover' && stage.kind === 'idle')) {
    return (
      <>
        <GameOver view={view} me={player} isHost={isHost} />
        {isHost && <HostPanel />}
      </>
    )
  }

  if (!list.length) {
    return (
      <main className="grid min-h-full place-items-center">
        <p className="type-mono animate-pulse text-sm text-text-dim">Fetching the word list…</p>
      </main>
    )
  }

  const timerTotal =
    view.phase === 'clue' ? (shared.settings.clueTimer ?? 0) : (shared.settings.guessTimer ?? 0)

  return (
    <>
      {player?.spymaster && <SpymasterChrome />}

      <main className="mx-auto flex min-h-full max-w-5xl flex-col items-center gap-4 px-3 py-8 sm:px-6">
        <div className="w-full" style={{maxWidth: 'min(92vw, 78vh)'}}>
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
        {stage.kind === 'clue' && <ClueReveal key="clue" clue={stage.clue} />}
        {stage.kind === 'turn' && <TurnBand key={`turn-${stage.team}`} team={stage.team} />}
        {stage.kind === 'aftermath' && stage.colour === 'assassin' && <AssassinTakeover key="assassin" />}
        {stage.kind === 'aftermath' && stage.correct && (
          <BoardBreath key={`breath-${stage.card}`} team={stage.team} />
        )}
      </AnimatePresence>

      {isHost && <HostPanel />}
    </>
  )
}
