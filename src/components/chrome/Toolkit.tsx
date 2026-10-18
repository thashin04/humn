import { AlignBottomBox, AppWindow, ChatBubbleEmpty, CursorPointer, Redo, Undo } from 'iconoir-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { useAddNode } from './useAddNode'

const ICON = { width: 18, height: 18, strokeWidth: 1.5 }

export function Toolkit() {
  const { tool, setTool, timelineOpen, toggleTimeline } = useSong()
  const add = useAddNode()

  return (
    <div className="flex h-[42px] items-center gap-2 rounded-full bg-card px-1.5 shadow-lift">
      <ToolButton label="Select" active={tool === 'select'} onClick={() => setTool('select')}>
        <CursorPointer {...ICON} />
      </ToolButton>
      <ToolButton label="Comment">
        <ChatBubbleEmpty {...ICON} />
      </ToolButton>
      <ToolButton label="Add a section" onClick={() => add('section')}>
        <AppWindow {...ICON} />
      </ToolButton>
      <Sep />
      <ToolButton label="Undo">
        <Undo {...ICON} />
      </ToolButton>
      <ToolButton label="Redo">
        <Redo {...ICON} />
      </ToolButton>
      <Sep />
      <ToolButton label="Timeline" active={timelineOpen} onClick={toggleTimeline}>
        <AlignBottomBox {...ICON} />
      </ToolButton>
    </div>
  )
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex size-[30px] items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 ease-soft active:scale-95',
        active ? 'bg-ink text-on-ink' : 'text-ink-2 hover:bg-well hover:text-ink-1',
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="mx-0.5 h-[18px] w-px bg-rule" />
}
