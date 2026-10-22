import { useState } from 'react'
import { ArrowLeft } from 'iconoir-react'
import { Link } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWorkspace } from '@/store/workspace'

/** The song's name, which renames in place when pressed. */
export function TitlePill({ songId, title }: { songId: string; title: string }) {
  const updateSongTitle = useWorkspace((s) => s.updateSongTitle)
  const [draft, setDraft] = useState<string | null>(null)
  const save = () => {
    const next = draft?.trim()
    if (next && next !== title) updateSongTitle(songId, next)
    setDraft(null)
  }

  return (
    <div className="flex h-[42px] items-center gap-1 rounded-[12px] bg-card pr-1.5 pl-1.5 shadow-lift">
      <Link
        to="/"
        aria-label="Back to workspace"
        className="group type-body flex h-[30px] shrink-0 items-center rounded-[8px] px-2 text-ink-1 transition-colors hover:bg-well focus-visible:bg-well focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-select"
      >
        <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
        <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-200 ease-out group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] motion-reduce:transition-none">
          <span className="overflow-hidden">
            <span className="block pl-1.5 whitespace-nowrap">Workspace</span>
          </span>
        </span>
      </Link>
      {draft === null ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={`Rename ${title}`}
                onClick={() => setDraft(title)}
                className="type-body h-[30px] cursor-text rounded-[8px] px-2.5 whitespace-nowrap text-ink-1 transition-colors hover:bg-well"
              />
            }
          >
            {title}
          </TooltipTrigger>
          <TooltipContent side="bottom">Rename</TooltipContent>
        </Tooltip>
      ) : (
        <input
          autoFocus
          aria-label="Song name"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setDraft(null)
          }}
          className="type-body field-sizing-content h-[30px] max-w-[45vw] min-w-[80px] rounded-[8px] bg-well px-2.5 text-ink-1 ring-1 ring-select/50 outline-none"
        />
      )}
    </div>
  )
}
