import type { Edge, EdgeProps } from '@xyflow/react'
import type { Role } from '@/data/nodes'
import { curve, RING_IN, RING_OUT } from './geometry'

export type GhostEdge = Edge<{ role: Role }, 'ghost'>

/** The suggested connection to a ghost: dashed, drifting slowly toward it, not yet real. */
export function GhostEdge({ sourceX, sourceY, targetX, targetY, data }: EdgeProps<GhostEdge>) {
  const { d } = curve({ x: sourceX + RING_OUT, y: sourceY }, { x: targetX + RING_IN, y: targetY })
  return (
    <path
      d={d}
      fill="none"
      stroke={`var(--soft-role-${data?.role ?? 'intent'})`}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeDasharray="4 7"
      className="ghost-flow"
    />
  )
}
