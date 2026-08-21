import {useEffect} from 'react'
import {publishRoomToHash} from '../state/net'
import {start, useRoom} from '../state/room'
import {Diagnostics} from './Diagnostics'
import {Landing} from './screens/Landing'
import {Room} from './screens/Room'

export const App = () => {
  const {role} = useRoom()

  useEffect(() => {
    start()
    publishRoomToHash()
  }, [])

  return (
    <>
      {role === 'idle' || role === 'rejected' ? (
        <Landing needsPassword={role === 'rejected'} />
      ) : role === 'joining' ? (
        <main className="flex min-h-full items-center justify-center">
          <p className="type-mono animate-pulse text-sm text-text-dim">Connecting…</p>
        </main>
      ) : (
        <Room />
      )}
      <Diagnostics />
    </>
  )
}
