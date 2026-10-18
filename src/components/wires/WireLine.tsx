import { useStoreApi, type ConnectionLineComponentProps, type XYPosition } from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_ROLE, type Kind } from '@/data/nodes'
import { useSong } from '@/store/song'
import { curve, findSnap, PIPE, RING_IN, RING_OUT } from './geometry'

/**
 * Eases the wire's end toward `target` every frame: quickly while it follows
 * the pointer, more gently when it's drawn into (or let out of) a socket, so
 * neither snapping in nor pulling away ever jumps.
 */
function useGlide(target: XYPosition, snapped: boolean) {
  const [pos, setPos] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    const k = snapped ? 0.28 : 0.5
    let raf = 0
    const step = () => {
      const c = cur.current
      cur.current = { x: c.x + (target.x - c.x) * k, y: c.y + (target.y - c.y) * k }
      if (Math.hypot(target.x - cur.current.x, target.y - cur.current.y) < 0.25) cur.current = target
      setPos(cur.current)
      if (cur.current !== target) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target.x, target.y, snapped]) // eslint-disable-line react-hooks/exhaustive-deps
  return pos
}

/**
 * The wire being pulled out of a card's hump. It trails the pointer with a
 * small loose end; near a section it curves into the socket it would plug into.
 */
export function WireLine({ fromX, fromY, toX, toY, fromNode }: ConnectionLineComponentProps) {
  const store = useStoreApi()
  const setSnap = useSong((s) => s.setSnap)
  const kind = fromNode.type as Kind
  const snap = findSnap(store.getState().nodeLookup, kind, { x: toX, y: toY })
  const end = useGlide(snap ? { x: snap.at.x + RING_IN, y: snap.at.y } : { x: toX, y: toY }, !!snap)

  // Sections light up the socket the wire is headed for.
  useEffect(() => {
    setSnap(snap && { section: snap.section, role: snap.role })
  }, [snap?.section, snap?.role, setSnap]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setSnap(null), [setSnap])

  const { d } = curve({ x: fromX + RING_OUT, y: fromY }, end)
  const color = `var(--soft-role-${snap?.role ?? DEFAULT_ROLE[kind]})`

  return (
    <g>
      <path d={d} fill="none" stroke="var(--soft-card)" strokeWidth={PIPE} strokeLinecap="round" className="pipe-edge" />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* The loose end, which disappears into the socket's ring once it's drawn in. */}
      <circle
        cx={end.x}
        cy={end.y}
        r={4.5}
        fill="var(--soft-card)"
        stroke={color}
        strokeWidth={2}
        style={{ opacity: snap ? 0 : 1, transition: 'opacity .2s' }}
      />
    </g>
  )
}
