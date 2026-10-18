import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWorkspace } from '@/store/workspace'

export function TitlePill({ title, songId }: { title: string; songId: string }) {
  const updateSongTitle = useWorkspace((s) => s.updateSongTitle)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const save = () => {
    const next = draft.trim()
    if (next) updateSongTitle(songId, next)
    else setDraft(title)
    setEditing(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save()
  }

  if (editing) {
    return (
      <form onSubmit={submit} className="title-pill-expand flex h-10.5 items-center rounded-[12px] bg-card pr-3 shadow-lift">
        <BackToWorkspace />
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setDraft(title)
              setEditing(false)
            }
          }}
          aria-label="Song name"
          className="type-body w-48 max-w-[45vw] bg-transparent text-ink-1 outline-none"
        />
      </form>
    )
  }

  return (
    <div className="flex h-10.5 items-center rounded-[12px] bg-card pr-4 shadow-lift">
      <BackToWorkspace />
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => {
                setDraft(title)
                setEditing(true)
              }}
              aria-label={`Rename ${title}`}
              className="flex h-10.5 items-center pl-1"
            />
          }
        >
          <p className="type-body whitespace-nowrap text-ink-1">{title}</p>
        </TooltipTrigger>
        <TooltipContent side="bottom">Rename song</TooltipContent>
      </Tooltip>
    </div>
  )
}

function BackToWorkspace() {
  return (
    <Link
      to="/"
      aria-label="Back to workspace"
      className="group/back flex h-10.5 items-center justify-center rounded-[12px] px-3 text-ink-2 transition-[background-color,color,padding] duration-200 hover:bg-well hover:text-ink-1"
    >
      <ArrowLeft className="size-4 shrink-0" strokeWidth={1.7} />
      <span className="max-w-0 overflow-hidden whitespace-nowrap pl-0 text-[13px] opacity-0 transition-[max-width,opacity,padding] duration-200 group-hover/back:max-w-24 group-hover/back:pl-1.5 group-hover/back:opacity-100">
        Workspace /
      </span>
    </Link>
  )
}
