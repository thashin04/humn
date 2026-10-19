import { NavArrowLeft, NavArrowRight } from 'iconoir-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { templates, type TemplateId } from '@/data/templates'
import { cn } from '@/lib/utils'

export function StarterCard({ id, index, hovered = false, dimmed = false, compact = false, onHover = () => {}, onStart }: { id: TemplateId; index: number; hovered?: boolean; dimmed?: boolean; compact?: boolean; onHover?: (index: number | null) => void; onStart: (id: TemplateId) => void }) {
  return (
    <div
      className={cn(
        'transition-[opacity,transform] duration-300 ease-spring',
        compact ? 'w-[228px] shrink-0 snap-start' : 'min-w-0 flex-1',
        hovered && 'z-10 scale-[1.02]',
        dimmed && 'opacity-40',
      )}
      onPointerEnter={() => onHover(index)}
      onPointerLeave={() => onHover(null)}
    >
      <TemplateCard id={id} compact={compact} onClick={() => onStart(id)} className="w-full" />
    </div>
  )
}

/** The same heading for every part of the workspace page (Start with a story, My songs). */
export const SECTION_HEADING = 'text-[17px] leading-[1.25] font-medium tracking-[-0.01em] text-ink'

/** Starters, above My songs: one compact row that scrolls sideways, straight on the page. */
export function StartersPanel({ onStart }: { onStart: (id: TemplateId) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const row = useRef<HTMLDivElement>(null)
  const [ends, setEnds] = useState({ start: true, end: false })

  const measure = () => {
    const el = row.current
    if (!el) return
    setEnds({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 })
  }
  useEffect(() => {
    measure()
    const el = row.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // A page at a time, less one card so there's something familiar to hold on to.
  const page = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * (row.current.clientWidth - 228), behavior: 'smooth' })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className={SECTION_HEADING}>Start with a story</h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">Choose a moment. We’ll set up the first verse for you.</p>
        </div>
        <div className="flex gap-1.5">
          <ArrowButton label="Earlier stories" disabled={ends.start} onClick={() => page(-1)}>
            <NavArrowLeft className="size-4" />
          </ArrowButton>
          <ArrowButton label="More stories" disabled={ends.end} onClick={() => page(1)}>
            <NavArrowRight className="size-4" />
          </ArrowButton>
        </div>
      </div>
      {/* Runs out to the canvas's edges, so the cards scroll under them rather than stopping short. */}
      <div className="relative -mx-8">
        <div
          ref={row}
          onScroll={measure}
          className="flex snap-x scroll-px-8 gap-3 overflow-x-auto px-8 pt-1 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {templates.map((t, index) => (
            <StarterCard
              key={t.id}
              id={t.id}
              index={index}
              compact
              hovered={hovered === index}
              dimmed={hovered !== null && hovered !== index}
              onHover={setHovered}
              onStart={onStart}
            />
          ))}
        </div>
        {/* Soft edges, so a card cut off at the side reads as "there's more". */}
        <div
          aria-hidden
          className={cn('pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-ground to-transparent transition-opacity duration-200', ends.start && 'opacity-0')}
        />
        <div
          aria-hidden
          className={cn('pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-ground to-transparent transition-opacity duration-200', ends.end && 'opacity-0')}
        />
      </div>
    </section>
  )
}

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full border border-rule bg-card text-ink-2 transition-[opacity,background-color] duration-150 hover:bg-well disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  )
}
