import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { Play } from 'iconoir-react'
import { type CSSProperties } from 'react'
import iconSection from '@/assets/figma/node-icon-section.svg'
import type { Role } from '@/data/nodes'
import { useSong } from '@/store/song'
import { NodeShell } from './NodeShell'

export const GHOST_ID = 'ghost-first-part'

export type GhostNode = Node<{ source: string; role: Role; energy: number; line: string }, 'ghost'>

/**
 * The first part, suggested beside someone's first contribution: dashed, with
 * a read of what it heard and one thing to do. Hearing it makes it real.
 */
export function GhostNode({ data, positionAbsoluteX, positionAbsoluteY }: NodeProps<GhostNode>) {
  const startFirstPart = useSong((s) => s.startFirstPart)
  const { getNode } = useReactFlow()

  return (
    <NodeShell
      width={270}
      tall
      ghost
      icon={iconSection}
      label="Verse"
      tab={
        <>
          <img src={iconSection} alt="" className="size-[15px] opacity-70" />
          <p className="type-title whitespace-nowrap text-ink-2">Verse</p>
        </>
      }
    >
      <div className="flex flex-col gap-3.5 px-3 pt-3 pb-3">
        <div className="relative" style={{ '--c': `var(--soft-role-${data.role})` } as CSSProperties}>
          <Handle type="target" id="in" position={Position.Left} isConnectable={false} className="wire-socket" />
          <span aria-hidden data-hump="" className="wire-hump opacity-60" />
          <p className="type-body pl-1 text-ink-2">{data.line}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            // The section lands where its ghost was, level with the card, so it reads as the suggestion becoming real.
            const ghost = getNode(GHOST_ID)
            const card = getNode(data.source)
            const x = ghost?.position.x ?? positionAbsoluteX
            startFirstPart(data.source, { x, y: card?.position.y ?? positionAbsoluteY }, data.role, data.energy)
          }}
          className="nodrag type-action flex h-10 items-center justify-center gap-2 rounded-full bg-ink text-on-ink transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98]"
        >
          <Play width={14} height={14} strokeWidth={1.75} />
          Hear 2 ideas
        </button>
      </div>
    </NodeShell>
  )
}
