import { Handle, Position, useConnection, type NodeProps } from '@xyflow/react'
import { useMemo } from 'react'
import feelingIcon from '@/assets/figma/plug-feeling.svg'
import iconSection from '@/assets/figma/node-icon-section.svg'
import iconTakeOn from '@/assets/figma/node-icon-take-on.svg'
import iconTake from '@/assets/figma/node-icon-take.svg'
import takeA from '@/assets/figma/take-a.svg'
import takeB from '@/assets/figma/take-b.svg'
import takeMaking from '@/assets/figma/take-making.svg'
import pause from '@/assets/figma/node-pause.svg'
import play from '@/assets/figma/take-play.svg'
import { clock, ROLES, type AnySongNode, type Role, type SongNode } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { NodeShell } from './NodeShell'
import { useProgress } from './usePlayback'

// Moulded-plug layout (Figma "I · Moulded plugs"): rows 34 apart, the first
// centred 29 below the tab; Make sits 8 under the last row.
const ROW = 34
const FIRST = 29
const rowY = (i: number) => FIRST + i * ROW
const TAB = 36

const ROLE_BG: Record<Role, string> = {
  intent: 'bg-role-intent',
  melody: 'bg-role-melody',
  harmony: 'bg-role-harmony',
  mood: 'bg-role-mood',
  texture: 'bg-role-texture',
  instruments: 'bg-role-instruments',
}
const ROLE_BORDER: Record<Role, string> = {
  intent: 'border-role-intent',
  melody: 'border-role-melody',
  harmony: 'border-role-harmony',
  mood: 'border-role-mood',
  texture: 'border-role-texture',
  instruments: 'border-role-instruments',
}

const HANDLE = { minWidth: 0, minHeight: 0, background: 'transparent', border: 0, borderRadius: 0 }

/** What's plugged in, per role, from the pipes. */
function usePlugged(sectionId: string) {
  const edges = useSong((s) => s.edges)
  const nodes = useSong((s) => s.nodes)
  return useMemo(() => {
    const by: Partial<Record<Role, AnySongNode[]>> = {}
    for (const e of edges) {
      const role = e.data?.role
      const node = role && e.target === sectionId ? nodes.find((n) => n.id === e.source) : undefined
      if (role && node) (by[role] ??= []).push(node)
    }
    return by
  }, [edges, nodes, sectionId])
}

/**
 * A section: one plug per role moulded onto its left edge. A filled plug has a
 * solid dot and previews of what's in it; an open one is a ring. Pull a pipe
 * near and it snaps to the closest plug.
 */
export function SectionNode({ id, data, selected }: NodeProps<SongNode<'section'>>) {
  const plugged = usePlugged(id)
  const makeTakes = useSong((s) => s.makeTakes)
  const ready = Object.keys(plugged).length > 0
  const conn = useConnection()
  const snapping = conn.inProgress && conn.toNode?.id === id
  const snapRole = snapping ? (conn.toHandle?.id as Role | undefined) : undefined

  return (
    <NodeShell
      width={290}
      tall
      icon={iconSection}
      label={data.name}
      selected={selected}
      plugs={ROLES.map((_, i) => TAB + rowY(i))}
      tab={
        <>
          <img src={iconSection} alt="" className="size-[15px]" />
          <p className="type-title whitespace-nowrap text-ink-1">{data.name}</p>
          <p className="font-mono text-[12px] leading-none whitespace-nowrap text-ink-3">{clock(data.length)}</p>
        </>
      }
    >
      {snapping && (
        <span className="pointer-events-none absolute -top-[41px] -right-[5px] -bottom-[5px] -left-[19px] rounded-[20px] border-[1.5px] border-dashed border-select" />
      )}

      <div className="relative pt-3">
        {ROLES.map((r, i) => {
          const sources = plugged[r.id] ?? []
          const filled = sources.length > 0
          return (
            <div key={r.id} className="relative flex h-[34px] items-center pr-3.5 pl-[18px]">
              {i > 0 && <span className="absolute top-0 right-4 left-4 h-px bg-rule" />}
              {snapRole === r.id && (
                <span className={cn('absolute inset-x-2 top-0.5 bottom-0.5 rounded-[10px] border-[1.5px]', ROLE_BORDER[r.id])} />
              )}
              <span
                className={cn(
                  'absolute top-1/2 left-[-3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ease-spring',
                  filled ? cn('size-[7px]', ROLE_BG[r.id]) : cn('size-2 border-[1.5px]', ROLE_BORDER[r.id]),
                  snapRole === r.id && 'scale-150',
                )}
              />
              <Handle
                type="target"
                position={Position.Left}
                id={r.id}
                isConnectableStart={false}
                style={{ ...HANDLE, left: -14, top: '50%', width: 14, height: 22, transform: 'translateY(-50%)' }}
              />
              <p className={cn('type-caption flex-1', filled ? 'text-ink-1' : 'text-ink-3')}>{r.name}</p>
              <div className="flex">
                {sources.map((n, j) => (
                  <Preview key={n.id} node={n} last={j === sources.length - 1} />
                ))}
              </div>
            </div>
          )
        })}

        <div className="px-3 pt-2 pb-3">
          <button
            type="button"
            disabled={!ready}
            onClick={() => makeTakes(id)}
            className={cn(
              'nodrag type-action flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] transition-[background-color,transform] duration-200 active:scale-[.98]',
              ready ? 'border border-rule bg-button text-ink-1 hover:bg-level' : 'text-ink-3',
            )}
          >
            <img src={ready ? iconTakeOn : iconTake} alt="" className="size-[15px]" />
            Make 2 takes
          </button>
        </div>

        <Handle
          type="source"
          position={Position.Right}
          id="out"
          isConnectable={false}
          style={{ ...HANDLE, right: 0, left: 'auto', top: 82 - TAB, width: 2, height: 2, transform: 'translateY(-50%)' }}
        />
      </div>
    </NodeShell>
  )
}

const BARS = [4.5, 8.2, 11.8, 7.3, 3.6]

/** A 20px chip that stands for one plugged-in thing. */
function Preview({ node, last }: { node: AnySongNode; last: boolean }) {
  const chip = cn('relative size-5 shrink-0 overflow-hidden rounded-[6px] border-2 border-card bg-level', !last && '-mr-[5px]')
  switch (node.type) {
    case 'words':
      return <span className={cn(chip, 'text-center text-[14px] leading-[1.4] text-ink-2')}>“</span>
    case 'voice':
    case 'sound':
      return (
        <span className={cn(chip, 'flex items-center justify-center gap-[1.5px]')}>
          {BARS.map((h, i) => (
            <span
              key={i}
              className={cn('w-[1.6px] rounded-[1px]', node.type === 'voice' ? 'bg-role-melody' : 'bg-role-texture')}
              style={{ height: node.type === 'voice' ? h : h * 0.6 }}
            />
          ))}
        </span>
      )
    case 'photo':
      return <span className={cn(chip, 'bg-[#dcdcd8]')}>{node.data.src && <img src={node.data.src} alt="" className="size-full object-cover" />}</span>
    case 'feeling':
      return (
        <span className={cn(chip, 'flex items-center justify-center')}>
          <img src={feelingIcon} alt="" className="size-3" />
        </span>
      )
    case 'color':
      return <span className={chip} style={{ backgroundImage: node.data.gradient }} />
    case 'instrument':
      return <span className={cn(chip, 'bg-photo')}>{node.data.thumb && <img src={node.data.thumb} alt="" className="size-full object-cover" />}</span>
    case 'chords':
      return <span className={cn(chip, 'text-center text-[9px] leading-4 font-medium text-role-harmony')}>{node.data.chords[0]}</span>
    default:
      return null
  }
}

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

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={false}
        style={{ ...HANDLE, left: 0, top: 82, width: 2, height: 2, transform: 'translateY(-50%)' }}
      />
    </div>
  )
}
