import { Handle, Position, useNodeId, useUpdateNodeInternals } from '@xyflow/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import grip from '@/assets/figma/node-grip.svg'
import { STUB } from '@/components/pipes/pipePath'
import type { Role } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'

/**
 * The folder-tab silhouette every node shares. Same geometry as the Figma
 * silhouettes (tab r10, join r9, body r15), drawn at whatever size the
 * content needs so nodes can grow with what people put in them.
 */
function silhouette(w: number, h: number, tab: number, tabH: number, plugs: number[] = []) {
  // Plugs are 28×22 pills moulded across the left edge, walked bottom to top.
  const bumps = [...plugs]
    .sort((a, b) => b - a)
    .map((y) => `V${y + 11}H-3a11 11 0 0 1 0 -22H0`)
    .join('')
  return [
    `M10 0H${tab - 10}a10 10 0 0 1 10 10V${tabH - 9}a9 9 0 0 0 9 9`,
    `H${w - 15}a15 15 0 0 1 15 15V${h - 15}a15 15 0 0 1 -15 15`,
    `H15a15 15 0 0 1 -15 -15${bumps}V10a10 10 0 0 1 10 -10Z`,
  ].join('')
}

const DOT: Record<Role, string> = {
  intent: 'bg-role-intent',
  melody: 'bg-role-melody',
  harmony: 'bg-role-harmony',
  mood: 'bg-role-mood',
  texture: 'bg-role-texture',
  instruments: 'bg-role-instruments',
}

/**
 * A short pipe stub with a dot in the role colour: pull it toward a section to
 * plug in. Once something's plugged in the stub hides and the pipe takes over,
 * but the handle stays, so one thing can feed more than one plug.
 */
function Connector({ role, y }: { role: Role; y: number }) {
  const id = useNodeId()
  const connected = useSong((s) => s.edges.some((e) => e.source === id))
  // The connector follows the node's height, so React Flow has to re-measure where it is.
  const updateInternals = useUpdateNodeInternals()
  useEffect(() => {
    if (id) updateInternals(id)
  }, [id, y, updateInternals])
  return (
    <Handle
      type="source"
      position={Position.Right}
      id="out"
      className="group/port"
      style={{
        top: y,
        right: -STUB,
        left: 'auto',
        width: STUB,
        height: 18,
        minWidth: 0,
        minHeight: 0,
        transform: 'translateY(-50%)',
        background: 'transparent',
        border: 0,
        borderRadius: 0,
      }}
    >
      <span
        className={cn(
          'pointer-events-none absolute top-1/2 left-0 h-2 w-full -translate-y-1/2 bg-card transition-opacity duration-200',
          connected ? 'opacity-0 group-hover/port:opacity-100' : 'opacity-100',
        )}
      />
      <span
        className={cn(
          'pointer-events-none absolute top-1/2 right-0 size-[5.2px] translate-x-1/2 -translate-y-1/2 rounded-full transition-[transform,opacity] duration-200 ease-spring group-hover/port:scale-[1.8]',
          DOT[role],
          connected ? 'opacity-0 group-hover/port:opacity-100' : 'opacity-100',
        )}
      />
    </Handle>
  )
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
  /** The open connector on the right edge, in this role's colour. Sections and takes have none. */
  connector?: Role
  /** Where the section's role plugs sit on the left edge (y from the top). */
  plugs?: number[]
  className?: string
  children: ReactNode
}

export function NodeShell({ width, icon, label, meta, tall, tab, selected, connector, plugs, className, children }: ShellProps) {
  const [box, size] = useSize<HTMLDivElement>()
  const [tabRef, tabSize] = useSize<HTMLDivElement>()
  const tabH = tall ? 36 : 26
  const d = size.h && tabSize.w ? silhouette(size.w, size.h, tabSize.w, tabH, plugs) : ''

  return (
    <div
      ref={box}
      className={cn(
        'group/node relative animate-node-enter text-left transition-[filter] duration-200 ease-soft',
        'drop-shadow-[0_4px_7px_rgb(20_22_26/0.05)] hover:drop-shadow-[0_8px_16px_rgb(20_22_26/0.09)]',
        className,
      )}
      style={{ width, paddingTop: tabH }}
    >
      <svg className="pointer-events-none absolute inset-0 overflow-visible" width={size.w} height={size.h} aria-hidden>
        <path d={d} fill="var(--soft-card)" stroke="rgb(20 22 26 / 0.13)" strokeWidth={0.5} />
        {selected && <path d={d} fill="none" stroke="var(--soft-accent)" strokeWidth={1.5} />}
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

      <div className="relative">{children}</div>

      {connector && <Connector role={connector} y={tabH + (size.h - tabH) / 2} />}

      <div className="node-shine pointer-events-none absolute inset-0" style={{ clipPath: d ? `path('${d}')` : undefined }} />
    </div>
  )
}
