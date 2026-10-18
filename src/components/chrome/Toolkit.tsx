import { ChatBubbleEmpty, CursorPointer, Redo, Undo } from 'iconoir-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSong, type View } from '@/store/song'

const ICON = { width: 18, height: 18, strokeWidth: 1.5 }

export function Toolkit() {
  const { tool, setTool } = useSong()

  return (
    <div className="flex h-[42px] items-center gap-2 rounded-full bg-card px-1.5 shadow-lift">
      <ToolButton label="Select" active={tool === 'select'} onClick={() => setTool('select')}>
        <CursorPointer {...ICON} />
      </ToolButton>
      <ToolButton label="Comment">
        <ChatBubbleEmpty {...ICON} />
      </ToolButton>
      <Sep />
      <ToolButton label="Undo">
        <Undo {...ICON} />
      </ToolButton>
      <ToolButton label="Redo">
        <Redo {...ICON} />
      </ToolButton>
      <Sep />
      <ViewSwitch />
    </div>
  )
}

const VIEWS: { id: View; label: string }[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'timeline', label: 'Timeline' },
]

/** The same song two ways: what feeds what, or when it plays. The thumb slides between them. */
function ViewSwitch() {
  const { view, setView } = useSong()
  return (
    <div role="radiogroup" aria-label="View" className="relative grid h-[30px] grid-cols-2 rounded-full bg-well p-[3px]">
      <span
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-card shadow-lift transition-transform duration-300 ease-spring"
        style={{ transform: view === 'timeline' ? 'translateX(100%)' : undefined }}
      />
      {VIEWS.map((v) => (
        <button
          key={v.id}
          role="radio"
          aria-checked={view === v.id}
          onClick={() => setView(v.id)}
          className={cn(
            'type-caption relative w-[72px] rounded-full transition-colors duration-200',
            view === v.id ? 'text-ink-1' : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {v.label}
        </button>
      ))}
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
