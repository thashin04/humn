import { useNodeId } from '@xyflow/react'
import { Copy, EditPencil, Link, LinkSlash, Plus, Trash } from 'iconoir-react'
import { motion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { roleOf, type AnySongNode, type Kind, type SongNode } from '@/data/nodes'
import { useSong } from '@/store/song'

const ICON = { width: 17, height: 17 }
/** The fan hugs the card's top-right corner: along its top, round the corner, and down its right side. */
const GAP = 24 // from the card's edge to a button's middle
const BEND = 20 // how round the corner it wraps is
const STEP = 40 // between one button's middle and the next
const SIZE = 34
/** How far above the wire leaving the card's right side the lowest button stays. */
const CLEAR = 30

/** A point `s` along the wrap, measured from the middle of the corner: up and left when positive, down when negative. */
function along(s: number) {
  const r = BEND + GAP
  const half = (Math.PI / 4) * r
  if (s > half) return { x: -BEND - (s - half), y: -GAP, side: 'top' as const }
  if (s < -half) return { x: GAP, y: BEND + (-s - half), side: 'right' as const }
  const a = Math.PI / 4 + s / r
  return { x: -BEND + Math.cos(a) * r, y: BEND - Math.sin(a) * r, side: a > Math.PI / 3 ? ('top' as const) : ('right' as const) }
}
/** Where a copy lands, down and to the right of the card it came from. */
const NUDGE = 36

/** The section a card is plugged into, if any. */
const sectionOf = (nodes: AnySongNode[], id: string) =>
  nodes.find(
    (n): n is SongNode<'section'> =>
      n.type === 'section' && Object.values(n.data.sources).some((ids) => ids?.includes(id)),
  )

/**
 * What can be done to a card, fanned out around its corner once it's the only
 * thing picked: plug it in or out, add more like it, copy it, change it, or let it go.
 */
export function NodeActions({ wire }: { wire?: number }) {
  const id = useNodeId()!
  const shown = useSong((s) => {
    const picked = s.nodes.filter((n) => n.selected)
    return picked.length === 1 && picked[0].id === id && !picked[0].dragging && s.tool === 'select'
  })
  if (!shown) return null
  return <Fan id={id} wire={wire} />
}

function Fan({ id, wire }: { id: string; wire?: number }) {
  const node = useSong((s) => s.nodes.find((n) => n.id === id))!
  const section = useSong((s) => sectionOf(s.nodes, id))
  const { addNode, connect, disconnect, gather, setDrawer, editInput, onNodesChange } = useSong.getState()

  const plug = () => {
    if (section) return disconnect(id, section.id)
    // Into the nearest part of the song, or a new one beside the card when there isn't one yet.
    const { nodes } = useSong.getState()
    const near = nodes
      .filter((n) => n.type === 'section')
      .sort((a, b) => dist(a, node) - dist(b, node))[0]
    if (near) connect(id, near.id, roleOf(node.type))
    else gather([id])
  }

  const actions: { label: string; icon: ReactNode; onClick: () => void; danger?: boolean }[] = [
    {
      label: section ? `Unplug from ${section.data.name}` : 'Plug into a part',
      icon: section ? <LinkSlash {...ICON} /> : <Link {...ICON} />,
      onClick: plug,
    },
    { label: 'Add more like this', icon: <Plus {...ICON} />, onClick: () => setDrawer(node.type as Kind) },
    {
      label: 'Duplicate',
      icon: <Copy {...ICON} />,
      onClick: () =>
        addNode(node.type, { x: node.position.x + NUDGE, y: node.position.y + NUDGE }, structuredClone(node.data)),
    },
    { label: 'Edit', icon: <EditPencil {...ICON} />, onClick: () => editInput(id) },
    { label: 'Delete', icon: <Trash {...ICON} />, onClick: () => onNodesChange([{ type: 'remove', id }]), danger: true },
  ]

  // Centred on the corner, then slid up and round if the lowest would sit on the wire.
  const mid = (actions.length - 1) / 2
  const lowest = along(-mid * STEP).y
  const lift = wire !== undefined && lowest > wire - CLEAR ? lowest - (wire - CLEAR) : 0

  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none absolute top-0 right-0 z-20">
        {actions.map((a, i) => {
          const p = along((mid - i) * STEP + lift)
          return (
            <motion.div
              key={a.label}
              className="pointer-events-auto absolute"
              style={{ left: p.x - SIZE / 2, top: p.y - SIZE / 2 }}
              // Each one springs out from the corner, one after another.
              initial={{ opacity: 0, scale: 0.4, x: -p.x * 0.6, y: -p.y * 0.6 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.3, delay: i * 0.03 }}
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={a.label}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        a.onClick()
                      }}
                      className={
                        'nodrag nopan flex size-[34px] items-center justify-center rounded-full bg-ink text-on-ink shadow-[0_4px_12px_rgb(20_22_26/0.18)] transition-[transform,background-color] duration-150 ease-soft hover:scale-110 active:scale-95 ' +
                        (a.danger ? 'hover:bg-[#c2412f]' : 'hover:bg-ink/85')
                      }
                    />
                  }
                >
                  {a.icon}
                </TooltipTrigger>
                <TooltipContent side={p.side}>{a.label}</TooltipContent>
              </Tooltip>
            </motion.div>
          )
        })}
      </div>
    </MotionConfig>
  )
}

const dist = (a: AnySongNode, b: AnySongNode) => Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)
