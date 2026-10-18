import { TemplateCard } from '@/components/templates/TemplateCard'
import { templates, type TemplateId } from '@/data/templates'

export function StarterCard({ id, onStart }: { id: TemplateId; onStart: (id: TemplateId) => void }) {
  return <TemplateCard id={id} onClick={() => onStart(id)} className="w-[300px] shrink-0" />
}

/** Starters, above My songs. */
export function StartersPanel({ onStart }: { onStart: (id: TemplateId) => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-card p-5 shadow-lift">
      <h2 className="type-nav px-0.5 text-nav-ink">Starters</h2>
      <div className="flex gap-4 overflow-x-auto">
        {templates.map((t) => (
          <StarterCard key={t.id} id={t.id} onStart={onStart} />
        ))}
      </div>
    </section>
  )
}
