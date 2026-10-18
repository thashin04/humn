import { Link } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function TitlePill({ title }: { title: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            to="/"
            className="flex h-[42px] items-center rounded-[12px] bg-card px-4 shadow-lift hover:bg-raised"
          />
        }
      >
        <p className="type-body whitespace-nowrap text-ink-1">{title}</p>
      </TooltipTrigger>
      <TooltipContent side="bottom">Back to workspace</TooltipContent>
    </Tooltip>
  )
}
