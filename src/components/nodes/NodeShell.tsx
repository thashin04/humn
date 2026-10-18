import { Handle, Position, useNodeId, useUpdateNodeInternals } from '@xyflow/react'
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import grip from '@/assets/figma/node-grip.svg'
import type { Role } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'

/** Hump radius, and the small concave fillet that blends it into the card's edge. */
const R = 13
const F = 4
// Where the fillet meets the edge (K above/below the hump's centre) and where it meets the hump.
const K = Math.sqrt((R + F) ** 2 - F ** 2)
const TX = (F * R) / (R + F)
const TY = (K * R) / (R + F)

/** A hump on the right edge at `y`, drawn while travelling down that edge. */
const humpRight = (y: number) =>
  `V${y - K}a${F} ${F} 0 0 0 ${TX} ${K - TY}a${R} ${R} 0 0 1 0 ${2 * TY}a${F} ${F} 0 0 0 ${-TX} ${K - TY}`
/** A hump on the left edge at `y`, drawn while travelling up it. */
const humpLeft = (y: number) =>
  `V${y + K}a${F} ${F} 0 0 0 ${-TX} ${TY - K}a${R} ${R} 0 0 1 0 ${-2 * TY}a${F} ${F} 0 0 0 ${TX} ${TY - K}`

/**
 * The folder-tab silhouette every node shares. Same geometry as the Figma
 * silhouettes (tab r10, join r9, body r15), drawn at whatever size the
 * content needs so nodes can grow with what people put in them. Humps are
 * part of the outline, so the fill, the hairline and the selection ring all
 * run around them, the way Weave's ports read as part of the card.
 */
function silhouette(w: number, h: number, tab: number, tabH: number, out?: number, ins: number[] = []) {
  return [
    `M10 0H${tab - 10}a10 10 0 0 1 10 10V${tabH - 9}a9 9 0 0 0 9 9`,
    `H${w - 15}a15 15 0 0 1 15 15`,
    out === undefined ? '' : humpRight(out),
    `V${h - 15}a15 15 0 0 1 -15 15`,
    `H15a15 15 0 0 1 -15 -15`,
    [...ins].sort((a, b) => b - a).map(humpLeft).join(''),
    `V10a10 10 0 0 1 10 -10Z`,
  ].join('')
}

/**
 * Heights (in the node's own pixels) of the `[data-hump]` markers inside it:
 * a section's plugged-in sockets. Re-read after every render, since plugging
 * in changes them without changing the node's size.
 */
function useHumps(box: RefObject<HTMLDivElement | null>) {
  const [ys, setYs] = useState<number[]>([])
  // No deps on purpose: it only sets state when the heights actually change, so it settles in one pass.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const frame = el.getBoundingClientRect()
    const scale = frame.height / (el.offsetHeight || 1)
    const next = [...el.querySelectorAll('[data-hump]')].map((m) => {
      const r = m.getBoundingClientRect()
      return Math.round((r.top + r.height / 2 - frame.top) / scale)
    })
    if (next.join() !== ys.join()) setYs(next)
  })
  return ys
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

type ShellProps = {
  width: number
  icon: string
  label: string
  meta?: string
  /** Sections have the taller title tab. */
  tall?: boolean
  /** Replaces the icon + label when the tab holds more (section name + length). */
  tab?: ReactNode
  selected?: boolean
  /** Cards that plug into a section get a tab on their right edge to pull a wire from. */
  port?: Role
  /** A wire is being pulled toward this node. */
  targeted?: boolean
  /** A suggestion, not yet made: dashed and see-through. */
  ghost?: boolean
  className?: string
  children: ReactNode
}

export function NodeShell({ width, icon, label, meta, tall, tab, selected, port, targeted, ghost, className, children }: ShellProps) {
  const [box, size] = useSize<HTMLDivElement>()
  const id = useNodeId()
  const updateNodeInternals = useUpdateNodeInternals()
  const plugged = useSong((s) => !!port && s.fresh?.source === id)
  const [tabRef, tabSize] = useSize<HTMLDivElement>()
  const [content, contentSize] = useSize<HTMLDivElement>()
  const tabH = tall ? 36 : 26
  const ins = useHumps(box)
  // The hump sits mid-way down the card's body, below the tab, so on a short card it
  // stays on the straight edge instead of climbing into the top corner.
  const out = port && size.h ? tabH + (size.h - tabH) / 2 : undefined
  const d = size.h && tabSize.w ? silhouette(size.w, size.h, tabSize.w, tabH, out, ins) : ''
  // The same outline 4px out, dashed, for a wire about to plug in.
  const halo = d && silhouette(size.w + 8, size.h + 8, tabSize.w + 4, tabH + 4)

  return (
    <div
      ref={box}
      className={cn(
        'group/node relative animate-node-enter text-left transition-[filter,width] duration-300 ease-soft motion-reduce:transition-none',
        !ghost && 'drop-shadow-[0_4px_7px_rgb(20_22_26/0.05)] hover:drop-shadow-[0_8px_16px_rgb(20_22_26/0.09)]',
        className,
      )}
      style={{ width, paddingTop: tabH }}
      // React Flow measured where the humps are while the card was still scaling in;
      // measure again once it's settled so wires meet them exactly.
      onAnimationEnd={(e) => e.target === e.currentTarget && id && updateNodeInternals(id)}
    >
      <svg className="pointer-events-none absolute inset-0 overflow-visible" width={size.w} height={size.h} aria-hidden>
        {ghost ? (
          <path d={d} fill="rgb(252 252 251 / 0.55)" stroke="rgb(20 22 26 / 0.26)" strokeWidth={1} strokeDasharray="5 5" />
        ) : (
          <path d={d} fill="var(--soft-card)" stroke="rgb(20 22 26 / 0.13)" strokeWidth={0.5} />
        )}
        {selected && <path d={d} fill="none" stroke="var(--soft-accent)" strokeWidth={1.5} />}
        <path
          d={halo}
          transform="translate(-4 -4)"
          fill="none"
          stroke="var(--soft-accent)"
          strokeWidth={1.5}
          strokeDasharray="5 6"
          className={cn('transition-opacity duration-200', targeted ? 'opacity-55' : 'opacity-0')}
        />
      </svg>

      <div
        ref={tabRef}
        className={cn(
          'absolute top-0 left-0 flex items-center overflow-hidden',
          tall ? 'h-9 gap-2 px-3.5' : 'h-[26px] gap-1.5 pr-3 pl-2.5',
        )}
      >
        {tab ?? (
          <>
            <img src={icon} alt="" className="size-3.5" />
            <p className="type-caption whitespace-nowrap text-ink-2">{label}</p>
          </>
        )}
      </div>

      {!tall && (
        <div className={cn('absolute right-2.5 flex items-center gap-2.5', meta ? 'top-1.5' : 'top-[7px]')}>
          {meta && <p className="font-mono text-[12px] leading-none whitespace-nowrap text-ink-3">{meta}</p>}
          <img src={grip} alt="" className="h-[11px] w-[17px]" />
        </div>
      )}

      {/* When what's inside changes size (a prompt being typed), the card eases to its new
          shape: this follows the content's height, and the outline, hump and wires follow it. */}
      <div
        className="relative transition-[height] duration-300 ease-soft motion-reduce:transition-none"
        // Clip only top and bottom, so a section's rings can still sit out past its edge.
        style={{ height: contentSize.h || undefined, clipPath: 'inset(0 -40px)' }}
      >
        <div ref={content}>{children}</div>
      </div>

      <div className="node-shine pointer-events-none absolute inset-0" style={{ clipPath: d ? `path('${d}')` : undefined }} />

      {port && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectableEnd={false}
          aria-label="Pull to plug into a section"
          className={cn('wire-port', plugged && 'wire-pop')}
          style={{ '--c': `var(--soft-role-${port})`, top: out ?? '50%' } as CSSProperties}
        />
      )}
    </div>
  )
}
