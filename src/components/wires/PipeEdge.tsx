import { EdgeLabelRenderer, type Edge, type EdgeProps } from '@xyflow/react'
import { Xmark } from 'iconoir-react'
import { useEffect, useRef, useState } from 'react'
import type { Role } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { curve, RING_IN, RING_OUT } from './geometry'

export type PipeEdge = Edge<{ role: Role }, 'pipe'>

/**
 * A plugged-in card: one line in the socket's colour, from the ring on the
 * card's hump to the ring on the section's. It runs under the cards, so it
 * reads as coming out of one and into the other. Hovering offers a way to
 * unplug; a fresh connection sends one soft pulse along it.
 */
export function PipeEdge({ id, source, target, sourceX, sourceY, targetX, targetY, data }: EdgeProps<PipeEdge>) {
  const disconnect = useSong((s) => s.disconnect)
  const fresh = useSong((s) => s.fresh?.id === id)
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

  const { d, mid } = curve({ x: sourceX + RING_OUT, y: sourceY }, { x: targetX + RING_IN, y: targetY })
  const color = `var(--soft-role-${data?.role ?? 'intent'})`

  return (
    <>
      {/* A halo in the canvas colour keeps the line clean over the dot grid and other lines. */}
      <path d={d} fill="none" stroke="var(--soft-ground)" strokeWidth={6} strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        className="transition-[stroke-width] duration-200 ease-soft"
        strokeWidth={hover ? 2.75 : 2}
      />
      {fresh && <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" className="wire-flow" />}
      <path d={d} fill="none" stroke="transparent" strokeWidth={20} onMouseEnter={enter} onMouseLeave={exit} />
      <EdgeLabelRenderer>
        <button
          type="button"
          aria-label="Unplug"
          title="Unplug"
          onMouseEnter={enter}
          onMouseLeave={exit}
          onClick={() => disconnect(source, target)}
          className={cn(
            'nodrag nopan absolute flex size-[22px] items-center justify-center rounded-full bg-card text-ink-2 shadow-lift transition-[opacity,scale] duration-200 ease-spring hover:text-ink-1',
            hover ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
          )}
          style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}
        >
          <Xmark width={12} height={12} strokeWidth={2} />
        </button>
      </EdgeLabelRenderer>
    </>
  )
}
