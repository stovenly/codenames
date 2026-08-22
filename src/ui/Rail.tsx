import {AnimatePresence, motion} from 'motion/react'
import {MessageSquare, ScrollText, Settings} from 'lucide-react'
import {useEffect, useState} from 'react'
import {unread, startChat, useChat} from '../state/chat'
import {readLog} from '../game/log'
import {useRoom} from '../state/room'
import {useTheatre} from '../state/theatre'
import * as words from '../state/words'
import {Chat} from './Chat'
import {MuteToggle} from './Controls'
import {SettingsSheet} from './Diagnostics'
import {History} from './hud/History'
import {Heading, IconButton, Panel} from './atoms'
import {spring} from './motion'

type Sheet = 'settings' | 'log' | 'chat' | null

/**
 * The corner rail, and the one sheet it can have open. One at a time: two
 * panels stacked in the same corner is two panels nobody can read.
 */
export const Rail = () => {
  const [open, setOpen] = useState<Sheet>(null)
  const {shared} = useRoom()
  const {shownCursor} = useTheatre()
  // Subscribed so the unread badge updates; the pane reads the log itself.
  useChat()
  words.useWords()

  useEffect(startChat, [])

  const waiting = open === 'chat' ? 0 : unread()

  const playing = !!shared && shared.steps.length > 0
  const toggle = (sheet: Sheet) => setOpen(v => (v === sheet ? null : sheet))

  const entries =
    playing && shared
      ? readLog(shared.settings, words.get(shared.settings.wordListHash), shared.steps, shownCursor)
      : []

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
        <IconButton
          label="Settings"
          aria-expanded={open === 'settings'}
          active={open === 'settings'}
          onClick={() => toggle('settings')}
          className="backdrop-blur"
        >
          <Settings className="size-4" />
        </IconButton>

        <MuteToggle />

        {playing && (
          <IconButton
            label="What has happened"
            aria-expanded={open === 'log'}
            active={open === 'log'}
            onClick={() => toggle('log')}
            className="backdrop-blur"
          >
            <ScrollText className="size-4" />
          </IconButton>
        )}

        {!!shared && (
          <IconButton
            label={waiting ? `Chat, ${waiting} unread` : 'Chat'}
            aria-expanded={open === 'chat'}
            active={open === 'chat'}
            onClick={() => toggle('chat')}
            className="relative backdrop-blur"
          >
            <MessageSquare className="size-4" />
            {waiting > 0 && (
              <span className="type-label absolute -top-1.5 -right-1.5 grid min-w-4 place-items-center rounded-full bg-lamp-500 px-1 text-[10px] text-stage-900">
                {waiting > 9 ? '9+' : waiting}
              </span>
            )}
          </IconButton>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key={open}
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 12}}
            transition={spring.firm}
            className="fixed bottom-16 left-4 z-40 w-[min(92vw,25rem)]"
          >
            {open === 'settings' ? (
              <SettingsSheet onClose={() => setOpen(null)} />
            ) : open === 'chat' ? (
              <Chat />
            ) : (
              <Panel level={2} className="max-h-[70vh] overflow-y-auto p-4 backdrop-blur">
                <Heading>What has happened</Heading>
                <div className="mt-3">
                  <History entries={entries} players={shared?.players ?? []} />
                </div>
              </Panel>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
