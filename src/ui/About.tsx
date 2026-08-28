import {AnimatePresence, motion} from 'motion/react'
import {useEffect, useRef, useState} from 'react'
import {IconButton, Panel} from './atoms'
import {spring} from './motion'

const HEART = `${import.meta.env.BASE_URL}heart.png`

const link = 'text-gold-200 underline decoration-gold-500/40 underline-offset-2 hover:text-lamp-300'

const Out = ({href, children}: {href: string; children: React.ReactNode}) => (
  <a href={href} target="_blank" rel="noreferrer noopener" className={link}>
    {children}
  </a>
)

export const About = () => {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    addEventListener('pointerdown', away)
    addEventListener('keydown', escape)
    return () => {
      removeEventListener('pointerdown', away)
      removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div ref={box} className="fixed right-4 bottom-4 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 12}}
            transition={spring.firm}
            className="absolute right-0 bottom-12 w-max"
          >
            <Panel level={2} className="flex flex-col gap-3 px-6 py-5 text-right backdrop-blur">
              <p className="type-read flex items-center justify-end gap-2 text-base text-text-dim">
                <span>
                  Made by <Out href="https://stovenly.com/games/codenames/">stovenly</Out>
                </span>
                <img src={HEART} alt="" className="h-[1.9em] w-auto" />
              </p>
              <p className="type-read text-base text-text-dim">
                <Out href="https://github.com/stovenly/codenames/blob/main/CREDITS.md">Credits</Out>
              </p>
              <p className="type-read text-base text-text-dim">
                <Out href="https://github.com/stovenly/codenames">Source code</Out>
              </p>
              <p className="type-read text-base text-text-dim">
                <Out href="https://github.com/stovenly/codenames/issues/new">Report an issue</Out>
              </p>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <IconButton
        label="About"
        aria-expanded={open}
        active={open}
        onClick={() => setOpen(v => !v)}
        className="backdrop-blur"
      >
        <span aria-hidden className="type-marquee text-lg leading-none">?</span>
      </IconButton>
    </div>
  )
}
