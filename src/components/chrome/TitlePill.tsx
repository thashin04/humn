import { NavArrowLeft } from 'iconoir-react'
import { Link } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Back to the workspace, then the song's name. */
export function TitlePill({ title }: { title: string }) {
  return (
    <div className="flex h-[42px] items-center gap-1 rounded-[12px] bg-card pr-4 pl-1.5 shadow-lift">
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              to="/"
              aria-label="Back to workspace"
              className="flex size-[30px] items-center justify-center rounded-[8px] text-ink-2 transition-colors hover:bg-well hover:text-ink-1"
            />
          }
        >
          <NavArrowLeft width={18} height={18} strokeWidth={1.6} />
        </TooltipTrigger>
        <TooltipContent side="bottom">Back to workspace</TooltipContent>
      </Tooltip>
      <span className="mr-2 h-[18px] w-px bg-rule" />
      <p className="type-body whitespace-nowrap text-ink-1">{title}</p>
    </div>
  )
}
