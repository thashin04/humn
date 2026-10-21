import { List, Search, ViewGrid } from 'iconoir-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'

export function SearchField({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={cn('flex h-[30px] w-[220px] items-center gap-1.5 rounded-[8px] border border-nav-rule bg-raised px-2.5', className)}>
      <Search className="size-3.5 shrink-0 text-nav-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search songs"
        aria-label="Search songs"
        className="min-w-0 flex-1 bg-transparent text-[13px] leading-[1.45] text-nav-ink outline-none placeholder:text-nav-ink-3"
      />
    </label>
  )
}

export function LayoutToggle() {
  const { layout, setLayout } = useWorkspace()
  return (
    <div className="flex h-9 items-center gap-0.5 rounded-full border border-nav-rule bg-raised p-1">
      {(
        [
          ['grid', ViewGrid, 'Grid'],
          ['list', List, 'List'],
        ] as const
      ).map(([id, Icon, label]) => (
        <button
          key={id}
          onClick={() => setLayout(id)}
          aria-label={`${label} view`}
          aria-pressed={layout === id}
          className={cn(
            'flex h-full w-9 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-400 ease-out',
            layout === id ? 'bg-nav-active text-nav-ink' : 'text-nav-ink-2',
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  )
}
