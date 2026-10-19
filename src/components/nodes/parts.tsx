import { PauseSolid, PlaySolid } from 'iconoir-react'
import dotInstruments from '@/assets/figma/node-dot-instruments.svg'
import dotIntent from '@/assets/figma/node-dot-intent.svg'
import dotMelody from '@/assets/figma/node-dot-melody.svg'
import dotMood from '@/assets/figma/node-dot-mood.svg'
import dotTexture from '@/assets/figma/node-dot-texture.svg'
import type { Role } from '@/data/nodes'
import { cn } from '@/lib/utils'

const DOTS: Partial<Record<Role, string>> = {
  intent: dotIntent,
  melody: dotMelody,
  mood: dotMood,
  texture: dotTexture,
  instruments: dotInstruments,
}

export function RoleDot({ role, className }: { role: Role; className?: string }) {
  const src = DOTS[role]
  if (src) return <img src={src} alt="" className={cn('size-1.5 shrink-0', className)} />
  // Harmony has no Figma asset yet.
  return <span className={cn('size-1.5 shrink-0 rounded-full bg-role-harmony', className)} />
}

/** 36 round. A well at rest; the one dark element while it plays. */
export function PlayButton({ playing, onClick, label }: { playing: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      onClick={onClick}
      className={cn(
        'nodrag flex size-9 shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-150 active:scale-95',
        playing ? 'bg-ink' : 'border border-rule bg-well hover:bg-level',
      )}
    >
      {playing ? <PauseSolid className="size-3.5 text-on-ink" /> : <PlaySolid className="size-3.5 text-ink-1" />}
    </button>
  )
}

// Bar heights from the Figma waveform component.
const MELODY = [5, 13, 8, 18, 7, 6, 16, 16, 9, 9, 11, 5, 19, 11, 8, 12, 17, 7, 13, 8, 6, 18, 15, 7, 7, 17, 5, 15]
const TEXTURE = [
  5, 10, 5, 9, 6, 6, 9, 11, 4, 6, 8, 6, 9, 8, 6, 7, 11, 6, 7, 7, 7, 9, 10, 5, 5, 11, 7, 8, 4, 7, 8, 11, 5, 5, 10, 8,
  8, 7, 7, 6, 11, 6, 6, 8,
]

/** Melody: tall, 3px bars. Texture: flat and dense. Playing fills the first part in the role colour. */
export function Waveform({ kind, progress = 0 }: { kind: 'melody' | 'texture'; progress?: number }) {
  const bars = kind === 'melody' ? MELODY : TEXTURE
  const lit = Math.round(progress * bars.length)
  return (
    <div className={cn('flex h-5 items-center', kind === 'melody' ? 'w-[178.5px] gap-[3.5px]' : 'w-[174px] gap-0.5')}>
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn(
            'shrink-0 rounded-[1.5px] transition-colors duration-150',
            kind === 'melody' ? 'w-[3px]' : 'w-0.5',
            i < lit ? (kind === 'melody' ? 'bg-role-melody' : 'bg-role-texture') : 'bg-bar',
          )}
          style={{ height: h }}
        />
      ))}
    </div>
  )
}
