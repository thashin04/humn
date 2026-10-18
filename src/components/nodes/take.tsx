import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Check } from 'iconoir-react'
import { type CSSProperties } from 'react'
import iconTake from '@/assets/figma/node-icon-take.svg'
import pause from '@/assets/figma/node-pause.svg'
import play from '@/assets/figma/take-play.svg'
import { clock, type SongNode } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { NodeShell } from './NodeShell'
import { useProgress } from './usePlayback'

const BARS = {
  A: [14, 7, 18, 12, 26, 10, 9, 22, 22, 13, 13, 15, 8, 27, 16, 11, 16, 24, 11, 19, 11, 8, 26, 21, 11, 10, 23, 7],
  B: [9, 20, 11, 24, 8, 15, 26, 12, 10, 18, 22, 9, 14, 25, 11, 8, 19, 13, 23, 10, 16, 27, 12, 9, 21, 14, 10, 17],
}

type Version = 'A' | 'B'

/**
 * Two versions of what a section made, one row each. While they're being
 * made the rows listen; then each can be played, and one kept for the song.
 * While a take plays, the pipes into its section flow.
 */
export function TakeNode({ id, data, selected }: NodeProps<SongNode<'take'>>) {
  const { updateData, setPlaying, makeTakes } = useSong()
  const playing = useSong((s) => s.playing === id)
  const sectionName = useSong((s) => {
    const n = s.nodes.find((n) => n.id === data.sectionId)
    return n?.type === 'section' ? n.data.name : 'Verse'
  })
  const progress = useProgress(playing, data.length, () => setPlaying(null))
  const making = data.state === 'making'
  const kept = !making ? data.kept : undefined

  // Playing a row also picks it, so "Keep" keeps the one just heard.
  const toggle = (v: Version) => {
    if (making) return
    if (playing && data.version === v) return setPlaying(null)
    if (data.version !== v) updateData(id, { version: v })
    setPlaying(id)
  }
  const rowFor = (v: Version) => (
    <Row
      key={v}
      v={v}
      making={making}
      picked={!making && data.version === v}
      playing={playing && data.version === v}
      progress={data.version === v ? progress : 0}
      time={clock(data.length)}
      onPick={() => !making && data.version !== v && (updateData(id, { version: v }), setPlaying(null))}
      onPlay={() => toggle(v)}
      kept={kept === v}
    />
  )

  return (
    <NodeShell width={300} icon={iconTake} label={`Take · ${sectionName} ${clock(data.length)}`} selected={selected}>
      <div className="flex flex-col gap-2 px-3 pt-2.5 pb-3">
        <div className="relative flex flex-col gap-1">
          {/* The pipe from the section comes in here. */}
          <Handle type="target" id="in" position={Position.Left} isConnectable={false} className="wire-socket" />
          <span aria-hidden data-hump="" className="wire-hump" style={{ '--c': 'var(--soft-ink)' } as CSSProperties} />
          {kept ? (
            <>
              {rowFor(kept)}
              <p className="animate-row-in flex h-9 items-center gap-3 px-3 font-mono text-[12px] text-ink-3">
                <span className="w-3 text-ink-3">{kept === 'A' ? 'B' : 'A'}</span>
                <span>
                  not kept ·{' '}
                  <button
                    type="button"
                    onClick={() => updateData(id, { kept: undefined })}
                    className="nodrag text-ink-2 underline-offset-2 hover:text-ink-1 hover:underline"
                  >
                    undo
                  </button>
                </span>
              </p>
            </>
          ) : (
            (['A', 'B'] as const).map(rowFor)
          )}
        </div>

        {!kept && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={making}
              onClick={() => {
                updateData(id, { kept: data.version })
                setPlaying(null)
              }}
              className="nodrag type-action h-11 flex-1 rounded-[14px] border border-rule bg-well text-ink-1 transition-[background-color,opacity,transform] duration-150 enabled:hover:bg-level enabled:active:scale-[0.98] disabled:bg-card disabled:text-ink-3"
            >
              Keep {data.version}
            </button>
            <button
              type="button"
              disabled={making}
              onClick={() => makeTakes(data.sectionId)}
              className="nodrag type-action h-11 rounded-[14px] border border-rule px-4 text-ink-2 transition-[background-color,color,transform] duration-150 enabled:hover:bg-well enabled:hover:text-ink-1 enabled:active:scale-[0.98] disabled:text-ink-3"
            >
              Make 2 more
            </button>
          </div>
        )}
      </div>
    </NodeShell>
  )
}

function Row({
  v,
  making,
  picked,
  playing,
  progress,
  time,
  kept,
  onPick,
  onPlay,
}: {
  v: Version
  making: boolean
  picked: boolean
  playing: boolean
  progress: number
  time: string
  kept: boolean
  onPick: () => void
  onPlay: () => void
}) {
  const bars = BARS[v]
  const lit = playing || progress ? Math.round(progress * bars.length) : 0
  return (
    <div
      onClick={onPick}
      className={cn(
        'nodrag flex h-14 items-center gap-3 rounded-[14px] pr-2 pl-3 transition-colors duration-200',
        (picked || kept) && 'bg-well',
        !making && !picked && 'cursor-pointer hover:bg-well/60',
      )}
    >
      <span className={cn('w-3 font-mono text-[12px] font-medium', picked || kept ? 'text-ink-1' : 'text-ink-3')}>{v}</span>
      <div className="flex h-7 min-w-0 flex-1 items-center gap-[2.5px] overflow-hidden" aria-hidden>
        {bars.map((h, i) => (
          <span
            key={i}
            className={cn(
              'w-[2px] shrink-0 rounded-full transition-colors duration-150',
              making ? 'animate-take-listen bg-bar' : i < lit ? 'bg-ink' : 'bg-bar',
            )}
            // While it's being made the bars rise and fall in a wave, B a beat behind A.
            style={{ height: h, animationDelay: making ? `${i * 55 + (v === 'B' ? 300 : 0)}ms` : undefined }}
          />
        ))}
      </div>
      <span className="flex shrink-0 items-center gap-1 font-mono text-[12px] text-ink-3">
        {making ? (
          'listening…'
        ) : kept ? (
          <span className="type-caption flex items-center gap-1 font-sans whitespace-nowrap text-ink-2">
            <Check width={13} height={13} strokeWidth={2} />
            In song
          </span>
        ) : (
          time
        )}
      </span>
      <button
        type="button"
        disabled={making}
        aria-label={playing ? `Pause take ${v}` : `Play take ${v}`}
        onClick={(e) => {
          e.stopPropagation()
          onPlay()
        }}
        className={cn(
          'nodrag flex size-9 shrink-0 items-center justify-center rounded-full transition-[background-color,transform,opacity] duration-150 enabled:active:scale-95 disabled:opacity-40',
          playing ? 'bg-ink' : 'border border-rule bg-card enabled:hover:bg-level',
        )}
      >
        <img src={playing ? pause : play} alt="" className="size-[11px]" />
      </button>
    </div>
  )
}
