import gridIcon from '@/assets/figma/ws-icon-grid.svg'
import listIcon from '@/assets/figma/ws-icon-list.svg'
import searchIcon from '@/assets/figma/ws-search.svg'
import { MaskIcon } from '@/components/MaskIcon'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'

export function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-[30px] w-[220px] items-center gap-1.5 rounded-[8px] border border-nav-rule bg-raised px-2.5">
      <img src={searchIcon} alt="" />
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
    <div className="flex rounded-[8px] border border-nav-rule bg-raised p-0.5">
      {(
        [
          ['grid', gridIcon, 'Grid'],
          ['list', listIcon, 'List'],
        ] as const
      ).map(([id, icon, label]) => (
        <button
          key={id}
          onClick={() => setLayout(id)}
          aria-label={`${label} view`}
          aria-pressed={layout === id}
          className={cn(
            'flex h-6 w-7 items-center justify-center rounded-[6px] transition-[background-color,color,box-shadow,transform] duration-400 ease-out',
            layout === id ? 'bg-nav-active text-nav-ink' : 'text-nav-ink-2',
          )}
        >
          <MaskIcon src={icon} className="size-3.5" />
        </button>
      ))}
    </div>
  )
}
