import { MediaImagePlus, Play, Plus, Search, SidebarCollapse, Square } from 'iconoir-react'
import { useEffect, useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { play, type Score } from '@/audio/engine'
import { chordsScore, instrumentScore, soundScore, voiceScore } from '@/audio/scores'
import { whole } from '@/audio/useSound'
import { GENERATED } from '@/data/generated'
import { DRAWERS, nameOf, NODE_DRAG_TYPE, type LibraryItem, type OwnAction } from '@/data/library'
import { DEFAULT_ROLE, type Kind, type Role } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { useYours } from '@/store/yours'
import { KIND_ICONS } from './kindIcons'
import { useAddNode } from './useAddNode'

const ROLE_TEXT: Record<Role, string> = {
  intent: 'text-role-intent',
  follows: 'text-role-follows',
  lyrics: 'text-role-lyrics',
  melody: 'text-role-melody',
  harmony: 'text-role-harmony',
  mood: 'text-role-mood',
  texture: 'text-role-texture',
  instruments: 'text-role-instruments',
}

type Source = 'yours' | 'library' | 'generate'

/** One kind's drawer: search, then three sources — yours, the app's library, or make one. */
export function Drawer({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const spec = DRAWERS[kind]
  const [source, setSource] = useState<Source>('yours')
  const [query, setQuery] = useState('')
  const kept = useYours((s) => s.kept).filter((k) => k.kind === kind)
  const nodes = useSong((s) => s.nodes)
  const prompt = nodes.some((n) => n.type === 'words' && n.data.text.trim())

  const inSong = new Set(nodes.map((n) => nameOf(n.data as Record<string, unknown>)))
  const matches = (item: LibraryItem) => item.name.toLowerCase().includes(query.trim().toLowerCase())
  const mine = kept.filter(matches)
  const library = spec.library.filter(matches)

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3.5 px-4 pt-3">
        <div className="flex h-7 items-center gap-2">
          <p className="flex-1 text-[15px] leading-[1.3] font-medium text-ink-1">{spec.label}</p>
          <button
            aria-label="Close drawer"
            title="Close"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full hover:bg-well"
          >
            <SidebarCollapse width={16} height={16} className="text-ink-3" />
          </button>
        </div>
        <label className="flex h-[34px] items-center gap-2 rounded-full border border-rule bg-well px-[11px]">
          <Search width={14} height={14} className="shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={spec.search}
            className="type-body min-w-0 flex-1 bg-transparent text-ink-1 outline-none placeholder:text-ink-3"
          />
        </label>
        <div role="tablist" className="flex h-8 gap-0.5 rounded-full bg-well p-0.5">
          {(
            [
              ['yours', 'Yours'],
              ['library', 'From the app'],
              ['generate', 'Generate'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={source === id}
              onClick={() => setSource(id)}
              className={cn(
                'type-caption flex flex-1 items-center justify-center gap-1.5 rounded-full transition-[background-color,color,box-shadow] duration-200',
                source === id ? 'bg-card text-ink-1 shadow-lift' : 'text-ink-2 hover:text-ink-1',
              )}
            >
              {label}
              {id === 'yours' && kept.length > 0 && (
                <span className="font-mono text-[11px] leading-none text-ink-3">{kept.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3.5 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {source === 'yours' && (
          <>
            <Heading label={spec.yoursTitle} right={String(kept.length)} />
            <Grid photo={kind === 'photo'} square>
              {!query && spec.own.map((a) => <OwnTile key={a.label} kind={kind} action={a} />)}
              {mine.map((item) => (
                <ItemTile key={item.id} kind={kind} item={item} square inSong={inSong.has(nameOf(item.data))} />
              ))}
            </Grid>
          </>
        )}

        {source === 'library' && (
          <>
            <Heading
              label={prompt ? 'Picked for this song' : 'From the app'}
              right={prompt ? 'from your prompt' : undefined}
            />
            <Grid photo={false}>
              {library.map((item) => (
                <ItemTile key={item.name} kind={kind} item={item} inSong={inSong.has(nameOf(item.data))} />
              ))}
            </Grid>
            {library.length === 0 && <p className="type-small text-ink-3">Nothing called “{query}” here.</p>}
          </>
        )}

        {source === 'generate' && <Generate kind={kind} />}
      </div>
    </div>
  )
}

function Heading({ label, right }: { label: string; right?: string }) {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <p className="type-caption text-ink-2">{label}</p>
      {right && <p className="font-mono text-[12px] leading-none text-ink-3">{right}</p>}
    </div>
  )
}

/** Photos you've kept sit three across, as in the Figma drawer; everything else two across. */
function Grid({ photo, square, children }: { photo: boolean; square?: boolean; children: ReactNode }) {
  return <div className={cn('grid gap-2.5', photo && square ? 'grid-cols-3' : 'grid-cols-2')}>{children}</div>
}

/** Click drops it in the middle of the canvas; drag puts it where you let go. */
function useTileHandlers(kind: Kind, data: Record<string, unknown>) {
  const add = useAddNode()
  const setDragKind = useSong((s) => s.setDragKind)
  return {
    onClick: () => add(kind, data),
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(NODE_DRAG_TYPE, JSON.stringify({ kind, data }))
      e.dataTransfer.effectAllowed = 'copy'
      setDragKind(kind)
    },
    onDragEnd: () => setDragKind(null),
  }
}

function ItemTile({ kind, item, square, inSong }: { kind: Kind; item: LibraryItem; square?: boolean; inSong: boolean }) {
  const handlers = useTileHandlers(kind, item.data)
  const Icon = KIND_ICONS[kind]
  const tag = inSong && (
    <span className="type-small absolute top-1.5 left-1.5 rounded-full bg-card px-1.5 py-px text-ink-2">In song</span>
  )

  if (kind === 'photo') {
    return (
      <button
        {...handlers}
        title={item.name}
        className="group flex cursor-grab flex-col gap-1.5 text-left active:cursor-grabbing"
      >
        <span
          className={cn(
            'relative block w-full overflow-hidden rounded-[10px] bg-[#dcdcd8] transition-transform duration-200 ease-spring group-hover:-translate-y-px',
            square ? 'aspect-square' : 'h-[84px]',
          )}
        >
          {item.img && <img src={item.img} alt="" draggable={false} className="size-full object-cover" />}
          {tag}
        </span>
        {!square && <span className="type-small text-ink-2">{item.name}</span>}
      </button>
    )
  }

  return (
    <div
      {...handlers}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handlers.onClick()
        }
      }}
      className="group relative flex min-h-[84px] cursor-grab flex-col justify-between gap-2 rounded-[12px] border border-rule bg-well p-2.5 text-left transition-[transform,background-color] duration-200 ease-spring hover:-translate-y-px hover:bg-level active:cursor-grabbing"
    >
      <span className="flex items-start justify-between gap-2">
        {item.gradient ? (
          <span className="block h-[42px] flex-1 rounded-[7px]" style={{ background: item.gradient }} />
        ) : (
          <Icon width={18} height={18} className="text-ink-2" />
        )}
        <TilePreview kind={kind} data={item.data} label={item.name} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[12px] leading-[1.3] font-medium text-ink-1">{item.name}</span>
        {item.meta && <span className="font-mono text-[10px] leading-[1.3] text-ink-3">{item.meta}</span>}
      </span>
      {inSong && <span className="type-small absolute top-2 right-2 text-ink-3">In song</span>}
    </div>
  )
}

/** What a tile sounds like, for the kinds that make a sound. A few seconds is enough to tell. */
function previewOf(kind: Kind, data: Record<string, unknown>): Score | null {
  const label = String(data.label ?? data.name ?? '')
  const src = typeof data.src === 'string' ? data.src : undefined
  const length = Math.min(8, Number(data.duration ?? 8))
  if (kind === 'instrument') return instrumentScore(label)
  if (kind === 'voice') return voiceScore(label, length, src)
  if (kind === 'sound') return soundScore(label, length, 1, src)
  if (kind === 'chords' && Array.isArray(data.chords)) return chordsScore(data.chords as string[])
  return null
}

function TilePreview({ kind, data, label }: { kind: Kind; data: Record<string, unknown>; label: string }) {
  const [stop, setStop] = useState<(() => void) | null>(null)
  const score = previewOf(kind, data)
  useEffect(() => () => stop?.(), [stop])
  if (!score) return null

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (stop) return setStop(null)
    const end = window.setTimeout(() => setStop(null), score.length * 1000 + 300)
    const halt = play(whole(score), 0, () => setStop(null))
    setStop(() => () => {
      window.clearTimeout(end)
      halt()
    })
  }

  return (
    <button
      type="button"
      aria-label={`${stop ? 'Stop' : 'Preview'} ${label}`}
      onClick={toggle}
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full shadow-[0_1px_4px_rgb(20_22_26/0.08)] transition-[background-color,color,transform] duration-200 hover:scale-105',
        stop ? 'bg-ink text-on-ink' : 'bg-card text-ink-2 hover:bg-ink hover:text-on-ink',
      )}
    >
      {stop ? <Square width={11} height={11} /> : <Play width={13} height={13} />}
    </button>
  )
}

/** Dashed "make your own" tile. Uploads read a file; recording is pretend for now. */
function OwnTile({ kind, action }: { kind: Kind; action: OwnAction }) {
  const add = useAddNode()
  const keep = useYours((s) => s.keep)
  const file = useRef<HTMLInputElement>(null)
  const role = DEFAULT_ROLE[kind]

  const run = () => {
    if (action.does === 'upload') return file.current?.click()
    if (action.does === 'record') {
      const data = kind === 'voice' ? { label: 'Your hum', duration: 4 } : { label: 'New sound', duration: 4 }
      keep({ kind, name: data.label, meta: '0:04 · You', data })
      return add(kind, data)
    }
    add(kind)
  }

  const onFile = (f: File) => {
    const src = URL.createObjectURL(f)
    const name = f.name.replace(/\.[^.]+$/, '')
    if (kind === 'photo') {
      const data = { caption: name, src }
      keep({ kind, name, data, img: src })
      return add(kind, data)
    }
    const audio = new Audio(src)
    audio.onloadedmetadata = () => {
      const duration = Math.round(audio.duration) || 0
      const data = { label: name, duration, src }
      keep({ kind, name, meta: `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')} · You`, data })
      add(kind, data)
    }
  }

  return (
    <>
      <button
        onClick={run}
        className={cn(
          'flex flex-col rounded-[10px] border border-dashed border-rule-strong bg-card text-left transition-colors duration-150 hover:bg-well',
          kind === 'photo' ? 'aspect-square items-center justify-center gap-1.5' : 'min-h-[84px] justify-between p-2.5',
        )}
      >
        {kind === 'photo' ? (
          <MediaImagePlus width={20} height={20} className="text-ink-2" />
        ) : (
          <Plus width={18} height={18} className={ROLE_TEXT[role]} />
        )}
        <span className={cn('text-[12px] leading-[1.3]', kind === 'photo' ? 'text-ink-2' : 'font-medium text-ink-1')}>
          {action.label}
        </span>
      </button>
      {action.does === 'upload' && (
        <input
          ref={file}
          type="file"
          hidden
          accept={kind === 'photo' ? 'image/*' : 'audio/*'}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
      )}
    </>
  )
}

/**
 * Describe one and get two to choose from. Written ahead for the prototype:
 * pressing into the box types a prompt in, and Generate brings back the two it "made".
 */
function Generate({ kind }: { kind: Kind }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'making' | 'done'>('idle')
  const [typing, setTyping] = useState(false)
  const spec = DRAWERS[kind]
  const { prompt, made } = GENERATED[kind]

  // Types the prompt in a letter at a time, as if someone were writing it.
  useEffect(() => {
    if (!typing) return
    let i = 0
    const timer = window.setInterval(() => {
      i += 1
      setText(prompt.slice(0, i))
      if (i >= prompt.length) setTyping(false)
    }, 28)
    return () => window.clearInterval(timer)
  }, [typing, prompt])

  const make = () => {
    if (!text.trim() || typing) return
    setState('making')
    window.setTimeout(() => setState('done'), 1100)
  }

  return (
    <div className="flex flex-col gap-3.5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          make()
        }}
        className="flex flex-col gap-2 rounded-[14px] border border-rule bg-well p-2.5"
      >
        <textarea
          value={text}
          onFocus={() => !text && state === 'idle' && setTyping(true)}
          onChange={(e) => {
            setTyping(false)
            setText(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              make()
            }
          }}
          rows={2}
          placeholder={`Describe the ${spec.label.toLowerCase()} you want`}
          className="type-body field-sizing-content min-h-[44px] resize-none bg-transparent text-ink-1 outline-none placeholder:text-ink-3"
        />
        <button
          type="submit"
          disabled={!text.trim() || typing || state === 'making'}
          className="shine-button type-action self-end rounded-full bg-ink px-3.5 py-2 text-on-ink transition-opacity disabled:opacity-40"
        >
          {state === 'making' ? 'Making…' : 'Generate'}
        </button>
      </form>
      {state === 'making' && (
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1].map((i) => (
            <span key={i} className="h-[84px] animate-pulse rounded-[10px] bg-well" />
          ))}
        </div>
      )}
      {state === 'done' && (
        <>
          <Heading label="Made from your words" right="2" />
          <Grid photo={false}>
            {made.map((item) => (
              <ItemTile key={item.name} kind={kind} item={item} inSong={false} />
            ))}
          </Grid>
        </>
      )}
    </div>
  )
}
