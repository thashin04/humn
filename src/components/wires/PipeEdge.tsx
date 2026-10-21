import { type Edge, type EdgeProps } from '@xyflow/react'
import { type Role } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { pipe, PIPE, RING_IN, RING_OUT } from './geometry'

/** A card plugged into a section socket (`role`), or a section's wire out to its take (no role). */
export type PipeEdge = Edge<{ role?: Role; lane?: number }, 'pipe' | 'pipeBody' | 'pipeEdge'>

function route({ sourceX, sourceY, targetX, targetY, data }: Pick<EdgeProps<PipeEdge>, 'sourceX' | 'sourceY' | 'targetX' | 'targetY' | 'data'>) {
  return data?.role
    ? pipe({ x: sourceX + RING_OUT, y: sourceY }, { x: targetX + RING_IN, y: targetY }, data.lane)
    : pipe({ x: sourceX, y: sourceY }, { x: targetX, y: targetY })
}

/**
 * A pipe is drawn in three passes across every wire: all the hairline edges,
 * then all the strips of card material, then all the lines. So where pipes
 * cross or merge into a shared lane, their strips join into one piece and
 * every line stays on top, connected.
 */
export function PipeEdgeLine(props: EdgeProps<PipeEdge>) {
  return (
    <path
      d={route(props).d}
      fill="none"
      // Solid, so overlapping edges don't darken; the same tone as a card's hairline.
      stroke="color-mix(in srgb, var(--soft-ink) 15%, var(--soft-ground))"
      strokeWidth={PIPE + 1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

export function PipeBody(props: EdgeProps<PipeEdge>) {
  return <path d={route(props).d} fill="none" stroke="var(--soft-card)" strokeWidth={PIPE} strokeLinecap="round" strokeLinejoin="round" />
}

/**
 * A plugged-in card: one line in the socket's colour, from the ring on the
 * card's hump to the ring on the section's. It runs under the cards, so it
 * reads as coming out of one and into the other. A fresh connection sends one
 * soft pulse along it. (Demo: no label on hover; a card unplugs from its own
 * fan of actions.)
 */
export function PipeEdge({ id, source, target, sourceX, sourceY, targetX, targetY, data }: EdgeProps<PipeEdge>) {
  const { d } = route({ sourceX, sourceY, targetX, targetY, data })
  const fresh = useSong((s) => s.fresh?.id === id)
  const flowing = useFlowing(source, target)
  const color = data?.role ? `var(--soft-role-${data.role})` : 'var(--soft-ink)'

  return (
    <>
      {/* The line in the slot's colour, inside its strip (drawn by PipeBody, underneath every line). */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(flowing && 'pipe-flow')}
        strokeWidth={2}
      />
      {fresh && <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" className="wire-flow" />}
    </>
  )
}

/** While a take plays, the wires into its section and out to it flow. */
function useFlowing(source: string, target: string) {
  return useSong((s) => {
    const take = s.playing ? s.nodes.find((n) => n.id === s.playing) : undefined
    if (take?.type !== 'take') return false
    return target === take.data.sectionId || (source === take.data.sectionId && target === take.id)
  })
}
