import { Handle, Position, type NodeProps } from '@xyflow/react'
import pause from '@/assets/figma/node-pause.svg'
import takeA from '@/assets/figma/take-a.svg'
import takeB from '@/assets/figma/take-b.svg'
import takeMaking from '@/assets/figma/take-making.svg'
import play from '@/assets/figma/take-play.svg'
import { clock, type SongNode } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { useProgress } from './usePlayback'

const TAKE_A = [32, 15, 40, 28, 59, 23, 21, 49, 49, 30, 30, 34, 19, 61, 35, 25, 36, 53, 24, 42, 24, 18, 58, 47, 25, 22, 51, 16, 51, 18]
const TAKE_B = [...TAKE_A].reverse()

/**
 * Two versions of what a section made. Making ("listening…") until it's
 * ready; then A/B tabs to switch, and play. While it plays, the pipes into its
 * section flow and anything recorded plays along.
 */
export function TakeNode({ id, data, selected }: NodeProps<SongNode<'take'>>) {
  const { updateData, setPlaying } = useSong()
  const playing = useSong((s) => s.playing === id)
  const sectionName = useSong((s) => {
    const n = s.nodes.find((n) => n.id === data.sectionId)
    return n?.type === 'section' ? n.data.name : 'Verse'
  })
  const progress = useProgress(playing, data.length, () => setPlaying(null))
  const making = data.state === 'making'
  const b = data.version === 'B' && !making
  const bars = b ? TAKE_B : TAKE_A
  const lit = playing ? Math.round(progress * bars.length) : 0

  const pick = (version: 'A' | 'B') => {
    if (making || version === data.version) return
    updateData(id, { version })
    if (playing) setPlaying(null)
  }

  return (
    <div
      className={cn(
        'relative w-[240px] animate-node-enter text-left transition-[filter] duration-200',
        making ? 'h-[142px]' : 'h-[166px]',
        selected
          ? 'drop-shadow-[0_0_1.5px_var(--soft-accent)]'
          : 'drop-shadow-[0_4px_7px_rgb(20_22_26/0.05)] drop-shadow-[0_0_0.5px_rgb(20_22_26/0.13)]',
      )}
    >
      <img src={making ? takeMaking : b ? takeB : takeA} alt="" className="absolute inset-0 size-full max-w-none" />
      <span className={cn('absolute top-0 h-[22px] w-10 rounded-[9px] bg-card', b ? 'left-0' : 'left-[46px]')} />
      {(['A', 'B'] as const).map((v) => {
        const on = v === (b ? 'B' : 'A')
        return (
          <button
            key={v}
            type="button"
            disabled={making}
            onClick={() => pick(v)}
            aria-pressed={on}
            aria-label={`Take ${v}`}
            className={cn(
              'nodrag absolute top-0 h-[26px] w-10 font-mono text-[11.5px] leading-none font-medium',
              v === 'A' ? 'left-0' : 'left-[46px]',
              on ? 'pt-0.5 text-ink-1' : 'pb-1 text-ink-3 enabled:hover:text-ink-1',
            )}
          >
            {v}
          </button>
        )
      })}

      <div className="absolute top-7 left-0 flex w-[240px] flex-col gap-3 px-4 pt-3 pb-3.5">
        <div className={cn('flex h-16 items-center gap-1', making && 'animate-pulse opacity-45')}>
          {bars.map((h, i) => (
            <span
              key={i}
              className={cn('w-[3px] rounded-[1.5px] transition-colors duration-150', i < lit ? 'bg-ink' : 'bg-bar')}
              style={{ height: h }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <p className="flex-1 font-mono text-[12px] leading-none text-ink-3">
            {making ? 'listening…' : `${sectionName} · ${clock(data.length)}`}
          </p>
          {!making && (
            <button
              type="button"
              aria-label={playing ? `Pause take ${data.version}` : `Play take ${data.version}`}
              onClick={() => setPlaying(playing ? null : id)}
              className={cn(
                'nodrag flex size-[30px] items-center justify-center rounded-full transition-[background-color,transform] duration-150 active:scale-95',
                playing ? 'bg-ink' : 'border-[0.833px] border-rule bg-well hover:bg-level',
              )}
            >
              <img src={playing ? pause : play} alt="" className="size-[10.833px]" />
            </button>
          )}
        </div>
      </div>

      <Handle type="target" id="in" position={Position.Left} isConnectable={false} className="wire-in" style={{ top: 82 }} />
    </div>
  )
}
