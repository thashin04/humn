import { PanelBottom } from 'lucide-react'
import type { ReactNode } from 'react'
import comment from '@/assets/figma/tool-comment.svg'
import hand from '@/assets/figma/tool-hand.svg'
import select from '@/assets/figma/tool-select.svg'
import undo from '@/assets/figma/tool-undo.svg'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'

export function Toolkit() {
  const { tool, setTool, timelineOpen, toggleTimeline } = useSong()

  return (
    <div className="flex h-[42px] items-center gap-1 rounded-full bg-card px-1.5 shadow-lift">
      <ToolButton label="Select" active={tool === 'select'} onClick={() => setTool('select')}>
        <img src={select} alt="" />
      </ToolButton>
      <ToolButton label="Pan" active={tool === 'hand'} onClick={() => setTool('hand')}>
        <img src={hand} alt="" />
      </ToolButton>
      <ToolButton label="Comment">
        <img src={comment} alt="" />
      </ToolButton>
      <Sep />
      <ToolButton label="Undo">
        <img src={undo} alt="" />
      </ToolButton>
      <ToolButton label="Redo">
        <img src={undo} alt="" className="-scale-x-100" />
      </ToolButton>
      <Sep />
      <ToolButton label="Timeline" active={timelineOpen} onClick={toggleTimeline}>
        <PanelBottom className="size-4 text-ink-2" strokeWidth={1.5} />
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
        'flex size-[30px] items-center justify-center rounded-full border border-transparent hover:bg-well',
        active && 'border-rule bg-well',
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="h-[18px] w-px bg-rule" />
}
