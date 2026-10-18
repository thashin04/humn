import { EdgeLabelRenderer, type Edge, type EdgeProps } from '@xyflow/react'
import { Xmark } from 'iconoir-react'
import { useEffect, useRef, useState } from 'react'
import { readingFor } from '@/data/interpret'
import { ROLES, type Role } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { curve, RING_IN, RING_OUT } from './geometry'

/** A card plugged into a section socket (`role`), or a section's wire out to its take (no role). */
export type PipeEdge = Edge<{ role?: Role }, 'pipe'>

/**
 * A plugged-in card: one line in the socket's colour, from the ring on the
 * card's hump to the ring on the section's. It runs under the cards, so it
 * reads as coming out of one and into the other. Hovering offers a way to
 * unplug; a fresh connection sends one soft pulse along it.
 */
export function PipeEdge({ id, source, target, sourceX, sourceY, targetX, targetY, data }: EdgeProps<PipeEdge>) {
  const disconnect = useSong((s) => s.disconnect)
  const fresh = useSong((s) => s.fresh?.id === id)
  const flowing = useFlowing(source, target)
  const toTake = !data?.role
  const reading = useSong((s) => {
    const card = data?.role && s.nodes.find((n) => n.id === source)
    return card ? readingFor(card, data.role!) : ''
  })
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

  const { d, mid } = toTake
    ? curve({ x: sourceX, y: sourceY }, { x: targetX, y: targetY })
    : curve({ x: sourceX + RING_OUT, y: sourceY }, { x: targetX + RING_IN, y: targetY })
  const color = data?.role ? `var(--soft-role-${data.role})` : 'var(--soft-ink)'

  return (
    <>
      {/* A halo in the canvas colour keeps the line clean over the dot grid and other lines. */}
      <path d={d} fill="none" stroke="var(--soft-ground)" strokeWidth={6} strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        className={cn('transition-[stroke-width] duration-200 ease-soft', flowing && 'pipe-flow')}
        strokeWidth={hover ? 2.75 : 2}
      />
      {fresh && <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" className="wire-flow" />}
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
            {/* Hovering a wire says what it carries, beside a way to unplug it. */}
            <div
              onMouseEnter={enter}
              onMouseLeave={exit}
              className={cn(
                'nodrag nopan absolute flex h-7 max-w-[260px] items-center gap-1.5 rounded-full bg-card pr-0.5 pl-2.5 shadow-lift transition-[opacity,scale] duration-200 ease-spring',
                hover ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
              )}
              style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}
            >
              {reading && (
                <span className="type-small min-w-0 truncate text-ink-2">
                  <span className="font-medium" style={{ color }}>
                    {roleName}
                  </span>{' '}
                  · {reading}
                </span>
              )}
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
