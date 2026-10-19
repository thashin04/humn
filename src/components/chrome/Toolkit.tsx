import { useReactFlow, useViewport } from '@xyflow/react'
import { AlignBottomBox, AppWindow, ChatBubbleEmpty, CursorPointer, OpenSelectHandGesture, Redo, Undo, ZoomIn, ZoomOut } from 'iconoir-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { ButtonTip } from './ButtonTip'
import { useAddNode } from './useAddNode'

const ICON = { width: 18, height: 18 }

export function Toolkit() {
  const { tool, setTool, undo, redo } = useSong()
  const canUndo = useSong((s) => s.past.length > 0)
  const canRedo = useSong((s) => s.future.length > 0)
  const add = useAddNode()

  return (
    <div className="flex h-[42px] items-center gap-2 rounded-full bg-card px-1.5 shadow-lift">
      <ToolButton label="Select" keys="V" active={tool === 'select'} onClick={() => setTool('select')}>
        <CursorPointer {...ICON} />
      </ToolButton>
      <ToolButton label="Move around" keys="H" active={tool === 'hand'} onClick={() => setTool('hand')}>
        <OpenSelectHandGesture {...ICON} />
      </ToolButton>
      <ToolButton label="Comment" keys="C" active={tool === 'comment'} onClick={() => setTool(tool === 'comment' ? 'select' : 'comment')}>
        <ChatBubbleEmpty {...ICON} />
      </ToolButton>
      <ToolButton label="Add a section" onClick={() => add('section')}>
        <AppWindow {...ICON} />
      </ToolButton>
      <Sep />
      <ToolButton label="Undo" keys="⌘Z" onClick={undo} disabled={!canUndo}>
        <Undo {...ICON} />
      </ToolButton>
      <ToolButton label="Redo" keys="⇧⌘Z" onClick={redo} disabled={!canRedo}>
        <Redo {...ICON} />
      </ToolButton>
      <Sep />
      <Zoom />
      <Sep />
      <TimelineToggle />
    </div>
  )
}

/** Zooming the canvas: out, how far in it is now (press it to fit everything), and in. */
function Zoom() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  return (
    <>
      <ToolButton label="Zoom out" keys="−" onClick={() => zoomOut({ duration: 200 })}>
        <ZoomOut {...ICON} />
      </ToolButton>
      <ButtonTip label="Zoom to fit" keys="⇧1">
      <button
        type="button"
        aria-label={`Zoom ${Math.round(zoom * 100)}%, zoom to fit`}
        onClick={() => fitView({ padding: 0.25, maxZoom: 1, duration: 300 })}
        className="h-[30px] w-12 rounded-full font-mono text-[11.5px] text-ink-2 tabular-nums transition-colors hover:bg-well hover:text-ink-1"
      >
        {Math.round(zoom * 100)}%
      </button>
      </ButtonTip>
      <ToolButton label="Zoom in" keys="+" onClick={() => zoomIn({ duration: 200 })}>
        <ZoomIn {...ICON} />
      </ToolButton>
    </>
  )
}

/** Opens the timeline under the canvas, or puts it away. Labelled, since it's the way into the song in time. */
function TimelineToggle() {
  const open = useSong((s) => s.timelineOpen)
  const toggle = useSong((s) => s.toggleTimeline)
  return (
    <ButtonTip label={open ? 'Hide the timeline' : 'See the song in time'}>
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
      <AlignBottomBox width={16} height={16} />
      Timeline
    </button>
    </ButtonTip>
  )
}

function ToolButton({
  label,
  keys,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string
  /** The shortcut, shown in the tooltip. */
  keys?: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <ButtonTip label={label} keys={keys}>
    <button
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
    </ButtonTip>
  )
}

function Sep() {
  return <span className="mx-0.5 h-[18px] w-px bg-rule" />
}
