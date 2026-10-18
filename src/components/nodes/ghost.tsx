import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { Plus } from 'iconoir-react'
import { type CSSProperties } from 'react'
import iconSection from '@/assets/figma/node-icon-section.svg'
import type { Role } from '@/data/nodes'
import { useSong } from '@/store/song'
import { NodeShell } from './NodeShell'

export const GHOST_ID = 'ghost-first-part'

export type GhostNode = Node<{ source: string | null; role: Role; energy: number }, 'ghost'>

/**
 * The first part, suggested beside someone's first contribution: dashed, with
 * a line on what a verse is and one thing to do. Creating it makes it real.
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
          {/* Only plugged in while it's suggesting one card. */}
          {data.source && (
            <>
              <Handle type="target" id="in" position={Position.Left} isConnectable={false} className="wire-socket" />
              <span aria-hidden data-hump="" className="wire-hump opacity-60" />
            </>
          )}
          <p className="type-body pl-1 text-ink-2">The part of a song where the story unfolds. What you plug in shapes how it sounds.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            // The section lands where its ghost was, level with the card, so it reads as the suggestion becoming real.
            const ghost = getNode(GHOST_ID)
            const card = data.source ? getNode(data.source) : undefined
            const x = ghost?.position.x ?? positionAbsoluteX
            startFirstPart(data.source, { x, y: card?.position.y ?? ghost?.position.y ?? positionAbsoluteY }, data.role, data.energy)
          }}
          className="nodrag type-action flex h-10 items-center justify-center gap-2 rounded-full bg-ink text-on-ink transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98]"
        >
          <Plus width={15} height={15} strokeWidth={1.75} />
          Create
        </button>
      </div>
    </NodeShell>
  )
}
