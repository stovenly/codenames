import {useMemo, useState} from 'react'
import {cardCount, type BoardSize} from '../../game/settings'
import {MAX_CUSTOM_ENTRIES, validateCustom} from '../../game/wordlist'
import {setWordSource} from '../../state/room'
import * as words from '../../state/words'
import {Button, BrassRule} from '../atoms'

export const CustomWordList = ({size}: {size: BoardSize}) => {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  words.useWords()

  const report = useMemo(() => validateCustom(text), [text])
  const needed = cardCount(size)
  const saved = words.readCustom()
  const canSave = !report.fatal && report.accepted.length >= needed && name.trim().length > 0

  const save = () => {
    if (!canSave) return
    const label = name.trim()
    words.saveCustom(label, report.accepted)
    void setWordSource({kind: 'custom', name: label}, label)
    setText('')
    setName('')
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-ink-600 bg-ink-900/60 p-3">
      {saved.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="type-mono text-[11px] text-text-dim">Saved lists</span>
          <div className="flex flex-wrap gap-1">
            {saved.map(list => (
              <span key={list.name} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={list.words.length < needed}
                  title={
                    list.words.length < needed
                      ? `${list.words.length} words, needs ${needed}`
                      : `${list.words.length} words`
                  }
                  onClick={() => void setWordSource({kind: 'custom', name: list.name}, list.name)}
                  className="type-mono cursor-pointer rounded-md border border-ink-600 px-2 py-1 text-[11px] text-text-dim hover:border-brass-400/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {list.name}
                  <span className="ml-1 opacity-60">{list.words.length}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${list.name}`}
                  onClick={() => words.deleteCustom(list.name)}
                  className="type-mono cursor-pointer px-1 text-[11px] text-text-dim hover:text-red-glow"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <BrassRule className="my-1" />
        </div>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        placeholder={`One word per line, up to ${MAX_CUSTOM_ENTRIES}`}
        className="type-mono resize-y rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-xs text-text placeholder:text-text-dim/50"
      />

      {text.trim() && (
        <div className="flex flex-col gap-1 text-[11px]">
          <p className="type-mono text-text-dim">
            {report.accepted.length} accepted
            {report.droppedDuplicate > 0 && `, ${report.droppedDuplicate} duplicate`}
            {report.droppedBlank > 0 && `, ${report.droppedBlank} blank`}
            {report.rejected.length > 0 && `, ${report.rejected.length} rejected`}
            {' · '}
            <span className={report.accepted.length < needed ? 'text-red-glow' : 'text-brass-200'}>
              need {needed} for {size}×{size}
            </span>
          </p>
          {report.fatal && <p className="type-mono text-red-glow">{report.fatal}</p>}
          {report.rejected.slice(0, 4).map((r, i) => (
            <p key={i} className="type-mono text-red-glow/80">
              {r.entry} — {r.reason}
            </p>
          ))}
          {report.warnings.slice(0, 2).map((w, i) => (
            <p key={i} className="type-mono text-brass-200/80">
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={24}
          placeholder="Name this list"
          className="type-mono min-w-0 flex-1 rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-xs text-text placeholder:text-text-dim/50"
        />
        <Button variant="ghost" onClick={save} disabled={!canSave}>
          Save & use
        </Button>
      </div>
    </div>
  )
}
