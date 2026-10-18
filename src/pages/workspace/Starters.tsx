import { useState } from 'react'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { templates, type TemplateId } from '@/data/templates'

export function StarterCard({ id, index, hovered = false, dimmed = false, onHover = () => {}, onStart }: { id: TemplateId; index: number; hovered?: boolean; dimmed?: boolean; onHover?: (index: number | null) => void; onStart: (id: TemplateId) => void }) {
  return (
    <div
      className={`min-w-0 flex-1 transition-[opacity,transform] duration-300 ease-spring ${hovered ? 'z-10 scale-[1.02]' : ''} ${dimmed ? 'opacity-40' : ''}`}
      onPointerEnter={() => onHover(index)}
      onPointerLeave={() => onHover(null)}
    >
      <TemplateCard id={id} onClick={() => onStart(id)} className="w-full" />
    </div>
  )
}

/** Starters, above My songs. */
export function StartersPanel({ onStart }: { onStart: (id: TemplateId) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-rule-strong bg-well/70 p-5 shadow-lift">
      <div className="flex flex-col gap-1 px-0.5">
        <h2 className="text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-nav-ink">Start with a story</h2>
        <p className="text-[16px] leading-[1.45] text-ink-2">Choose a moment. We’ll set up the first verse for you.</p>
      </div>
      <div className="grid grid-cols-3 items-end gap-4 overflow-visible px-1 pt-2 pb-1">
        {templates.map((t, index) => (
          <StarterCard
            key={t.id}
            id={t.id}
            index={index}
            hovered={hovered === index}
            dimmed={hovered !== null && hovered !== index}
            onHover={setHovered}
            onStart={onStart}
          />
        ))}
      </div>
    </section>
  )
}
