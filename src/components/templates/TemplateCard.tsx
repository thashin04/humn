import { templates, type TemplateId } from '@/data/templates'
import { cn } from '@/lib/utils'

/** A template: its photo, its name, and what it's made of. */
export function TemplateCard({
  id,
  selected,
  compact,
  onClick,
  className,
}: {
  id: TemplateId
  selected?: boolean
  /** Shorter photo and type, for a row of them that scrolls. */
  compact?: boolean
  onClick: () => void
  className?: string
}) {
  const t = templates.find((t) => t.id === id)!
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group flex flex-col overflow-hidden text-left',
        compact ? 'rounded-[16px]' : 'rounded-[20px]',
        'border bg-card transition-[transform,box-shadow,border-color] duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lift active:scale-[.99]',
        selected ? 'border-select ring-1 ring-select' : 'border-rule',
        className,
      )}
    >
      {/* A little film grain over every photo, so stock and generated ones sit together. */}
      <span className={cn('grain relative block w-full overflow-hidden', compact ? 'h-[116px]' : 'h-[186px]')}>
        <img
          src={t.image}
          alt=""
          draggable={false}
          className="size-full object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.03]"
        />
      </span>
      <span className={cn('flex flex-col', compact ? 'gap-0.5 px-4 pt-3 pb-3.5' : 'gap-1 px-5 pt-4 pb-5')}>
        <span className={cn('leading-[1.3] text-ink', compact ? 'text-[15px]' : 'text-[17px]')}>{t.name}</span>
        <span className={cn('leading-[1.3] text-ink-3', compact ? 'text-[13px]' : 'text-[15px]')}>{t.ingredients}</span>
      </span>
    </button>
  )
}
