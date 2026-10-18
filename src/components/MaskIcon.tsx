import { cn } from '@/lib/utils'

/** Renders an SVG asset as a mask so it takes the current text colour. */
export function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-4 shrink-0 bg-current', className)}
      style={{ mask: `url("${src}") center / contain no-repeat`, WebkitMask: `url("${src}") center / contain no-repeat` }}
    />
  )
}
