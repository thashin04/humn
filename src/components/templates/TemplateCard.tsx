import { templates, type TemplateId } from '@/data/templates'
import { cn } from '@/lib/utils'

/** A template: its photo, its name, and what it's made of. */
export function TemplateCard({
  id,
  selected,
  onClick,
  className,
}: {
  id: TemplateId
  selected?: boolean
  onClick: () => void
  className?: string
}) {
  const t = templates.find((t) => t.id === id)!
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group flex flex-col overflow-hidden rounded-[20px] border bg-card text-left transition-[transform,box-shadow,border-color] duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lift active:scale-[.99]',
        selected ? 'border-select ring-1 ring-select' : 'border-rule',
        className,
      )}
    >
      <span className="block h-[186px] w-full overflow-hidden">
        <img
          src={t.image}
          alt=""
          draggable={false}
          className="size-full object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.03]"
        />
      </span>
      <span className="flex flex-col gap-1 px-5 pt-4 pb-5">
        <span className="text-[17px] leading-[1.3] text-ink">{t.name}</span>
        <span className="text-[15px] leading-[1.3] text-ink-3">{t.ingredients}</span>
      </span>
    </button>
  )
}
