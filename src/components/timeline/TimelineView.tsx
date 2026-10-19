import {
  AppWindow,
  ArrowUpRight,
  Copy,
  PauseSolid,
  PlaySolid,
  Plus,
  Scissor,
  SkipPrev,
  SoundHigh,
  SoundOff,
  Trash,
  Xmark,
  ZoomIn,
  ZoomOut,
} from 'iconoir-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { nanoid } from 'nanoid'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { DraftPin, PinWithCard } from '@/components/comments/Comments'
import { TAKE_A, TAKE_B } from '@/components/nodes/waves'
import { CLIP_DEFAULTS, EFFECTS, SPEEDS, clipsOf, newClip, playTime, type Clip } from '@/data/clips'
import { ME } from '@/data/collaborators'
import { clock, type AnySongNode, type SongNode } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'

// The track's name column; room before the first clip; the song track's height.
const HEAD = 112
const PAD = 16
const TRACK_H = 112
const STEP = 4
/** Where the selected clip's panel goes: a spot on the right of the canvas. */
export const CLIP_PANEL = 'clip-panel'
const DOCK_MIN = 200
const CANVAS_MIN = 470
const NAMES = ['Verse', 'Chorus', 'Bridge', 'Outro']
const MOVE = 'transform .35s var(--ease-spring), width .35s var(--ease-spring)'

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const half = (n: number) => Math.round(n * 2) / 2
const moved = <T,>(list: T[], from: number, to: number) => {
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}
const startsOf = (lengths: number[]) => lengths.map((_, i) => lengths.slice(0, i).reduce((t, l) => t + l, 0))
const secs = (n: number) => `${n.toFixed(1)}s`

function useWindowHeight() {
  const [height, setHeight] = useState(window.innerHeight)
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return height
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * The song on a timeline. Each section the song plays is a clip on one track,
 * one after another; select a clip and a panel opens with what can be done to
 * how it sounds (volume, fades, speed, pitch, an effect), the way a video
 * editor does for a clip. Clips can be moved, trimmed from either edge, faded
 * from their top corners, split at the playhead and copied.
 */
export function TimelineView() {
  const nodes = useSong((s) => s.nodes)
  // The canvas keeps room for its rail and toolbar, however tall the dock was pulled.
  const windowHeight = useWindowHeight()
  const dockHeight = clamp(useSong((s) => s.dockHeight), DOCK_MIN, Math.max(DOCK_MIN, windowHeight - CANVAS_MIN))
  const setDockHeight = useSong((s) => s.setDockHeight)
  const saved = useSong((s) => (s.songId ? s.arrangements[s.songId] : undefined))
  const { arrange, addNode, makeTakes } = useSong()
  const items = useMemo(() => clipsOf(nodes, saved), [nodes, saved])
  const clips = items.map((i) => i.clip)
  const times = clips.map(playTime)
  const starts = startsOf(times)
  const total = times.reduce((t, l) => t + l, 0)
  // Takes added to the song that someone has since taken off the timeline, ready to put back.
  const loose = saved
    ? nodes.filter((n): n is SongNode<'take'> => n.type === 'take' && !!n.data.added && !clips.some((c) => c.takeId === n.id))
    : []
  const sectionOf = (take: SongNode<'take'>) =>
    nodes.find((n): n is SongNode<'section'> => n.type === 'section' && n.id === take.data.sectionId)

  const update = (id: string, patch: Partial<Clip>) => arrange(clips.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const picked = useSong((s) => s.clip)
  const setPicked = useSong((s) => s.pickClip)
  const sel = clips.findIndex((c) => c.id === picked)

  // Fit the song across, then zoom in from there. Hold the scale still while an edge is pulled.
  const [scroller, width] = useWidth()
  const [zoom, setZoom] = useState(1)
  const fit = clamp((width - HEAD - PAD * 2 - 140) / Math.max(total, 30), 2, 40)
  const [held, setHeld] = useState<number | null>(null)
  const pps = held ?? fit * zoom

  // Playback is the visual for now, like the takes: a playhead through the clips.
  const [playing, setPlaying] = useState(false)
  const [clockAt, setTime] = useState(0)
  const time = Math.min(clockAt, total)
  const anchor = useRef({ wall: 0, t: 0 })
  const seek = (t: number) => {
    anchor.current = { wall: window.performance.now(), t }
    setTime(t)
  }
  const totalRef = useRef(total)
  useEffect(() => {
    totalRef.current = total
  })
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = (now: number) => {
      const t = anchor.current.t + (now - anchor.current.wall) / 1000
      if (t >= totalRef.current) {
        setPlaying(false)
        setTime(0)
        return
      }
      setTime(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  const toggle = () => {
    if (!total) return
    if (playing) return setPlaying(false)
    seek(time >= total ? 0 : time)
    setPlaying(true)
  }
  const current = starts.findIndex((st, i) => time >= st && time < st + times[i])

  /** Cuts the selected clip (or whichever is under the playhead) in two where the playhead is. */
  const split = () => {
    const i = sel >= 0 && time > starts[sel] && time < starts[sel] + times[sel] ? sel : current
    if (i < 0) return
    const c = clips[i]
    const cut = half((time - starts[i]) * c.speed)
    if (cut < 0.5 || cut > c.length - 0.5) return
    // Played backwards, the first half of what's heard is the end of the take.
    const [a, b] = c.reversed
      ? [{ from: c.from + c.length - cut, length: cut }, { from: c.from, length: c.length - cut }]
      : [{ from: c.from, length: cut }, { from: c.from + cut, length: c.length - cut }]
    const second = { ...c, ...b, id: nanoid(8), fadeIn: 0 }
    arrange([...clips.slice(0, i), { ...c, ...a, fadeOut: 0 }, second, ...clips.slice(i + 1)])
    setPicked(second.id)
  }
  const duplicate = (i: number) => {
    const copy = { ...clips[i], id: nanoid(8) }
    arrange([...clips.slice(0, i + 1), copy, ...clips.slice(i + 1)])
    setPicked(copy.id)
  }
  const remove = (i: number) => {
    arrange(clips.filter((_, j) => j !== i))
    setPicked(null)
  }
  const addSection = () => {
    const all = nodes.filter((n) => n.type === 'section')
    const used = new Set(all.map((n) => n.data.name))
    const name = NAMES.find((n) => !used.has(n)) ?? `Part ${all.length + 1}`
    // To the right of the last section and its takes, so it doesn't land on them.
    const last = nodes
      .filter((n) => n.type === 'section' || n.type === 'take')
      .reduce<AnySongNode | null>((a, n) => (!a || n.position.x > a.position.x ? n : a), null)
    // It joins the song once one of its takes is added to the timeline.
    addNode('section', last ? { x: last.position.x + 360, y: last.position.y } : { x: 0, y: 0 }, { name })
  }

  // With a card selected, the arrow keys are the canvas's.
  const cardPicked = useSong((s) => s.nodes.some((n) => n.selected))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, button, [contenteditable]')) return
      if (e.key === ' ') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowLeft' && !cardPicked) seek(Math.max(0, time - 5))
      else if (e.key === 'ArrowRight' && !cardPicked) seek(Math.min(total, time + 5))
      else if (e.key === 's' && !e.metaKey && !e.ctrlKey) split()
      else if (e.key === 'd' && (e.metaKey || e.ctrlKey) && sel >= 0) {
        e.preventDefault()
        duplicate(sel)
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && sel >= 0) remove(sel)
      else if (e.key === 'Escape') setPicked(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Moving a clip: the rest make room for it.
  const [drag, setDrag] = useState<{ from: number; dx: number } | null>(null)
  const target = drag ? dropIndex(times, drag.from, drag.dx / pps) : -1
  const preview = drag ? moved(times.map((_, i) => i), drag.from, target) : times.map((_, i) => i)
  const previewStarts = startsOf(preview.map((i) => times[i]))
  const xOf = (i: number) => (drag?.from === i ? starts[i] * pps + drag.dx : previewStarts[preview.indexOf(i)] * pps)

  // Commenting: a press on the timeline leaves a comment at that moment instead.
  const tool = useSong((s) => s.tool)
  const commenting = tool === 'comment'
  const notes = useSong((s) => (s.songId ? s.comments[s.songId] : undefined))?.flatMap((c) =>
    't' in c.where ? [{ ...c, t: c.where.t }] : [],
  )
  const addComment = useSong((s) => s.addComment)
  const moveComment = useSong((s) => s.moveComment)
  const [draft, setDraft] = useState<number | null>(null)
  const [openNote, setOpenNote] = useState<string | null>(null)
  if (!commenting && draft !== null) setDraft(null)
  const content = useRef<HTMLDivElement>(null)
  const noteAt = (clientX: number) => {
    const left = content.current?.getBoundingClientRect().left ?? 0
    setOpenNote(null)
    setDraft(clamp((clientX - left - HEAD - PAD) / pps, 0, total))
  }

  const startDrag = (e: PointerEvent, i: number) => {
    if (e.button !== 0) return
    if (commenting) {
      e.preventDefault()
      return noteAt(e.clientX)
    }
    const x0 = e.clientX
    let going = false
    const move = (ev: globalThis.PointerEvent) => {
      const dx = ev.clientX - x0
      if (!going && Math.abs(dx) < 4) return
      going = true
      setDrag({ from: i, dx })
    }
    const up = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move)
      setDrag(null)
      setPicked(clips[i].id)
      if (!going) return
      const to = dropIndex(times, i, (ev.clientX - x0) / pps)
      if (to !== i) arrange(moved(clips, i, to))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  /** Pulls on a clip: its edges trim it, its top corners set how long it fades. */
  const startPull = (e: PointerEvent, i: number, what: 'start' | 'end' | 'fadeIn' | 'fadeOut', max: number) => {
    e.stopPropagation()
    if (e.button !== 0) return
    const x0 = e.clientX
    const c = clips[i]
    const scale = pps
    setPicked(c.id)
    setHeld(scale)
    const move = (ev: globalThis.PointerEvent) => {
      const d = (ev.clientX - x0) / scale
      if (what === 'fadeIn') return update(c.id, { fadeIn: half(clamp(c.fadeIn + d, 0, playTime(c) / 2)) })
      if (what === 'fadeOut') return update(c.id, { fadeOut: half(clamp(c.fadeOut - d, 0, playTime(c) / 2)) })
      const src = half(d * c.speed)
      if (what === 'end') return update(c.id, { length: clamp(c.length + src, 1, max - c.from) })
      const from = clamp(c.from + src, 0, c.from + c.length - 1)
      update(c.id, { from, length: c.length - (from - c.from) })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener(
      'pointerup',
      () => {
        window.removeEventListener('pointermove', move)
        setHeld(null)
      },
      { once: true },
    )
  }

  // Press or drag along the ruler or an empty bit of the track to move the playhead.
  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (commenting) {
      e.preventDefault()
      return noteAt(e.clientX)
    }
    setOpenNote(null)
    const el = e.currentTarget
    const at = (x: number) => seek(clamp((x - el.getBoundingClientRect().left - PAD) / pps, 0, total))
    at(e.clientX)
    setPicked(null)
    const move = (ev: globalThis.PointerEvent) => at(ev.clientX)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true })
  }

  const chosen = sel >= 0 ? items[sel] : null
  const panelSlot = document.getElementById(CLIP_PANEL)
  const still = useReducedMotion()

  return (
    <div className="relative flex border-t border-rule bg-card" style={{ height: dockHeight }}>
      <ResizeEdge height={dockHeight} onResize={setDockHeight} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-rule px-4">
          <ToolIcon label="Back to the start" onClick={() => seek(0)} disabled={!total}>
            <SkipPrev width={17} height={17} />
          </ToolIcon>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={!total}
            onClick={toggle}
            className="flex size-9 items-center justify-center rounded-full bg-ink text-on-ink transition-[transform,opacity] duration-150 active:scale-95 disabled:opacity-30"
          >
            {playing ? <PauseSolid width={15} height={15} /> : <PlaySolid width={15} height={15} className="translate-x-px" />}
          </button>
          <p className="ml-1.5 font-mono text-[12px] leading-none text-ink-2 tabular-nums">
            {clock(time)} <span className="text-ink-4">/ {clock(total)}</span>
          </p>
          <span className="mx-2 h-5 w-px bg-rule-strong" />
          <ToolIcon label="Split at the playhead (S)" onClick={split} disabled={current < 0 && sel < 0}>
            <Scissor width={17} height={17} />
          </ToolIcon>
          <span className="flex-1" />
          <ToolIcon label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z / 1.5))} disabled={zoom <= 1}>
            <ZoomOut width={17} height={17} />
          </ToolIcon>
          <ToolIcon label="Zoom in" onClick={() => setZoom((z) => Math.min(8, z * 1.5))} disabled={zoom >= 8}>
            <ZoomIn width={17} height={17} />
          </ToolIcon>
        </div>

        <div ref={scroller} className="relative min-h-0 flex-1 overflow-auto">
          <div
            ref={content}
            className={cn('relative min-w-full', commenting && '[&_*]:cursor-crosshair')}
            style={{ width: HEAD + PAD * 2 + total * pps + 140 }}
          >
            <div className="flex h-8 border-b border-rule">
              <div className="sticky left-0 z-10 w-[112px] shrink-0 border-r border-rule bg-card" />
              <div className="relative flex-1 cursor-text" onPointerDown={scrub}>
                <Ruler total={total} pps={pps} />
              </div>
            </div>

            {(commenting || draft !== null || !!notes?.length) && (
              <div className="flex h-11 border-b border-rule">
                <div className="sticky left-0 z-10 flex w-[112px] shrink-0 items-center border-r border-rule bg-card px-4">
                  <p className="type-caption text-ink-2">Comments</p>
                </div>
                <div className="relative z-[6] flex-1" onPointerDown={scrub}>
                  {notes?.map((c) => (
                    <div key={c.id} className="absolute top-[38px] left-0" style={{ transform: `translateX(${PAD + c.t * pps}px)` }}>
                      <PinWithCard
                        comment={c}
                        open={openNote === c.id}
                        onToggle={() => setOpenNote(openNote === c.id ? null : c.id)}
                        // Along the lane only: sideways is earlier or later in the song.
                        onDrag={((from) => (dx: number) => moveComment(c.id, { t: clamp(from + dx / pps, 0, total) }))(c.t)}
                      />
                    </div>
                  ))}
                  {draft !== null && (
                    <div className="absolute top-[38px] left-0 z-10" style={{ transform: `translateX(${PAD + draft * pps}px)` }}>
                      <DraftPin
                        onCancel={() => setDraft(null)}
                        onPost={(text) => {
                          addComment({ t: draft }, text, ME)
                          setDraft(null)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex border-b border-rule" style={{ height: TRACK_H + 16 }}>
              <div className="sticky left-0 z-10 flex w-[112px] shrink-0 flex-col justify-center gap-0.5 border-r border-rule bg-card px-4">
                <p className="type-caption text-ink-1">Song</p>
                <p className="type-small text-ink-3">
                  {clips.length} {clips.length === 1 ? 'clip' : 'clips'}
                </p>
              </div>
              <div className="relative flex-1" onPointerDown={scrub}>
                {items.map(({ clip, section, take }, i) => (
                  <div
                    key={clip.id}
                    className="absolute top-2 left-0"
                    style={{
                      height: TRACK_H,
                      width: times[i] * pps,
                      transform: `translateX(${PAD + xOf(i)}px)`,
                      transition: held !== null || drag?.from === i ? 'none' : MOVE,
                      zIndex: drag?.from === i ? 3 : sel === i ? 2 : 1,
                    }}
                  >
                    <ClipBlock
                      clip={clip}
                      section={section}
                      take={take}
                      width={times[i] * pps}
                      picked={sel === i}
                      lifted={drag?.from === i}
                      heard={i < current || (i === current && (playing || time > 0)) ? clamp((time - starts[i]) / times[i], 0, 1) : 0}
                      onGrab={(e) => startDrag(e, i)}
                      onPull={(e, what) => startPull(e, i, what, section.data.length)}
                      onMake={() => makeTakes(section.id)}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSection}
                  className="type-caption absolute top-2 left-0 flex items-center gap-1.5 rounded-[10px] border border-dashed border-rule-strong px-3.5 text-ink-3 transition-[transform,color,background-color] duration-300 ease-spring hover:bg-well hover:text-ink-1"
                  style={{ height: TRACK_H, transform: `translateX(${PAD + total * pps + (total ? 8 : 0)}px)` }}
                >
                  <Plus width={14} height={14} />
                  Add section
                </button>
              </div>
            </div>

            {sel < 0 && total > 0 && (
              <p className="type-caption sticky left-0 px-6 pt-5 text-ink-3" style={{ width: width || undefined }}>
                {commenting
                  ? 'Press anywhere on the timeline to leave a comment at that moment.'
                  : 'Select a clip to change how it sounds. Pull its edges to trim it, or its top corners to fade it.'}
              </p>
            )}

            {total > 0 && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-0 bottom-0 left-0 z-[5] w-px bg-ink"
                style={{ transform: `translateX(${HEAD + PAD + time * pps}px)` }}
              >
                <span className="absolute -top-px -left-[5px] size-[11px] rounded-b-full bg-ink" />
              </span>
            )}
          </div>
        </div>

        {loose.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-rule px-4 py-2.5">
            <p className="type-caption mr-1 text-ink-3">On the canvas, not in the song</p>
            {loose.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  const s = sectionOf(t)
                  if (s) arrange([...clips, newClip(s, t)])
                }}
                className="type-caption flex h-[28px] items-center gap-1.5 rounded-[8px] bg-well px-2.5 text-ink-2 transition-colors hover:bg-level hover:text-ink-1"
              >
                <Plus width={13} height={13} />
                {sectionOf(t)?.data.name ?? 'Take'} {t.data.version}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The selected clip's panel floats on the right of the canvas. */}
      {panelSlot &&
        createPortal(
          <AnimatePresence>
            {chosen && (
              <motion.div
                key="clip-panel"
                className="pointer-events-auto flex max-h-full"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={still ? { duration: 0 } : { type: 'spring', duration: 0.35, bounce: 0 }}
              >
              <Properties
                key={chosen.clip.id}
                clip={chosen.clip}
                section={chosen.section}
                take={chosen.take}
                canSplit={time > starts[sel] && time < starts[sel] + times[sel]}
                onChange={(patch) => update(chosen.clip.id, patch)}
                onSplit={split}
                onDuplicate={() => duplicate(sel)}
                onRemove={() => remove(sel)}
                onClose={() => setPicked(null)}
              />
              </motion.div>
            )}
          </AnimatePresence>,
          panelSlot,
        )}
    </div>
  )
}

/** The dock's top edge: pull it up or down to give the timeline more or less room. */
function ResizeEdge({ height, onResize }: { height: number; onResize: (h: number) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize timeline"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        const y0 = e.clientY
        const move = (ev: globalThis.PointerEvent) =>
          onResize(Math.round(clamp(height - (ev.clientY - y0), DOCK_MIN, window.innerHeight - CANVAS_MIN)))
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true })
      }}
      className="group absolute top-0 right-0 left-0 z-20 flex h-2.5 cursor-ns-resize justify-center"
    >
      <span className="mt-1 h-[3px] w-10 rounded-full bg-rule-strong transition-colors group-hover:bg-ink-3" />
    </div>
  )
}

/** Which slot a dragged clip lands in: past the middle of a neighbour, it swaps. */
function dropIndex(lengths: number[], from: number, shift: number) {
  const centre = startsOf(lengths)[from] + shift + lengths[from] / 2
  let to = 0
  let at = 0
  lengths.forEach((l, i) => {
    if (i === from) return
    if (centre > at + l / 2) to++
    at += l
  })
  return to
}

function ToolIcon({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-[8px] text-ink-2 transition-colors enabled:hover:bg-well enabled:hover:text-ink-1 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/** Minutes and seconds along the top, spaced so the labels never crowd. */
function Ruler({ total, pps }: { total: number; pps: number }) {
  const step = [1, 2, 5, 10, 15, 30, 60].find((s) => s * pps >= 56) ?? 60
  const end = Math.max(total, 30) + step * 3
  const marks = Array.from({ length: Math.floor(end / step) + 1 }, (_, i) => i * step)
  return (
    <>
      {marks.map((t) => (
        <span
          key={t}
          className="pointer-events-none absolute bottom-0 left-0 flex h-full items-end pb-2"
          style={{ transform: `translateX(${PAD + t * pps}px)` }}
        >
          <span className="absolute bottom-0 left-0 h-1.5 w-px bg-rule-strong" />
          <span className="pl-1.5 font-mono text-[10.5px] leading-none text-ink-3">{clock(t)}</span>
        </span>
      ))}
    </>
  )
}

/**
 * A section's take where it plays. The waveform shows what's been done to it:
 * quieter is shorter, fades taper, backwards is mirrored, faster is denser.
 */
function ClipBlock({
  clip,
  section,
  take,
  width,
  picked,
  lifted,
  heard,
  onGrab,
  onPull,
  onMake,
}: {
  clip: Clip
  section: SongNode<'section'>
  take?: SongNode<'take'>
  width: number
  picked: boolean
  lifted: boolean
  heard: number
  onGrab: (e: PointerEvent) => void
  onPull: (e: PointerEvent, what: 'start' | 'end' | 'fadeIn' | 'fadeOut') => void
  onMake: () => void
}) {
  const made = take?.data.state === 'done'
  const making = take?.data.state === 'making'
  const ready = Object.values(section.data.sources).some((s) => s && s.length > 0)
  const shape = take?.data.version === 'B' ? TAKE_B : TAKE_A
  const span = playTime(clip)
  const count = Math.max(1, Math.floor((width - 12) / STEP))
  const lit = Math.round(heard * count)
  const fadeIn = (clip.fadeIn / span) * width
  const fadeOut = (clip.fadeOut / span) * width
  const effect = EFFECTS.find((e) => e.id === clip.effect)

  const bar = (b: number) => {
    const p = (b + 0.5) / count
    const src = clip.from + (clip.reversed ? 1 - p : p) * clip.length
    const t = p * span
    const env = Math.min(1, clip.fadeIn ? t / clip.fadeIn : 1, clip.fadeOut ? (span - t) / clip.fadeOut : 1)
    return Math.max(3, shape[Math.floor(src * 5) % shape.length] * 1.05 * Math.min(clip.volume, 1.6) * env)
  }

  return (
    <div
      onPointerDown={onGrab}
      className={cn(
        'group relative flex h-full touch-none flex-col overflow-hidden rounded-[10px] border transition-[box-shadow,scale,background-color] duration-200 select-none',
        lifted ? 'scale-[1.02] cursor-grabbing shadow-lift' : 'cursor-grab',
        made ? 'border-rule bg-well' : 'border-dashed border-rule-strong bg-card',
        picked && 'border-transparent shadow-[0_0_0_2px_var(--soft-accent)]',
      )}
    >
      <div className="flex h-7 shrink-0 items-center gap-1.5 pt-1 pr-2 pl-2.5">
        <AppWindow className="size-3 shrink-0 text-ink-1" />
        <p className="type-small min-w-0 truncate text-ink-1">{section.data.name}</p>
        {made && <p className="shrink-0 font-mono text-[10.5px] text-ink-3">{take!.data.version}</p>}
        <span className="flex-1" />
        {width > 200 && (
          <div className="flex min-w-0 gap-1 overflow-hidden">
            {clip.muted && <Badge><SoundOff width={11} height={11} /></Badge>}
            {clip.speed !== 1 && <Badge>{clip.speed}×</Badge>}
            {clip.pitch !== 0 && <Badge>{clip.pitch > 0 ? `+${clip.pitch}` : clip.pitch}</Badge>}
            {clip.reversed && <Badge>backwards</Badge>}
            {effect && effect.id !== 'none' && <Badge>{effect.name}</Badge>}
          </div>
        )}
      </div>

      <div className={cn('relative flex min-h-0 flex-1 items-center px-1.5 pb-1', clip.muted && 'opacity-35')}>
        {made ? (
          <div className="flex h-full items-center gap-px">
            {Array.from({ length: count }, (_, b) => (
              <span
                key={b}
                className={cn('w-[3px] shrink-0 rounded-full', b < lit ? 'bg-ink' : 'bg-bar')}
                style={{ height: bar(b) }}
              />
            ))}
          </div>
        ) : making ? (
          <p className="animate-pulse pl-1 font-mono text-[11px] text-ink-3">listening…</p>
        ) : (
          width > 110 &&
          (ready ? (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onMake}
              className="type-caption ml-1 flex h-7 items-center rounded-[8px] border border-rule bg-button px-2.5 text-ink-1 transition-colors hover:bg-level"
            >
              Make 2 takes
            </button>
          ) : (
            <p className="type-small pl-1 text-ink-4">Nothing plugged in yet</p>
          ))
        )}
      </div>

      {/* Fades: a shaded wedge from the top corner, and a handle to pull it in. */}
      {fadeIn > 0 && <Wedge side="left" w={fadeIn} />}
      {fadeOut > 0 && <Wedge side="right" w={fadeOut} />}
      {made && (
        <>
          <FadeHandle side="left" x={fadeIn} onPointerDown={(e) => onPull(e, 'fadeIn')} picked={picked} label="Fade in" />
          <FadeHandle side="right" x={fadeOut} onPointerDown={(e) => onPull(e, 'fadeOut')} picked={picked} label="Fade out" />
        </>
      )}

      <TrimEdge side="left" onPointerDown={(e) => onPull(e, 'start')} label={`Trim the start of ${section.data.name}`} />
      <TrimEdge side="right" onPointerDown={(e) => onPull(e, 'end')} label={`Trim the end of ${section.data.name}`} />
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[17px] shrink-0 items-center rounded-[5px] bg-card px-1 font-mono text-[10px] leading-none text-ink-2">
      {children}
    </span>
  )
}

function Wedge({ side, w }: { side: 'left' | 'right'; w: number }) {
  return (
    <svg
      aria-hidden
      className={cn('pointer-events-none absolute top-0 h-full', side === 'left' ? 'left-0' : 'right-0')}
      width={w}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path d={side === 'left' ? 'M0 0 L100 0 L0 100 Z' : 'M0 0 L100 0 L100 100 Z'} fill="rgb(20 22 26 / 0.07)" />
      <path
        d={side === 'left' ? 'M0 100 L100 0' : 'M0 0 L100 100'}
        stroke="var(--soft-ink-2)"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
        fill="none"
      />
    </svg>
  )
}

function FadeHandle({
  side,
  x,
  picked,
  label,
  onPointerDown,
}: {
  side: 'left' | 'right'
  x: number
  picked: boolean
  label: string
  onPointerDown: (e: PointerEvent) => void
}) {
  return (
    <span
      role="slider"
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown}
      className={cn(
        'absolute top-[26px] z-[2] size-3 cursor-ew-resize rounded-full border-[1.5px] border-ink bg-card transition-opacity',
        picked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}
      style={side === 'left' ? { left: Math.max(4, x - 6) } : { right: Math.max(4, x - 6) }}
    />
  )
}

function TrimEdge({ side, label, onPointerDown }: { side: 'left' | 'right'; label: string; onPointerDown: (e: PointerEvent) => void }) {
  return (
    <span
      role="separator"
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown}
      className={cn('absolute top-6 bottom-0 z-[1] flex w-2.5 cursor-ew-resize items-center justify-center', side === 'left' ? 'left-0' : 'right-0')}
    >
      <span className="h-8 w-[3px] rounded-full bg-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </span>
  )
}

/**
 * What can be done to how the selected clip sounds, in a side panel like a
 * video editor's. Everything here is about the sound; what went into it lives
 * on the canvas.
 */
function Properties({
  clip,
  section,
  take,
  canSplit,
  onChange,
  onSplit,
  onDuplicate,
  onRemove,
  onClose,
}: {
  clip: Clip
  section: SongNode<'section'>
  take?: SongNode<'take'>
  canSplit: boolean
  onChange: (patch: Partial<Clip>) => void
  onSplit: () => void
  onDuplicate: () => void
  onRemove: () => void
  onClose: () => void
}) {
  const { showOnCanvas } = useSong()
  const span = playTime(clip)
  const changed = (Object.keys(CLIP_DEFAULTS) as (keyof typeof CLIP_DEFAULTS)[]).some((k) => clip[k] !== CLIP_DEFAULTS[k])

  return (
    <aside className="flex w-[300px] flex-col overflow-hidden rounded-[18px] bg-card shadow-lift">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-rule pr-2 pl-4">
        <AppWindow className="size-3.5 shrink-0 text-ink-1" />
        <div className="min-w-0 flex-1">
          <p className="type-caption truncate text-ink-1">
            {section.data.name}
            {take && ` · Take ${take.data.version}`}
          </p>
          <p className="font-mono text-[10.5px] leading-[1.4] text-ink-3">
            plays for {secs(span)}
          </p>
        </div>
        <ToolIcon label="Show on canvas" onClick={() => showOnCanvas(section.id)}>
          <ArrowUpRight width={16} height={16} />
        </ToolIcon>
        <ToolIcon label="Close" onClick={onClose}>
          <Xmark width={16} height={16} />
        </ToolIcon>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Group title="Volume" value={clip.muted ? 'Muted' : `${Math.round(clip.volume * 100)}%`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={clip.muted}
              aria-label={clip.muted ? 'Unmute' : 'Mute'}
              title={clip.muted ? 'Unmute' : 'Mute'}
              onClick={() => onChange({ muted: !clip.muted })}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors',
                clip.muted ? 'bg-ink text-on-ink' : 'bg-well text-ink-2 hover:bg-level',
              )}
            >
              {clip.muted ? <SoundOff width={15} height={15} /> : <SoundHigh width={15} height={15} />}
            </button>
            <Slider min={0} max={2} step={0.05} value={clip.volume} onChange={(volume) => onChange({ volume, muted: false })} label="Volume" />
          </div>
        </Group>

        <Group title="Fade">
          <Labeled label="Fade in" value={secs(clip.fadeIn)}>
            <Slider min={0} max={span / 2} step={0.5} value={clip.fadeIn} onChange={(fadeIn) => onChange({ fadeIn })} label="Fade in" />
          </Labeled>
          <Labeled label="Fade out" value={secs(clip.fadeOut)}>
            <Slider min={0} max={span / 2} step={0.5} value={clip.fadeOut} onChange={(fadeOut) => onChange({ fadeOut })} label="Fade out" />
          </Labeled>
        </Group>

        <Group title="Speed" value={clip.speed === 1 ? 'As made' : `${clip.speed}×`}>
          <Segmented
            options={SPEEDS.map((s) => ({ id: s, label: `${s}×` }))}
            value={clip.speed}
            onChange={(speed) =>
              onChange({ speed, fadeIn: Math.min(clip.fadeIn, clip.length / speed / 2), fadeOut: Math.min(clip.fadeOut, clip.length / speed / 2) })
            }
            small
          />
        </Group>

        <Group title="Pitch" value={clip.pitch === 0 ? 'As made' : `${clip.pitch > 0 ? '+' : ''}${clip.pitch} steps`}>
          <Slider min={-12} max={12} step={1} value={clip.pitch} onChange={(pitch) => onChange({ pitch })} label="Pitch" centred />
          <div className="type-small mt-1 flex justify-between text-ink-3">
            <span>Lower</span>
            <span>Higher</span>
          </div>
        </Group>

        <Group title="Effect">
          <div className="grid grid-cols-3 gap-1.5">
            {EFFECTS.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={clip.effect === e.id}
                onClick={() => onChange({ effect: e.id })}
                className={cn(
                  'type-small flex h-9 items-center justify-center rounded-[9px] border transition-colors',
                  clip.effect === e.id ? 'border-ink bg-ink text-on-ink' : 'border-rule bg-well text-ink-2 hover:bg-level hover:text-ink-1',
                )}
              >
                {e.name}
              </button>
            ))}
          </div>
          {clip.effect !== 'none' && (
            <Labeled label="How much" value={`${Math.round(clip.strength * 100)}%`}>
              <Slider min={0} max={1} step={0.05} value={clip.strength} onChange={(strength) => onChange({ strength })} label="Effect amount" />
            </Labeled>
          )}
        </Group>

        <Group title="Play backwards">
          <Switch on={clip.reversed} onChange={(reversed) => onChange({ reversed })} label="Play backwards" />
        </Group>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-t border-rule px-2 py-2">
        <PanelAction onClick={onSplit} disabled={!canSplit} title="Move the playhead into this clip to split it">
          <Scissor width={15} height={15} />
          Split
        </PanelAction>
        <PanelAction onClick={onDuplicate}>
          <Copy width={15} height={15} />
          Copy
        </PanelAction>
        <PanelAction onClick={onRemove}>
          <Trash width={15} height={15} />
          Delete
        </PanelAction>
        <span className="flex-1" />
        {changed && (
          <button
            type="button"
            onClick={() => onChange(CLIP_DEFAULTS)}
            className="type-small h-8 rounded-[8px] px-2 text-ink-3 transition-colors hover:bg-well hover:text-ink-1"
          >
            Reset
          </button>
        )}
      </div>
    </aside>
  )
}

function Group({ title, value, children }: { title: string; value?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-b border-rule px-4 py-3.5 last:border-b-0">
      <div className="flex items-center justify-between">
        <p className="type-caption font-medium text-ink-1">{title}</p>
        {value && <p className="font-mono text-[11px] text-ink-3">{value}</p>}
      </div>
      {children}
    </section>
  )
}

function Labeled({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="type-small flex justify-between text-ink-2">
        <span>{label}</span>
        <span className="font-mono text-[11px] text-ink-3">{value}</span>
      </div>
      {children}
    </div>
  )
}

function Slider({
  min,
  max,
  step,
  value,
  onChange,
  label,
  centred,
}: {
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  label: string
  centred?: boolean
}) {
  const p = max > min ? ((value - min) / (max - min)) * 100 : 0
  // Pitch fills out from the middle, so "as made" reads as nothing filled.
  const [a, b] = centred ? [Math.min(50, p), Math.max(50, p)] : [0, p]
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={max <= min}
      onChange={(e) => onChange(Number(e.target.value))}
      className="soft-range"
      style={{ '--a': `${a}%`, '--b': `${b}%` } as CSSProperties}
    />
  )
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  small,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  small?: boolean
}) {
  return (
    <div className="flex rounded-[10px] bg-well p-[3px]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'h-7 flex-1 rounded-[7px] leading-none transition-[background-color,color,box-shadow] duration-200',
            small ? 'font-mono text-[11px]' : 'type-small',
            value === o.id ? 'bg-card text-ink-1 shadow-lift' : 'text-ink-3 hover:text-ink-1',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn('relative h-[22px] w-[38px] rounded-full transition-colors duration-200', on ? 'bg-ink' : 'bg-level')}
    >
      <span
        className={cn(
          'absolute top-[3px] left-[3px] size-4 rounded-full bg-card shadow-lift transition-transform duration-300 ease-spring',
          on && 'translate-x-4',
        )}
      />
    </button>
  )
}

function PanelAction({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? title : undefined}
      className="type-small flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-ink-2 transition-colors enabled:hover:bg-well enabled:hover:text-ink-1 disabled:opacity-35"
    >
      {children}
    </button>
  )
}
