import { ArrowUp, Check } from 'iconoir-react'
import { useEffect, useRef, useState } from 'react'
import { collaborator, ME } from '@/data/collaborators'
import { cn } from '@/lib/utils'
import { useSong, type SongComment } from '@/store/song'

function ago(at: number) {
  const m = Math.round((Date.now() - at) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

/**
 * A comment's marker: the author's face in a speech-bubble shape, its point at
 * the bottom-left on the spot it's about.
 */
export function Pin({
  author,
  open,
  onClick,
  onDrag,
}: {
  author: string
  open?: boolean
  onClick?: () => void
  /** Called as the pin is dragged, with how far it's moved in screen pixels since the press. */
  onDrag?: (dx: number, dy: number) => void
}) {
  const c = collaborator(author)
  // A press that moves drags the pin; one that doesn't opens it.
  const dragged = useRef(false)
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        if (!onDrag || e.button !== 0) return
        e.stopPropagation()
        const x0 = e.clientX
        const y0 = e.clientY
        dragged.current = false
        const move = (ev: PointerEvent) => {
          const dx = ev.clientX - x0
          const dy = ev.clientY - y0
          if (!dragged.current && Math.hypot(dx, dy) < 3) return
          dragged.current = true
          onDrag(dx, dy)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true })
      }}
      onClick={() => {
        if (!dragged.current) onClick?.()
        dragged.current = false
      }}
      aria-label={`Comment from ${c.name}`}
      className={cn(
        'nodrag nopan flex size-7 touch-none items-center justify-center rounded-full rounded-bl-[3px] border-2 border-card text-[11px] font-semibold text-on-ink shadow-lift transition-transform duration-200 ease-spring hover:scale-110',
        open && 'scale-110',
      )}
      style={{ background: c.color }}
    >
      {c.initial}
    </button>
  )
}

/** The card beside an open pin: who said what, and a way to clear it once it's dealt with. */
export function Thread({ comment }: { comment: SongComment }) {
  const resolve = useSong((s) => s.resolveComment)
  const c = collaborator(comment.author)
  return (
    <div className="nodrag nopan nowheel w-[240px] animate-node-enter rounded-[14px] bg-card p-3 text-left shadow-lift">
      <div className="flex items-center gap-2">
        <p className="type-caption font-medium text-ink-1">{c.name}</p>
        <p className="type-small flex-1 text-ink-3">{ago(comment.at)}</p>
        <button
          type="button"
          title="Resolve"
          aria-label="Resolve comment"
          onClick={() => resolve(comment.id)}
          className="flex size-7 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-well hover:text-ink-1"
        >
          <Check width={15} height={15} strokeWidth={1.8} />
        </button>
      </div>
      <p className="type-body mt-1 break-words whitespace-pre-wrap text-ink-1">{comment.text}</p>
    </div>
  )
}

/** Writing a new comment: Enter posts it, Escape lets it go. */
export function Composer({ onPost, onCancel }: { onPost: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  const ready = text.trim().length > 0
  // Focus once the press that opened it has finished, or the press takes the focus back.
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const t = setTimeout(() => field.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) onPost(text.trim())
      }}
      className="nodrag nopan nowheel flex w-[260px] animate-node-enter items-end gap-2 rounded-[14px] bg-card p-1.5 pl-3 shadow-lift"
    >
      <textarea
        ref={field}
        rows={1}
        value={text}
        placeholder="Add a comment"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (ready) onPost(text.trim())
          }
        }}
        className="type-body field-sizing-content max-h-32 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-ink-1 outline-none placeholder:text-ink-3"
      />
      <button
        type="submit"
        aria-label="Post comment"
        disabled={!ready}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-on-ink transition-opacity disabled:opacity-25"
      >
        <ArrowUp width={15} height={15} strokeWidth={2} />
      </button>
    </form>
  )
}

/** A pin and whatever opens beside it. Placed with its point on (0, 0). */
export function PinWithCard({
  comment,
  open,
  onToggle,
  onDrag,
}: {
  comment: SongComment
  open: boolean
  onToggle: () => void
  onDrag?: (dx: number, dy: number) => void
}) {
  return (
    <div className="relative" style={{ transform: 'translateY(-100%)' }}>
      <Pin author={comment.author} open={open} onClick={onToggle} onDrag={onDrag} />
      {open && (
        <div className="absolute top-0 left-9 z-10">
          <Thread comment={comment} />
        </div>
      )}
    </div>
  )
}

/** Where a new comment is going, with the box to write it in. */
export function DraftPin({ onPost, onCancel }: { onPost: (text: string) => void; onCancel: () => void }) {
  return (
    <div className="relative" style={{ transform: 'translateY(-100%)' }}>
      <Pin author={ME} open />
      <div className="absolute top-0 left-9 z-10">
        <Composer onPost={onPost} onCancel={onCancel} />
      </div>
    </div>
  )
}
