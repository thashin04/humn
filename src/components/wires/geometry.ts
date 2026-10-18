import type { InternalNode, XYPosition } from '@xyflow/react'
import { DEFAULT_ROLE, type Kind, type Role } from '@/data/nodes'

/** How close (in canvas px) a pulled wire has to come to a section before it's drawn in. */
const PULL = 70

/**
 * Where the wire meets each hump's ring, relative to the points React Flow
 * gives for the handles: the card's tab handle is centred on its edge and
 * reports its right side; a socket reports the section's edge.
 */
export const RING_OUT = -13
export const RING_IN = 0

/**
 * A soft S-curve that leaves the card level and arrives at the socket level.
 * When the socket is behind the card, the handles reach further so it loops.
 */
export function curve(S: XYPosition, T: XYPosition) {
  const dx = T.x - S.x
  const c = Math.max(dx < 0 ? 90 : 36, Math.abs(dx) * 0.5)
  const [c1, c2] = [{ x: S.x + c, y: S.y }, { x: T.x - c, y: T.y }]
  // The midpoint of a cubic Bézier is the average of its points weighted 1:3:3:1.
  const mid = { x: (S.x + 3 * c1.x + 3 * c2.x + T.x) / 8, y: (S.y + 3 * c1.y + 3 * c2.y + T.y) / 8 }
  return { d: `M${S.x} ${S.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${T.x} ${T.y}`, mid }
}

/** How wide a pipe is, and the gap between the lanes pipes turn in on their way into a section. */
export const PIPE = 10
const LANE = 13

/**
 * A pipe like the Figma canvas draws them: out of the card level, one rounded
 * turn into a lane just before the section, then level into the socket. Each
 * row of a section has its own lane (`lane` 0 is nearest the section), so pipes
 * into different rows run side by side instead of on top of each other, and
 * pipes into the same row share theirs and merge. Falls back to a curve when
 * there's no room to turn.
 */
export function pipe(S: XYPosition, T: XYPosition, lane = 0) {
  // Clear of the section's neck (18) before turning in, and of the card's on the way out.
  const x = T.x - 38 - lane * LANE
  const dy = T.y - S.y
  if (x - S.x < 40 || Math.abs(dy) < 1) return Math.abs(dy) < 1 && T.x > S.x ? straight(S, T) : curve(S, T)
  const r = Math.min(16, Math.abs(dy) / 2, x - S.x - 8)
  const s = Math.sign(dy)
  const d =
    `M${S.x} ${S.y}H${x - r}` +
    `Q${x} ${S.y} ${x} ${S.y + s * r}` +
    `V${T.y - s * r}` +
    `Q${x} ${T.y} ${x + r} ${T.y}` +
    `H${T.x}`
  return { d, mid: { x, y: S.y + dy / 2 } }
}

function straight(S: XYPosition, T: XYPosition) {
  return { d: `M${S.x} ${S.y}H${T.x}`, mid: { x: (S.x + T.x) / 2, y: S.y } }
}

export type Snap = { section: string; role: Role; at: XYPosition }

/**
 * Where a wire pulled from a `kind` card would plug in if let go at `p`. Over a
 * socket row it takes that socket; anywhere else on or near a section it falls
 * into the card's own role.
 */
export function findSnap(lookup: Map<string, InternalNode>, kind: Kind, p: XYPosition): Snap | null {
  let best: (Snap & { dist: number }) | null = null
  for (const n of lookup.values()) {
    if (n.type !== 'section') continue
    const { x, y } = n.internals.positionAbsolute
    const w = n.measured.width ?? 0
    const h = n.measured.height ?? 0
    const dx = p.x < x ? x - p.x : p.x > x + w ? p.x - x - w : 0
    const dy = p.y < y ? y - p.y : p.y > y + h ? p.y - y - h : 0
    const dist = Math.hypot(dx, dy)
    if (dist > PULL || (best && dist >= best.dist)) continue

    const sockets = n.internals.handleBounds?.target ?? []
    // Empty slots share one landing row, so over it the card keeps its own slot if that's one of them.
    const over = dist === 0 ? sockets.filter((s) => p.y >= y + s.y - 2 && p.y <= y + s.y + s.height + 2) : []
    const role = (over.length === 1 ? (over[0].id as Role) : DEFAULT_ROLE[kind]) as Role
    const socket = sockets.find((s) => s.id === role)
    if (!socket) continue
    best = { dist, section: n.id, role, at: { x: x + socket.x, y: y + socket.y + socket.height / 2 } }
  }
  return best && { section: best.section, role: best.role, at: best.at }
}
