import { useState, type CSSProperties, type ReactNode } from 'react'
import addPhoto from '@/assets/figma/empty-add-photo.svg'
import addSound from '@/assets/figma/empty-add-sound.svg'
import addVoice from '@/assets/figma/empty-add-voice.svg'
import addWords from '@/assets/figma/empty-add-words.svg'
import feelingDot from '@/assets/figma/empty-feeling-dot.svg'
import feelingPort from '@/assets/figma/empty-feeling-port.svg'
import photoCard from '@/assets/figma/empty-photo-card.svg'
import photoGrip from '@/assets/figma/empty-photo-grip.svg'
import photoIcon from '@/assets/figma/empty-photo-icon.svg'
import photo from '@/assets/figma/empty-photo.jpg'
import takeCard from '@/assets/figma/empty-take-card.svg'
import takePause from '@/assets/figma/empty-take-pause.svg'
import type { Kind } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'

/** An empty song: a fan of examples that opens the templates, or add your own first node. */
export function EmptyState() {
  const { openTemplatePicker, setDrawer } = useSong()

  return (
    <div className="flex w-[720px] flex-col items-center gap-10">
      <TemplateFan onOpen={openTemplatePicker} />
      <button
        onClick={openTemplatePicker}
        className="pointer-events-auto text-[32px] leading-[1.15] font-medium tracking-[-0.035em] text-ink transition-opacity hover:opacity-70"
      >
        Start with a story
      </button>
      <div className="flex w-[640px] items-center gap-4">
        <span className="h-px flex-1 bg-rule" />
        <span className="font-mono text-[11px] font-medium text-ink-3">or</span>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <div className="flex flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className="text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] text-ink">Add a node</p>
          <p className="text-[13px] leading-[1.45] text-ink-1">Drop in what you have. Connect it. Hear it become a song.</p>
        </div>
        <div className="flex gap-[26px]">
          {ADD.map((a) => (
            <button
              key={a.kind}
              onClick={() => setDrawer(a.kind)}
              className="group pointer-events-auto flex flex-col items-center gap-[9px]"
            >
              <span className="relative size-[52px] transition-transform duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:scale-[1.06] group-active:scale-95">
                <img src={a.icon} alt="" className="absolute inset-[-19.23%_-26.92%_-34.62%_-26.92%] max-w-none" />
              </span>
              <span className="type-caption text-ink-2">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const ADD: { kind: Kind; label: string; icon: string }[] = [
  { kind: 'words', label: 'Prompt', icon: addWords },
  { kind: 'voice', label: 'Record', icon: addVoice },
  { kind: 'photo', label: 'Image', icon: addPhoto },
  { kind: 'sound', label: 'Audio', icon: addSound },
]

type Card = 'feeling' | 'photo' | 'take'

// Where each card sits in the 720×200 fan (from the Figma frame), and where it goes when the fan opens.
const PLACES: Record<Card, { box: CSSProperties; rest: string; open: string }> = {
  feeling: {
    box: { left: 44.88, top: 39.31, width: 257.73, height: 159.58 },
    rest: 'rotate(-15deg)',
    open: 'translate(-44px, 10px) rotate(-20deg)',
  },
  photo: {
    box: { left: 235.88, top: -10.95, width: 200, height: 216 },
    rest: 'none',
    open: 'translateY(-10px)',
  },
  take: {
    box: { left: 395, top: 8, width: 273.82, height: 220.61 },
    rest: 'rotate(15deg)',
    open: 'translate(44px, 10px) rotate(20deg)',
  },
}

/** Hovering the fan spreads it out; the card under the pointer grows and comes forward. */
function TemplateFan({ onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  const [hot, setHot] = useState<Card | null>(null)

  const card = (id: Card, children: ReactNode) => {
    const place = PLACES[id]
    const lift = hot === id ? ' scale(1.07)' : ''
    return (
      <button
        key={id}
        onClick={onOpen}
        onPointerEnter={() => setHot(id)}
        onPointerLeave={() => setHot(null)}
        aria-label="Start with a template"
        tabIndex={-1}
        className="pointer-events-auto absolute flex items-center justify-center transition-transform duration-500 ease-spring"
        style={{ ...place.box, transform: `${open ? place.open : 'none'}${lift}`, zIndex: hot === id ? 3 : undefined }}
      >
        <div className="flex-none" style={{ transform: place.rest }}>
          {children}
        </div>
      </button>
    )
  }

  return (
    <div
      className="relative h-[200px] w-[720px]"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => {
        setOpen(false)
        setHot(null)
      }}
    >
      {card('feeling', <FeelingCard />)}
      {card('photo', <PhotoCard />)}
      {card('take', <TakeCard />)}
    </div>
  )
}

const SHADOW = 'drop-shadow-[0_4px_7px_rgb(20_22_26/0.05)] drop-shadow-[0_0_0.5px_rgb(20_22_26/0.13)]'

function FeelingCard() {
  return (
    <div className={cn('relative flex w-[240px] flex-col rounded-[12px] border border-rule bg-raised text-left', SHADOW)}>
      <div className="flex flex-col gap-1.5 px-[13px] pt-[11px] pb-3">
        <div className="flex items-center gap-1.5 font-mono text-[11px] leading-[1.4] font-medium text-ink-3">
          <img src={feelingDot} alt="" className="size-[8px]" />
          <span>Mood</span>
          <span className="flex-1 text-right">Feeling · Sol</span>
        </div>
        <p className="text-[13px] leading-[1.3] font-semibold text-ink">Nostalgia</p>
        <span className="h-0.5" />
        <div className="relative h-[22px] overflow-hidden rounded-[6px]">
          <span className="absolute inset-0 rounded-[6px] bg-ink/6" />
          <span className="absolute inset-y-0 left-0 w-[85%] rounded-[6px] bg-role-mood/22" />
          <span className="absolute top-[3px] left-2 text-[12px] leading-[1.45] text-ink-2">85% · a lot</span>
          <span className="absolute top-1 left-[calc(85%-4px)] h-3.5 w-0.5 rounded-[1px] bg-role-mood" />
        </div>
      </div>
      <img src={feelingPort} alt="" className="absolute top-1/2 right-[-10px] size-[18px] -translate-y-1/2" />
    </div>
  )
}

function PhotoCard() {
  return (
    <div className={cn('relative h-[216px] w-[200px] text-left', SHADOW)}>
      <img src={photoCard} alt="" className="absolute inset-0 size-full max-w-none" />
      <div className="absolute top-[26px] left-0 flex w-[200px] flex-col px-2 pt-2 pb-1.5">
        <img src={photo} alt="" draggable={false} className="h-[150px] w-full rounded-[9px] object-cover" />
        <p className="type-caption px-1 pt-[9px] pb-0.5 text-ink-2">Caption, 1997</p>
      </div>
      <div className="absolute top-0 left-0 flex h-[26px] items-center gap-1.5 pr-3 pl-2.5">
        <img src={photoIcon} alt="" className="size-3.5" />
        <span className="type-caption text-ink-2">Image</span>
      </div>
      <img src={photoGrip} alt="" className="absolute top-[7px] left-[173px]" />
    </div>
  )
}

const TAKE_BARS = [32, 15, 40, 28, 59, 23, 21, 49, 49, 30, 30, 34, 19, 61, 35, 25, 36, 53, 24, 42, 24, 18, 58, 47, 25, 22, 51, 16, 51, 18]

function TakeCard() {
  return (
    <div className={cn('relative h-[166px] w-[240px] text-left', SHADOW)}>
      <img src={takeCard} alt="" className="absolute inset-0 size-full max-w-none" />
      <span className="absolute top-0 left-0 h-[22px] w-10 rounded-[9px] bg-card" />
      <span className="absolute top-[5px] left-[16.5px] font-mono text-[11.5px] leading-none font-medium text-ink-3">A</span>
      <span className="absolute top-2 left-[62.5px] font-mono text-[11.5px] leading-none font-medium text-ink-1">B</span>
      <div className="absolute top-7 left-0 flex w-[240px] flex-col gap-3 px-4 pt-3 pb-3.5">
        <div className="flex h-16 items-center gap-1">
          {TAKE_BARS.map((h, i) => (
            <span key={i} className={cn('w-[3px] rounded-[1.5px]', i < 14 ? 'bg-ink' : 'bg-bar')} style={{ height: h }} />
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <p className="flex-1 font-mono text-[12px] leading-none text-ink-3">Verse · 0:30</p>
          <span className="flex size-[30px] items-center justify-center rounded-full bg-ink">
            <img src={takePause} alt="" className="size-[10.833px]" />
          </span>
        </div>
      </div>
    </div>
  )
}
