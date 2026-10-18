import { BaseEdge, type ConnectionLineComponentProps, type EdgeProps } from '@xyflow/react'
import { DEFAULT_ROLE, ROLES, type AnySongNode, type Kind, type Pipe, type Role } from '@/data/nodes'
import { useSong } from '@/store/song'
import { pipeColour, pipePath, PLUG_REACH, STUB } from './pipePath'

const MATERIAL = { filter: 'drop-shadow(0 1px 1.5px rgb(20 22 26 / 0.1)) drop-shadow(0 0 0.5px rgb(20 22 26 / 0.13))' }

/**
 * Pipes into the same section each get their own lane, so they fan out
 * instead of stacking: the top role takes the lane furthest out.
 */
function useLane(edge: Pick<Pipe, 'id' | 'target'>) {
  return useSong((s) => {
    const into = s.edges.filter((e) => e.target === edge.target && e.data?.role)
    const y = (id: string) => s.nodes.find((n) => n.id === id)?.position.y ?? 0
    const row = (r?: Role) => ROLES.findIndex((x) => x.id === r)
    into.sort((a, b) => row(a.data?.role) - row(b.data?.role) || y(a.source) - y(b.source))
    const i = into.findIndex((e) => e.id === edge.id)
    return i < 0 ? null : into.length - 1 - i
  })
}

/** True while this pipe feeds (or comes out of) the section of the take that's playing. */
function useFlowing(edge: Pick<Pipe, 'source' | 'target'>) {
  return useSong((s) => {
    const take = s.playing ? s.nodes.find((n) => n.id === s.playing) : undefined
    if (take?.type !== 'take') return false
    return edge.target === take.data.sectionId || (edge.source === take.data.sectionId && edge.target === take.id)
  })
}

export function PipeEdge({ id, source, target, sourceX, sourceY, targetX, targetY, data }: EdgeProps<Pipe>) {
  const role = data?.role
  const fromLane = useLane({ id, target })
  const flowing = useFlowing({ source, target })

  const sx = role ? sourceX - STUB : sourceX
  const tx = role ? targetX + 2 : targetX
  const lane = fromLane === null ? undefined : tx - PLUG_REACH - 18 - fromLane * 18
  const d = pipePath(sx, sourceY, tx, targetY, lane)

  return (
    <>
      <path d={d} fill="none" stroke="var(--soft-card)" strokeWidth={8} style={MATERIAL} />
      <BaseEdge
        id={id}
        path={d}
        interactionWidth={16}
        className={flowing ? 'pipe-core pipe-flow' : 'pipe-core'}
        style={{ stroke: pipeColour(role), strokeWidth: 1.6, strokeLinecap: 'round' }}
      />
    </>
  )
}

/** The pipe while you pull it: in the role it'll plug into, or the node's own role until then. */
export function PipeConnectionLine({ fromNode, fromX, fromY, toX, toY, toHandle }: ConnectionLineComponentProps<AnySongNode>) {
  const role = (toHandle?.id as Role | undefined) ?? DEFAULT_ROLE[fromNode.type as Kind]
  const d = pipePath(fromX - STUB, fromY, toHandle ? toX + 2 : toX, toY)
  return (
    <g>
      <path d={d} fill="none" stroke="var(--soft-card)" strokeWidth={8} style={MATERIAL} />
      <path d={d} fill="none" stroke={pipeColour(role)} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  )
}
