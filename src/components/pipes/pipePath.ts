import type { Role } from '@/data/nodes'

/** The role's colour as a CSS value; pipes out of a section (no role) are ink. */
export const pipeColour = (role?: Role) => (role ? `var(--soft-role-${role})` : 'var(--soft-ink)')

/**
 * Pipes run flat out of the node, turn once onto their own vertical lane, and
 * flat into the plug — corners r14, as in the Figma mockups. Too close to
 * route that way, they fall back to a soft curve.
 */
export function pipePath(sx: number, sy: number, tx: number, ty: number, lane = (sx + tx) / 2) {
  if (Math.abs(ty - sy) < 1) return `M${sx} ${sy}H${tx}`
  if (tx - sx < 32) {
    const pull = Math.max(60, Math.abs(tx - sx) / 2)
    return `M${sx} ${sy}C${sx + pull} ${sy} ${tx - pull} ${ty} ${tx} ${ty}`
  }
  const x = Math.min(Math.max(lane, sx + 14), tx - 14)
  const r = Math.min(14, Math.abs(ty - sy) / 2, x - sx, tx - x)
  const dir = ty > sy ? 1 : -1
  return [
    `M${sx} ${sy}H${x - r}`,
    `Q${x} ${sy} ${x} ${sy + dir * r}`,
    `V${ty - dir * r}`,
    `Q${x} ${ty} ${x + r} ${ty}`,
    `H${tx}`,
  ].join('')
}

/** Connectors stick 24px out of a node; the pipe starts back at the node's edge. */
export const STUB = 24
/** Plugs sit across the section's edge; a pipe ends 12px outside it. */
export const PLUG_REACH = 12
