import { AlignBottomBox, ChatBubbleEmpty, CursorPointer, Redo, Undo } from 'iconoir-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'

const ICON = { width: 18, height: 18, strokeWidth: 1.5 }

export function Toolkit() {
  const { tool, setTool, undo, redo } = useSong()
  const canUndo = useSong((s) => s.past.length > 0)
  const canRedo = useSong((s) => s.future.length > 0)

  return (
    <div className="flex h-[42px] items-center gap-2 rounded-full bg-card px-1.5 shadow-lift">
      <ToolButton label="Select (V)" active={tool === 'select'} onClick={() => setTool('select')}>
        <CursorPointer {...ICON} />
      </ToolButton>
      <ToolButton label="Comment (C)" active={tool === 'comment'} onClick={() => setTool(tool === 'comment' ? 'select' : 'comment')}>
        <ChatBubbleEmpty {...ICON} />
      </ToolButton>
      <Sep />
      <ToolButton label="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
        <Undo {...ICON} />
      </ToolButton>
      <ToolButton label="Redo (⇧⌘Z)" onClick={redo} disabled={!canRedo}>
        <Redo {...ICON} />
      </ToolButton>
      <Sep />
      <TimelineToggle />
    </div>
  )
}

/** Opens the timeline under the canvas, or puts it away. Labelled, since it's the way into the song in time. */
function TimelineToggle() {
  const open = useSong((s) => s.timelineOpen)
  const toggle = useSong((s) => s.toggleTimeline)
  return (
    <button
      type="button"
      aria-pressed={open}
      aria-label={open ? 'Hide timeline' : 'Show timeline'}
      onClick={toggle}
      className={cn(
        'type-caption flex h-[30px] items-center gap-1.5 rounded-full pr-3 pl-2.5 transition-[background-color,color,transform] duration-200 ease-soft active:scale-95',
        open ? 'bg-ink text-on-ink' : 'text-ink-2 hover:bg-well hover:text-ink-1',
      )}
    >
      <AlignBottomBox width={16} height={16} strokeWidth={1.5} />
      Timeline
    </button>
  )
}

function ToolButton({
  label,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex size-[30px] items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 ease-soft active:scale-95',
        active ? 'bg-ink text-on-ink' : 'text-ink-2 enabled:hover:bg-well enabled:hover:text-ink-1 disabled:text-ink-4',
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="mx-0.5 h-[18px] w-px bg-rule" />
}
