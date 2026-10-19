import { NavArrowLeft } from 'iconoir-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWorkspace } from '@/store/workspace'

/** Back to the workspace, then the song's name, which renames in place when pressed. */
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
      <BackToWorkspace />
      <span className="mx-0.5 h-[18px] w-px bg-rule" />
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

/** The way back, which says where it goes when hovered. */
function BackToWorkspace() {
  return (
    <Link
      to="/"
      aria-label="Back to workspace"
      className="group/back flex h-[30px] items-center rounded-[8px] px-1.5 text-ink-2 transition-colors duration-200 hover:bg-well hover:text-ink-1"
    >
      <NavArrowLeft width={18} height={18} className="shrink-0" />
      <span className="type-caption max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,padding] duration-200 group-hover/back:max-w-24 group-hover/back:pr-1 group-hover/back:pl-1 group-hover/back:opacity-100">
        Workspace
      </span>
    </Link>
  )
}
