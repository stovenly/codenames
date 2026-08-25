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
import {useBoardFit} from '../board/fit'
import {TeamFlank} from '../hud/TeamFlank'
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
  const {ref: boardArea, fit} = useBoardFit(shared?.settings.size ?? 5)
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
          size={shared.settings.size}
          steps={shared.steps.slice(0, shownCursor)}
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
  const flanks = !!fit?.flanks
  const flankWidth = fit?.flankWidth ?? 0
  const overhang = fit?.overhang ?? 0

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
          'mx-auto flex max-w-[1600px] flex-col items-center gap-4 px-4 py-6 sm:px-8',
          '[@media(max-height:760px)]:gap-2 [@media(max-height:760px)]:py-3',
          // The band above is 1.5rem of the page, so the screen is that much
          // shorter rather than that much taller.
          player?.spymaster ? 'h-[calc(100%-1.5rem)]' : 'h-full'
        )}
      >
        {/* Everything else is shrink-0, so this is the one elastic thing on the
            screen: the board takes whatever height the HUD leaves. */}
        <div ref={boardArea} className="relative min-h-0 w-full flex-1">
          <Board
            view={view}
            stage={stage}
            size={shared.settings.size}
            players={shared.players}
            canGuess={player?.team === view.turn && !player?.spymaster && view.phase === 'guess'}
            spymaster={!!player?.spymaster}
            width={fit?.width ?? null}
          />

          {/* Absolute, so a roster can never take width off the board it is
              measured against. */}
          {flanks &&
            (['red', 'blue'] as const).map(team => (
              <div
                key={team}
                className="absolute inset-y-0 flex items-center"
                style={
                  team === 'red'
                    ? {left: -overhang, width: flankWidth, paddingRight: 10}
                    : {right: -overhang, width: flankWidth, paddingLeft: 10}
                }
              >
                <TeamFlank
                  players={shared.players}
                  team={team}
                  me={me}
                  layout="column"
                  align={team === 'red' ? 'right' : 'left'}
                  withNames
                />
              </div>
            ))}
        </div>

        {/* The rail is fixed to the bottom-left corner, and reaches the HUD only
            on a window too narrow to hold it clear. A width, so that nothing the
            rosters do can change this height. */}
        <div className="w-full max-w-3xl shrink-0 max-[1167px]:pb-14">
          <Hud
            view={view}
            me={player}
            deadline={shared.deadline}
            timerTotal={timerTotal}
            busy={busy}
            players={shared.players}
            rosters={flanks ? 'flanks' : 'hud'}
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
