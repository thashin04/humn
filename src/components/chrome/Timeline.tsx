import { Play } from 'iconoir-react'

export function Timeline() {
  return (
    <div className="flex flex-col border-t border-rule bg-card">
      <div className="flex items-center justify-between px-6 pt-3 pb-2">
        <p className="type-caption text-ink-2">Song timeline</p>
        <button
          aria-label="Play song"
          className="flex size-9 items-center justify-center rounded-full border border-rule bg-well text-ink-1"
        >
          <Play width={16} height={16} strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex h-[100px] items-center gap-2 px-6">
        <button className="type-caption flex h-[72px] items-center rounded-[12px] border border-dashed border-rule px-3.5 py-2.5 text-ink-4">
          + Add section
        </button>
      </div>
    </div>
  )
}
