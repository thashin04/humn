import type { NodeProps } from '@xyflow/react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import iconChords from '@/assets/figma/node-icon-chords.svg'
import iconColour from '@/assets/figma/node-icon-colour.svg'
import iconFeeling from '@/assets/figma/node-icon-feeling.svg'
import iconInstrument from '@/assets/figma/node-icon-instrument.svg'
import iconPhoto from '@/assets/figma/node-icon-photo.svg'
import iconSound from '@/assets/figma/node-icon-sound.svg'
import iconVoice from '@/assets/figma/node-icon-voice.svg'
import iconWords from '@/assets/figma/node-icon-words.svg'
import tryPlay from '@/assets/figma/node-instrument-play.svg'
import place from '@/assets/figma/node-place.svg'
import { clock, type SongNode } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useFeedsPlaying, useSong } from '@/store/song'
import { NodeShell } from './NodeShell'
import { PlayButton, Waveform } from './parts'
import { usePlayback, useProgress } from './usePlayback'

const STARTERS = ['Someone', 'A memory', 'A feeling']

/** Intent. The words themselves. */
export function WordsNode({ id, data, selected }: NodeProps<SongNode<'words'>>) {
  const updateData = useSong((s) => s.updateData)
  const [editing, setEditing] = useState(!data.text)
  const field = useRef<HTMLTextAreaElement>(null)
  const empty = !data.text.trim()

  // A Prompt that's just been added is ready to type into. The node renders
  // hidden until React Flow has measured it, so focus once it's shown.
  const fresh = useRef(selected && empty)
  useEffect(() => {
    if (!fresh.current) return
    const t = setTimeout(() => field.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <NodeShell width={empty ? 290 : 250} icon={iconWords} label="Prompt" selected={selected} connector="intent">
      <div className="flex flex-col gap-[14px] pt-[18px] pr-[22px] pb-5 pl-5">
        {editing ? (
          <textarea
            ref={field}
            rows={1}
            value={data.text}
            placeholder="What's this song for?"
            onChange={(e) => updateData(id, { text: e.target.value })}
            onBlur={() => !empty && setEditing(false)}
            onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
            className="nodrag nowheel field-sizing-content w-full resize-none bg-transparent text-[17px] leading-[1.36] tracking-[-0.01em] text-ink-1 outline-none placeholder:text-ink-3"
          />
        ) : (
          <p
            onDoubleClick={() => setEditing(true)}
            className="text-[17px] leading-[1.36] tracking-[-0.01em] break-words whitespace-pre-wrap text-ink-1"
          >
            {data.text}
          </p>
        )}
        {empty && (
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  updateData(id, { text: `${s.toLowerCase()} ` })
                  setEditing(true)
                  requestAnimationFrame(() => field.current?.focus())
                }}
                className="nodrag type-caption flex h-[26px] items-center rounded-[8px] bg-well px-2.5 text-ink-2 transition-colors hover:bg-level hover:text-ink-1"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </NodeShell>
  )
}

/** Melody capsule. 60 tall. */
export function VoiceNode({ id, data, selected }: NodeProps<SongNode<'voice'>>) {
  const own = usePlayback(data.duration)
  // Plugged into a section whose take is playing, the recording plays along.
  const fed = useFeedsPlaying(id)
  const fedProgress = useProgress(fed, data.duration, () => {})
  const playing = own.playing || fed
  const progress = fed ? fedProgress : own.progress
  const toggle = own.toggle
  return (
    <NodeShell width={262} icon={iconVoice} label="Record" meta={clock(data.duration)} selected={selected} connector="melody">
      <div className="flex h-[60px] items-center gap-3 pr-5 pl-3">
        <PlayButton playing={playing} onClick={toggle} label={data.label} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
          <p className="type-caption truncate text-ink-2">{data.label}</p>
          <Waveform kind="melody" progress={progress} />
        </div>
      </div>
    </NodeShell>
  )
}

/** Mood. Framed photo with a caption. */
export function PhotoNode({ data, selected }: NodeProps<SongNode<'photo'>>) {
  return (
    <NodeShell width={200} icon={iconPhoto} label="Image" selected={selected} connector="mood">
      <div className="px-2 pt-2 pb-1.5">
        <div className="h-[150px] overflow-hidden rounded-[9px] bg-photo">
          {data.src && <img src={data.src} alt={data.caption} className="size-full object-cover" draggable={false} />}
        </div>
        <p className="type-caption truncate px-1 pt-[9px] pb-0.5 text-ink-2">{data.caption}</p>
      </div>
    </NodeShell>
  )
}

/** Mood capsule, 48 tall. The fill is the amount; drag across it to change it. */
export function FeelingNode({ id, data, selected }: NodeProps<SongNode<'feeling'>>) {
  const updateData = useSong((s) => s.updateData)
  const [dragging, setDragging] = useState(false)

  const setFrom = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * 220 - 5
    updateData(id, { amount: Math.round(Math.min(1, Math.max(0.05, x / 210)) * 100) / 100 })
  }

  return (
    <NodeShell width={220} icon={iconFeeling} label="Feeling" selected={selected} connector="mood">
      <div
        role="slider"
        aria-label={`How much ${data.name}`}
        aria-valuenow={Math.round(data.amount * 100)}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
          setFrom(e)
        }}
        onPointerMove={(e) => dragging && setFrom(e)}
        onPointerUp={() => setDragging(false)}
        onKeyDown={(e) => {
          const step = e.key === 'ArrowRight' ? 0.05 : e.key === 'ArrowLeft' ? -0.05 : 0
          if (step) updateData(id, { amount: Math.min(1, Math.max(0.05, Math.round((data.amount + step) * 100) / 100)) })
        }}
        className="nodrag relative flex h-12 cursor-ew-resize items-center gap-2.5 px-[18px] outline-none select-none"
      >
        <span
          className={cn('absolute top-[5px] left-[5px] h-[38px] rounded-[10px] bg-level', !dragging && 'transition-[width] duration-300 ease-soft')}
          style={{ width: data.amount * 210 }}
        />
        <p className="type-title relative min-w-0 flex-1 truncate text-ink-1">{data.name}</p>
        <p className="relative font-mono text-[12px] leading-none text-ink-3">{Math.round(data.amount * 100)}%</p>
      </div>
    </NodeShell>
  )
}

/** Texture capsule. */
export function SoundNode({ data, selected }: NodeProps<SongNode<'sound'>>) {
  return (
    <NodeShell width={262} icon={iconSound} label="Audio" meta={clock(data.duration)} selected={selected} connector="texture">
      <div className="flex h-[60px] items-center gap-3 pr-5 pl-3">
        <img src={data.place ?? place} alt="" className="size-9 shrink-0 rounded-full object-cover" draggable={false} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
          <p className="type-caption truncate text-ink-2">{data.label}</p>
          <Waveform kind="texture" />
        </div>
      </div>
    </NodeShell>
  )
}

/** Mood. A swatch. */
export function ColorNode({ data, selected }: NodeProps<SongNode<'color'>>) {
  return (
    <NodeShell width={140} icon={iconColour} label="Mood" selected={selected} connector="mood">
      <div className="size-[140px] p-1.5">
        <div className="relative size-full overflow-hidden rounded-[11px]" style={{ backgroundImage: data.gradient }}>
          <p className="type-small absolute top-[104px] left-2.5 whitespace-nowrap text-on-ink">{data.label}</p>
        </div>
      </div>
    </NodeShell>
  )
}

/** Instruments. Row with a lid and a separate try-it button. */
export function InstrumentNode({ data, selected }: NodeProps<SongNode<'instrument'>>) {
  return (
    <NodeShell width={270} icon={iconInstrument} label={data.tab} selected={selected} connector="instruments">
      <div className="relative h-20">
        <div className="absolute top-3 left-3 size-14 overflow-hidden rounded-[10px] bg-photo">
          {data.thumb && <img src={data.thumb} alt="" className="size-full object-cover" draggable={false} />}
        </div>
        <p className="type-title absolute top-[21px] left-[81px] max-w-[125px] truncate text-ink-1">{data.name}</p>
        <p className="type-small absolute top-[43px] left-[81px] max-w-[125px] truncate text-ink-3">{data.detail}</p>
        <button
          type="button"
          aria-label={`Try ${data.name}`}
          className="nodrag absolute top-5 left-[216px] flex size-10 items-center justify-center rounded-[10px] bg-well transition-[background-color,transform] duration-150 hover:bg-level active:scale-95"
        >
          <img src={tryPlay} alt="" className="size-4" />
        </button>
      </div>
    </NodeShell>
  )
}

// Roman numerals against the first chord as home, so people can see the shape without theory.
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const DEGREE: Record<number, string> = { 0: 'I', 2: 'II', 4: 'III', 5: 'IV', 7: 'V', 9: 'VI', 11: 'VII' }
function numeral(chord: string, home: string) {
  const pc = (c: string) => (PC[c[0]] ?? 0) + (/^.[#♯]/.test(c) ? 1 : /^.[b♭]/.test(c) ? -1 : 0)
  const n = DEGREE[(pc(chord) - pc(home) + 12) % 12]
  if (!n) return ''
  return /^.[#♯b♭]?m(?!aj)/.test(chord) ? n.toLowerCase() : n
}

/** Harmony. Not in Figma yet; built in the capsule family. */
export function ChordsNode({ data, selected }: NodeProps<SongNode<'chords'>>) {
  const { playing, progress, toggle } = usePlayback(data.chords.length * 1.2)
  const at = playing ? Math.min(data.chords.length - 1, Math.floor(progress * data.chords.length)) : -1
  return (
    <NodeShell width={262} icon={iconChords} label="Chords" selected={selected} connector="harmony">
      <div className="flex h-[60px] items-center gap-3 pr-5 pl-3">
        <PlayButton playing={playing} onClick={toggle} label="chords" />
        <div className="flex min-w-0 gap-1 overflow-hidden">
          {data.chords.map((c, i) => (
            <span
              key={i}
              className={cn(
                'flex h-[38px] min-w-[38px] flex-col items-center justify-center rounded-[8px] px-1.5 transition-colors duration-150',
                i === at ? 'bg-role-harmony text-on-ink' : 'bg-well text-ink-1',
              )}
            >
              <span className="text-[12.5px] leading-[1.1]">{c}</span>
              <span className={cn('font-mono text-[10px] leading-[1.2]', i === at ? 'text-on-ink/80' : 'text-role-harmony')}>
                {numeral(c, data.chords[0])}
              </span>
            </span>
          ))}
        </div>
      </div>
    </NodeShell>
  )
}
