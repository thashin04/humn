import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import grip from '@/assets/figma/node-grip.svg'
import { cn } from '@/lib/utils'

/**
 * The folder-tab silhouette every node shares. Same geometry as the Figma
 * silhouettes (tab r10, join r9, body r15), drawn at whatever size the
 * content needs so nodes can grow with what people put in them.
 */
function silhouette(w: number, h: number, tab: number, tabH: number) {
  return [
    `M10 0H${tab - 10}a10 10 0 0 1 10 10V${tabH - 9}a9 9 0 0 0 9 9`,
    `H${w - 15}a15 15 0 0 1 15 15V${h - 15}a15 15 0 0 1 -15 15`,
    `H15a15 15 0 0 1 -15 -15V10a10 10 0 0 1 10 -10Z`,
  ].join('')
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
  className?: string
  children: ReactNode
}

export function NodeShell({ width, icon, label, meta, tall, tab, selected, className, children }: ShellProps) {
  const [box, size] = useSize<HTMLDivElement>()
  const [tabRef, tabSize] = useSize<HTMLDivElement>()
  const tabH = tall ? 36 : 26
  const d = size.h && tabSize.w ? silhouette(size.w, size.h, tabSize.w, tabH) : ''

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

      <div className="node-shine pointer-events-none absolute inset-0" style={{ clipPath: d ? `path('${d}')` : undefined }} />
    </div>
  )
}
