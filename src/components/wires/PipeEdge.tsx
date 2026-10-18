import { EdgeLabelRenderer, type Edge, type EdgeProps } from '@xyflow/react'
import { Xmark } from 'iconoir-react'
import { useEffect, useRef, useState } from 'react'
import { ROLES, type Role } from '@/data/nodes'
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
 * reads as coming out of one and into the other. Hovering offers a way to
 * unplug; a fresh connection sends one soft pulse along it.
 */
export function PipeEdge({ id, source, target, sourceX, sourceY, targetX, targetY, data }: EdgeProps<PipeEdge>) {
  const { d, mid } = route({ sourceX, sourceY, targetX, targetY, data })
  const disconnect = useSong((s) => s.disconnect)
  const fresh = useSong((s) => s.fresh?.id === id)
  const flowing = useFlowing(source, target)
  const toTake = !data?.role
  const roleName = ROLES.find((r) => r.id === data?.role)?.name
  const [hover, setHover] = useState(false)
  const leave = useRef(0)
  useEffect(() => () => clearTimeout(leave.current), [])
  const enter = () => {
    clearTimeout(leave.current)
    setHover(true)
  }
  // A short grace period so the pointer can travel from the line to its button.
  const exit = () => {
    leave.current = window.setTimeout(() => setHover(false), 140)
  }

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
        className={cn('transition-[stroke-width] duration-200 ease-soft', flowing && 'pipe-flow')}
        strokeWidth={hover ? 2.75 : 2}
      />
      {fresh && <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" className="wire-flow" />}
      {!toTake && (
        <>
          <path
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            onMouseEnter={enter}
            onMouseLeave={exit}
          />
          <EdgeLabelRenderer>
            {/* Hovering a wire names the slot it feeds, beside a way to unplug it. */}
            <div
              onMouseEnter={enter}
              onMouseLeave={exit}
              className={cn(
                'nodrag nopan absolute flex h-7 items-center gap-1.5 rounded-full bg-card pr-0.5 pl-2.5 shadow-lift transition-[opacity,scale] duration-200 ease-spring',
                hover ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
              )}
              style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}
            >
              <span className="type-small font-medium" style={{ color }}>
                {roleName}
              </span>
              <button
                type="button"
                aria-label="Unplug"
                title="Unplug"
                onClick={() => disconnect(source, target)}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-well hover:text-ink-1"
              >
                <Xmark width={12} height={12} strokeWidth={2} />
              </button>
            </div>
          </EdgeLabelRenderer>
        </>
      )}
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
