import { Check, Pause, Play, Refresh, SoundHigh, Xmark } from 'iconoir-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import iconTake from '@/assets/figma/node-icon-take.svg'
import { TAKE_BARS } from '@/components/nodes/waves'
import { useProgress } from '@/components/nodes/usePlayback'
import { type SongNode, type TakeEdit } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const tenths = (n: number) => Math.round(n * 10) / 10
/** 0:12.0, as in the take panel mock. */
const stamp = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
const decibels = (v: number) => (v <= 0.001 ? '−∞ dB' : `${Math.round(20 * Math.log10(v))} dB`.replace('-', '−'))

/**
 * The selected take's panel, sliding out on the right like a verse's: trim it,
 * set how loud it plays and how it fades, then add it to the timeline. Once
 * it's in the song, changes here carry through to it there.
 */
export function TakePanel() {
  const take = useSong((s) => {
    const picked = s.nodes.filter((n) => n.selected)
    return picked.length === 1 && picked[0].type === 'take' && picked[0].data.state === 'done' ? (picked[0] as SongNode<'take'>) : null
  })

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {take && (
          <motion.aside
            key={take.id}
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.98, transition: { duration: 0.16, ease: [0.25, 0.8, 0.25, 1] } }}
            transition={{ type: 'spring', visualDuration: 0.34, bounce: 0.18 }}
            style={{ transformOrigin: '100% 0%' }}
            className="pointer-events-auto flex max-h-full w-[320px] flex-col overflow-hidden rounded-[26px] bg-card shadow-lift"
            aria-label={`Take ${take.data.version}`}
          >
            <Edit take={take} />
          </motion.aside>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}

function Edit({ take }: { take: SongNode<'take'> }) {
  const { onNodesChange, editTake, addToTimeline, setPlaying, toggleTimeline } = useSong()
  const songTitle = useWorkspace((w) => w.songs.find((s) => s.id === useSong.getState().songId)?.title)
  const timelineOpen = useSong((s) => s.timelineOpen)
  const sectionName = useSong((s) => {
    const n = s.nodes.find((n) => n.id === take.data.sectionId)
    return n?.type === 'section' ? n.data.name : 'Verse'
  })
  const { id, data } = take
  const length = data.length
  const e: TakeEdit = data.edit ?? { from: 0, to: length, volume: 1, fadeIn: 0, fadeOut: 0 }
  const set = (patch: Partial<TakeEdit>) => editTake(id, { ...e, ...patch })
  const edited = !!data.edit && (e.from > 0 || e.to < length || e.volume !== 1 || e.fadeIn > 0 || e.fadeOut > 0)
  const playing = useSong((s) => s.playing === id)
  const progress = useProgress(playing, length, () => setPlaying(null))
  const v = data.version

  return (
    <>
      <div className="flex items-start gap-2.5 px-5 pt-[18px] pb-3">
        <img src={iconTake} alt="" className="mt-0.5 size-[18px] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-[1.3] font-medium text-ink-1">Take {v}</p>
          <p className="type-small truncate text-ink-3">
            {songTitle ? `${songTitle} · ` : ''}
            {sectionName}
          </p>
        </div>
        <button
          aria-label="Close take"
          title="Close"
          onClick={() => onNodesChange([{ type: 'select', id, selected: false }])}
          className="-mt-1 -mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-well hover:text-ink-1"
        >
          <Xmark width={16} height={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-1 pb-5 [&>*]:shrink-0">
        <div className="flex flex-col gap-2">
          <Trim bars={TAKE_BARS[v]} length={length} from={e.from} to={e.to} heard={playing ? progress : null} onChange={set} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={() => setPlaying(playing ? null : id)}
              className={cn(
                'flex size-8 items-center justify-center rounded-full transition-colors',
                playing ? 'bg-ink text-on-ink' : 'text-ink-1 hover:bg-well',
              )}
            >
              {playing ? <Pause width={15} height={15} strokeWidth={1.75} /> : <Play width={15} height={15} strokeWidth={1.75} />}
            </button>
            <p className="flex-1 text-center font-mono text-[13px] text-ink-1">{stamp(playing ? progress * length : e.from)}</p>
            <span className="size-8" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TimeField label="Start" value={e.from} onChange={(from) => set({ from: clamp(from, 0, e.to - 1) })} />
            <TimeField label="End" value={e.to} onChange={(to) => set({ to: clamp(to, e.from + 1, length) })} />
          </div>
          <p className="type-small text-ink-3">Drag the handles or enter a time. The original stays available.</p>
        </div>

        <span className="h-px bg-rule" />

        <Section title="Volume" note="How loud this take plays.">
          <div className="flex items-center gap-3">
            <SoundHigh width={16} height={16} strokeWidth={1.5} className="shrink-0 text-ink-2" />
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={e.volume}
              aria-label="Volume"
              onChange={(ev) => set({ volume: Number(ev.target.value) })}
              className="humn-range"
              style={{ '--v': `${(e.volume / 2) * 100}%` } as CSSProperties}
            />
            <span className="w-12 shrink-0 text-right font-mono text-[12px] text-ink-2">{decibels(e.volume)}</span>
          </div>
        </Section>

        <span className="h-px bg-rule" />

        <Section title="Fades" note="Ease the beginning and the ending.">
          <div className="grid grid-cols-2 gap-2">
            <TimeField label="Fade in" unit="s" value={e.fadeIn} onChange={(fadeIn) => set({ fadeIn: clamp(fadeIn, 0, (e.to - e.from) / 2) })} />
            <TimeField label="Fade out" unit="s" value={e.fadeOut} onChange={(fadeOut) => set({ fadeOut: clamp(fadeOut, 0, (e.to - e.from) / 2) })} />
          </div>
        </Section>

        {edited && (
          <button
            type="button"
            onClick={() => editTake(id, undefined)}
            className="type-caption flex items-center gap-2 self-start rounded-full py-1 pr-2 text-ink-2 transition-colors hover:text-ink-1"
          >
            <Refresh width={15} height={15} strokeWidth={1.5} />
            Reset edits
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-rule px-5 pt-3 pb-4">
        {data.added ? (
          <>
            <div className="flex items-center gap-2">
              <span className="type-caption flex h-7 items-center gap-1.5 rounded-full bg-ink pr-3 pl-2 text-on-ink">
                <Check width={13} height={13} strokeWidth={2.2} />
                In timeline
              </span>
              <span className="flex-1" />
              {!timelineOpen && (
                <button type="button" onClick={toggleTimeline} className="type-caption h-8 rounded-full px-2.5 text-ink-2 hover:bg-well hover:text-ink-1">
                  Open timeline
                </button>
              )}
            </div>
            <p className="type-small text-ink-3">Changes here carry through to the song.</p>
          </>
        ) : (
          <>
            <p className="type-small text-ink-3">{edited ? 'Edits saved' : 'Proposed · not in the song yet'}</p>
            <button
              type="button"
              onClick={() => addToTimeline(id)}
              className="type-action h-11 rounded-[14px] bg-ink text-on-ink transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]"
            >
              Add {v} to timeline
            </button>
            <p className="type-small text-center text-ink-3">{edited ? 'Uses your trim and fades.' : 'Adds it to the end of the song.'}</p>
          </>
        )}
      </div>
    </>
  )
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[14px] leading-[1.3] font-medium text-ink-1">{title}</p>
      {children}
      <p className="type-small text-ink-3">{note}</p>
    </div>
  )
}

/** A time to type, in seconds, in a well: "Start 0:02.0", or "Fade in 0.2 s". */
function TimeField({ label, value, unit, onChange }: { label: string; value: number; unit?: string; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = unit ? tenths(value).toFixed(1) : stamp(value)
  const commit = () => {
    if (draft === null) return
    const m = draft.trim().match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/)
    if (m) onChange(tenths(Number(m[1] ?? 0) * 60 + Number(m[2])))
    setDraft(null)
  }
  return (
    <label className="flex h-10 items-center gap-2 rounded-[10px] bg-well px-3 focus-within:bg-level">
      <span className="type-caption shrink-0 text-ink-3">{label}</span>
      <input
        value={draft ?? shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        inputMode="decimal"
        className="w-full min-w-0 bg-transparent font-mono text-[13px] text-ink-1 outline-none"
      />
      {unit && <span className="type-caption shrink-0 text-ink-3">{unit}</span>}
    </label>
  )
}

/** The take's waveform with a time ruler and two handles to trim it; what's trimmed away stays, faintly. */
function Trim({
  bars,
  length,
  from,
  to,
  heard,
  onChange,
}: {
  bars: number[]
  length: number
  from: number
  to: number
  heard: number | null
  onChange: (patch: Partial<TakeEdit>) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  // Twice the card's bars, so the panel's wider waveform still reads as the same idea.
  const wave = [...bars, ...[...bars].reverse()]
  const at = (x: number) => {
    const r = box.current!.getBoundingClientRect()
    return tenths(clamp((x - r.left) / r.width, 0, 1) * length)
  }
  const grab = (which: 'from' | 'to') => (e: PointerEvent) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const move = (ev: globalThis.PointerEvent) => {
      const t = at(ev.clientX)
      onChange(which === 'from' ? { from: clamp(t, 0, to - 1) } : { to: clamp(t, from + 1, length) })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const ticks = [0, 1 / 3, 2 / 3, 1]

  return (
    <div className="rounded-[14px] bg-well px-3 pt-2 pb-3">
      <div className="mb-1 flex justify-between font-mono text-[11px] text-ink-3">
        {ticks.map((t) => (
          <span key={t}>{stamp(Math.round(t * length)).slice(0, -2)}</span>
        ))}
      </div>
      <div ref={box} className="relative flex h-16 touch-none items-center justify-between select-none">
        {wave.map((h, i) => {
          const t = ((i + 0.5) / wave.length) * length
          const kept = t >= from && t <= to
          return (
            <span
              key={i}
              className={cn('w-[2px] rounded-full', kept ? (heard !== null && t <= heard * length ? 'bg-ink' : 'bg-ink-3') : 'bg-bar')}
              style={{ height: h * 1.6 }}
            />
          )
        })}
        {heard !== null && (
          <span aria-hidden className="absolute top-0 bottom-0 w-px bg-select" style={{ left: `${heard * 100}%` }}>
            <span className="absolute -top-1 -left-[4px] size-[9px] rotate-45 bg-select" />
          </span>
        )}
        {(['from', 'to'] as const).map((which) => (
          <span
            key={which}
            role="slider"
            aria-label={which === 'from' ? 'Trim start' : 'Trim end'}
            aria-valuenow={which === 'from' ? from : to}
            onPointerDown={grab(which)}
            className="absolute top-0 bottom-0 flex w-4 -translate-x-1/2 cursor-ew-resize justify-center"
            style={{ left: `${((which === 'from' ? from : to) / length) * 100}%` }}
          >
            <span className="h-full w-[2px] rounded-full bg-ink" />
            <span className="absolute top-1/2 h-6 w-2.5 -translate-y-1/2 rounded-[3px] bg-ink" />
          </span>
        ))}
      </div>
    </div>
  )
}
