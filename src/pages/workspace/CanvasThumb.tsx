import { useMemo } from 'react'
import { ROLES, roleOf, type AnySongNode } from '@/data/nodes'

/** Sizes to fall back on for nodes the canvas hasn't measured yet. */
const SIZE = { section: [320, 260], take: [280, 120], input: [240, 88] } as const
const PAD = 60
const BARS = [0.35, 0.7, 0.45, 1, 0.55, 0.8, 0.3, 0.9, 0.5, 0.75, 0.4, 0.85, 0.6, 1, 0.45]

function box(n: AnySongNode) {
  const [fw, fh] = n.type === 'section' ? SIZE.section : n.type === 'take' ? SIZE.take : SIZE.input
  const w = n.measured?.width ?? fw
  const h = n.measured?.height ?? fh
  const [ox, oy] = n.origin ?? [0, 0]
  return { x: n.position.x - w * ox, y: n.position.y - h * oy, w, h }
}

const wire = (x1: number, y1: number, x2: number, y2: number) => {
  const m = (x1 + x2) / 2
  return `M${x1} ${y1}C${m} ${y1} ${m} ${y2} ${x2} ${y2}`
}

/** A mini-map of a song's canvas, drawn from its nodes so it keeps up with every change. */
export function CanvasThumb({ nodes }: { nodes: AnySongNode[] }) {
  const drawing = useMemo(() => {
    if (!nodes.length) return null
    const boxes = new Map(nodes.map((n) => [n.id, box(n)]))
    const all = [...boxes.values()]
    const x0 = Math.min(...all.map((b) => b.x)) - PAD
    const y0 = Math.min(...all.map((b) => b.y)) - PAD
    const x1 = Math.max(...all.map((b) => b.x + b.w)) + PAD
    const y1 = Math.max(...all.map((b) => b.y + b.h)) + PAD

    const wires = nodes.flatMap((n) => {
      const to = boxes.get(n.id)!
      if (n.type === 'take') {
        const from = boxes.get(n.data.branchOf ?? n.data.sectionId)
        return from
          ? [{ id: n.id, d: wire(from.x + from.w, from.y + from.h / 2, to.x, to.y + to.h / 2), color: 'var(--soft-ink-3)', dashed: true }]
          : []
      }
      if (n.type !== 'section') return []
      const rows = ROLES.filter((r) => (n.data.sources[r.id] ?? []).some((id) => boxes.has(id)))
      return rows.flatMap((r, i) =>
        (n.data.sources[r.id] ?? []).flatMap((id) => {
          const from = boxes.get(id)
          if (!from) return []
          const y = to.y + to.h * (0.3 + (0.4 * (i + 0.5)) / rows.length)
          return [{ id: `${id}|${n.id}`, d: wire(from.x + from.w, from.y + from.h / 2, to.x, y), color: `var(--soft-role-${r.id})`, dashed: false }]
        }),
      )
    })

    return { view: `${x0} ${y0} ${x1 - x0} ${y1 - y0}`, boxes, wires }
  }, [nodes])

  if (!drawing) return null
  const { view, boxes, wires } = drawing
  return (
    <svg viewBox={view} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full bg-[#E3E0D9]" aria-hidden="true">
      {wires.map((w) => (
        <path
          key={w.id}
          d={w.d}
          fill="none"
          stroke={w.color}
          strokeWidth={5}
          strokeDasharray={w.dashed ? '10 10' : undefined}
          opacity={0.8}
        />
      ))}
      {nodes.map((n) => {
        const b = boxes.get(n.id)!
        if (n.type === 'take') {
          const step = (b.w - 60) / BARS.length
          return (
            <g key={n.id}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill="#121214" />
              {BARS.map((v, i) => {
                const h = v * b.h * 0.4
                return (
                  <rect key={i} x={b.x + 30 + i * step} y={b.y + (b.h - h) / 2} width={step * 0.4} height={h} rx={3} fill="#fff" />
                )
              })}
            </g>
          )
        }
        if (n.type === 'section') {
          return (
            <g key={n.id}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill="#FBFAF8" stroke="#12121417" strokeWidth={3} />
              <rect x={b.x + 30} y={b.y + b.h - 50} width={b.w - 60} height={12} rx={6} fill="#121214" />
            </g>
          )
        }
        return (
          <g key={n.id}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={12} fill="#FBFAF8" stroke="#12121417" strokeWidth={3} />
            <circle cx={b.x + 26} cy={b.y + 26} r={8} fill={`var(--soft-role-${roleOf(n.type)})`} />
            <rect x={b.x + 26} y={b.y + 50} width={b.w * 0.6} height={10} rx={5} fill="#E3E7EA" />
          </g>
        )
      })}
    </svg>
  )
}
