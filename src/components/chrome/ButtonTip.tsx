import type { ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** A label that shows on hover, with the key that does the same thing when there is one. */
export function ButtonTip({
  label,
  keys,
  side = 'top',
  children,
}: {
  label: string
  keys?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** The button it labels. */
  children: ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} sideOffset={8}>
        {label}
        {keys && <span className="font-mono text-[11px] opacity-55">{keys}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
