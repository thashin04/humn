import { QuestionMark, Xmark } from 'iconoir-react'
import { useEffect, useState } from 'react'
import scrim from '@/assets/figma/scrim.svg'
import { ButtonTip } from './ButtonTip'

const STEPS = [
  { title: 'Add what you have', body: 'Pick something from the left: a few words, your voice, a photo, a sound, a colour or an instrument.' },
  { title: 'Plug it into a section', body: 'Drag from a card’s dot into a verse or chorus. What you plug in shapes how that part sounds.' },
  { title: 'Hear it, then keep going', body: 'Regenerate a section to hear two ideas. Add the one you like to the timeline, then change things and listen again.' },
]

const KEYS: [string, string][] = [
  ['Select', 'V'],
  ['Move around', 'H'],
  ['Comment', 'C'],
  ['Undo', '⌘Z'],
  ['Redo', '⇧⌘Z'],
  ['Zoom in / out', '+ −'],
  ['Zoom to fit', '⇧1'],
]

/** A round button in the canvas's corner that opens a short guide to the canvas, over a dimmed page. */
export function Help() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <ButtonTip label="Help" side="left">
        <button
          type="button"
          aria-label="Help"
          onClick={() => setOpen(true)}
          className="flex size-[42px] items-center justify-center rounded-full bg-card text-ink-1 shadow-lift transition-transform duration-150 hover:scale-[1.04] active:scale-95"
        >
          <QuestionMark width={18} height={18} />
        </button>
      </ButtonTip>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <img src={scrim} alt="" className="absolute inset-0 size-full max-w-none" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="relative flex w-[560px] max-w-full flex-col gap-6 rounded-[20px] bg-card px-8 pt-7 pb-8 shadow-lift"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h2 id="help-title" className="type-display text-ink">
                  How humn works
                </h2>
                <p className="type-doc text-ink-2">Your song grows from what you bring to it.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                autoFocus
                onClick={() => setOpen(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-well"
              >
                <Xmark width={18} height={18} />
              </button>
            </div>

            <ol className="flex flex-col gap-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-well font-mono text-[12px] text-ink-2">{i + 1}</span>
                  <div className="flex flex-col gap-1 pt-0.5">
                    <p className="type-title font-medium text-ink">{step.title}</p>
                    <p className="type-body text-ink-2">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-2.5 border-t border-rule pt-5">
              <p className="type-caption text-ink-3">Shortcuts</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {KEYS.map(([label, keys]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="type-body text-ink-1">{label}</span>
                    <span className="font-mono text-[12px] text-ink-3">{keys}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
