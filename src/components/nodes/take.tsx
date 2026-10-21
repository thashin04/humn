import { Position, type NodeProps } from '@xyflow/react'
import { Check, MusicNote, PauseSolid, PlaySolid } from 'iconoir-react'
import { useContext, type CSSProperties } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { nameOf } from '@/data/library'
import { clock, roleOf, type SongNode } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useInPickedClip, useSong } from '@/store/song'
import { NodeShell } from './NodeShell'
import { NodeHandle } from './preview'
import { Preview } from './previewContext'
import { useProgress } from './usePlayback'
import { TAKE_BARS } from './waves'


/**
 * One idea a section made. Until it's added to the timeline it's only
 * proposed: a dashed outline, a "Proposed" tag and one thing to do, add it.
 * Once it's in the song it's solid, says so, and grows a connector so it can
 * carry on into the next part. Selecting it opens its panel to trim and fade.
 */
export function TakeNode({ id, data, selected }: NodeProps<SongNode<'take'>>) {
  const { setPlaying, addToTimeline, toggleTimeline } = useSong()
  const timelineOpen = useSong((s) => s.timelineOpen)
  const playing = useSong((s) => s.playing === id)
  const inPickedClip = useInPickedClip(id)
  const preview = useContext(Preview)
  const sectionName = useSong((s) => {
    const n = s.nodes.find((n) => n.id === data.sectionId)
    return n?.type === 'section' ? n.data.name : 'Verse'
  })
  const progress = useProgress(playing, data.length, () => setPlaying(null))
  // Cards plugged straight into the take (demo), and a wire being pulled toward it.
  // (Selected as plain strings, so the selection stays equal while nothing changes.)
  const plugged = useSong(
    useShallow((s) =>
      (data.sources ?? []).flatMap((src) => {
        const n = s.nodes.find((m) => m.id === src)
        return n ? [`${roleOf(n.type)}|${nameOf(n.data as Record<string, unknown>)}`] : []
      }),
    ),
  )
  const inputs = plugged.map((p) => ({ role: p.slice(0, p.indexOf('|')), name: p.slice(p.indexOf('|') + 1) }))
  const hot = useSong((s) => (s.snap?.section === id ? s.snap.role : null))
  const socket = (
    <NodeHandle type="target" id="add" position={Position.Left} isConnectableStart={false} className="wire-socket" />
  )
  const making = data.state === 'making'
  const added = !!data.added && !making
  const bars = TAKE_BARS[data.version]
  const lit = Math.round(progress * bars.length)

  return (
    <NodeShell
      width={280}
      icon={MusicNote}
      label={`Take ${data.version} · ${sectionName}`}
      meta={clock(data.length)}
      selected={selected || inPickedClip}
      dashed={!added}
      port={added ? 'follows' : undefined}
    >
      <div className="flex flex-col gap-2.5 px-3 pt-2 pb-3">
        <div className="relative flex h-12 items-center gap-2.5 pl-1">
          {/* The pipe from the section comes in here; a branch's leaves from the other side. */}
          <NodeHandle type="target" id="in" position={Position.Left} isConnectable={false} className="wire-socket" />
          {!preview && <span aria-hidden data-hump="" className="wire-hump" style={{ '--c': 'var(--soft-ink)' } as CSSProperties} />}
          <NodeHandle type="source" id="out" position={Position.Right} isConnectable={false} className="wire-out" style={{ top: '50%', right: -12 }} />

          <div className={cn('flex h-7 min-w-0 flex-1 items-center gap-[2.5px] overflow-hidden', !added && !making && 'opacity-70')} aria-hidden>
            {bars.map((h, i) => (
              <span
                key={i}
                className={cn(
                  'w-[2px] shrink-0 rounded-full transition-colors duration-150',
                  making ? 'animate-take-listen bg-bar' : i < lit ? 'bg-ink' : 'bg-bar',
                )}
                // While it's being made the bars rise and fall in a wave, B a beat behind A.
                style={{ height: h, animationDelay: making ? `${i * 55 + (data.version === 'B' ? 300 : 0)}ms` : undefined }}
              />
            ))}
          </div>
          <span className="shrink-0 font-mono text-[12px] text-ink-3">{making ? 'listening…' : clock(data.length)}</span>
          <button
            type="button"
            disabled={making}
            aria-label={playing ? `Pause take ${data.version}` : `Play take ${data.version}`}
            onClick={() => setPlaying(playing ? null : id)}
            className={cn(
              'nodrag flex size-9 shrink-0 items-center justify-center rounded-full transition-[background-color,transform,opacity] duration-150 enabled:active:scale-95 disabled:opacity-40',
              playing ? 'bg-ink' : 'border border-rule bg-well enabled:hover:bg-level',
            )}
          >
            {playing ? <PauseSolid className="size-3 text-on-ink" /> : <PlaySolid className="size-3 text-ink-1" />}
          </button>
        </div>

        {/* What's plugged straight into the take, on its own socket; or, while a wire is pulled to it, where it'll land. */}
        {(inputs.length > 0 || hot) && (
          <div
            className={cn(
              'relative flex h-9 items-center gap-2 rounded-[10px] border px-2.5 transition-[border-color,background-color] duration-200',
              hot ? 'border-[var(--c)] bg-[color-mix(in_srgb,var(--c)_6%,var(--soft-card))]' : 'border-rule',
            )}
            style={{ '--c': `var(--soft-role-${hot ?? inputs[0].role})` } as CSSProperties}
          >
            {socket}
            {!preview && <span aria-hidden data-hump="" className="wire-hump" />}
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--c)]" />
            <p className="type-caption min-w-0 truncate text-ink-1">
              {hot && !inputs.length ? 'Plug in to make it again' : `With ${inputs.map((i) => i.name).join(' + ')}`}
            </p>
          </div>
        )}

        {added ? (
          <div className="relative flex h-10 items-center gap-2">
            {!inputs.length && !hot && socket}
            <span className="type-caption flex h-7 items-center gap-1.5 rounded-full bg-ink pr-3 pl-2 text-on-ink">
              <Check width={13} height={13} />
              In timeline
            </span>
            <span className="flex-1" />
            {!timelineOpen && (
              <button
                type="button"
                onClick={toggleTimeline}
                className="nodrag type-caption h-8 rounded-full px-2.5 text-ink-2 transition-colors hover:bg-well hover:text-ink-1"
              >
                Open timeline
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex items-center gap-2">
            {!inputs.length && !hot && socket}
            <span className="type-small flex h-6 shrink-0 items-center rounded-full border border-dashed border-rule-strong px-2 text-ink-3">
              Proposed
            </span>
            <button
              type="button"
              disabled={making}
              onClick={() => addToTimeline(id)}
              className="nodrag type-action flex h-10 flex-1 items-center justify-center rounded-[12px] bg-ink text-on-ink transition-[opacity,transform] duration-150 hover:opacity-90 enabled:active:scale-[0.98] disabled:bg-well disabled:text-ink-3"
            >
              {making ? 'Listening…' : 'Add to timeline'}
            </button>
          </div>
        )}
      </div>
    </NodeShell>
  )
}
