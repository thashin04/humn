import type { NodeProps } from '@xyflow/react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { KIND_ICONS } from '@/components/chrome/kindIcons'
import { useAddNode } from '@/components/chrome/useAddNode'
import photo from '@/assets/photos/template-photo.jpg'
import { FeelingNode, PhotoNode } from '@/components/nodes/nodes'
import { Preview } from '@/components/nodes/previewContext'
import { TakeNode } from '@/components/nodes/take'
import { DEFAULT_ROLE, type Kind, type SongNode } from '@/data/nodes'
import { useSong } from '@/store/song'

/** An empty song: a fan of examples that opens the templates, or add your own first node. */
export function EmptyState() {
  const { openTemplatePicker, setDrawer } = useSong()
  const add = useAddNode()
  // The examples sit stacked until the pointer's on them or on the title, then fan out.
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-[720px] flex-col items-center gap-10">
      <div className="flex flex-col items-center" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}>
        <TemplateFan open={open} onOpen={openTemplatePicker} />
        <button
          onClick={openTemplatePicker}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          // The padding fills the gap above, so moving from the title to the cards keeps them open.
          className="pointer-events-auto pt-10 text-[32px] leading-[1.15] font-medium tracking-[-0.035em] text-ink transition-opacity hover:opacity-70"
        >
          Start with a story
        </button>
      </div>
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
          {ADD.map((a) => {
            const Icon = KIND_ICONS[a.kind]
            return (
              <button
                key={a.kind}
                onClick={() => (a.kind === 'words' ? add('words') : setDrawer(a.kind))}
                className="group pointer-events-auto flex flex-col items-center gap-[9px]"
              >
                <span className="relative flex size-[52px] items-center justify-center rounded-full bg-card shadow-lift transition-transform duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:scale-[1.06] group-active:scale-95">
                  <Icon className="size-5 text-ink-1" />
                  {/* The colour of the part of the song it feeds. */}
                  <span
                    className="absolute top-3 right-3 size-1.5 rounded-full"
                    style={{ background: `var(--soft-role-${DEFAULT_ROLE[a.kind]})` }}
                  />
                </span>
                <span className="type-caption text-ink-2">{a.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const ADD: { kind: Kind; label: string }[] = [
  { kind: 'words', label: 'Prompt' },
  { kind: 'voice', label: 'Record' },
  { kind: 'photo', label: 'Image' },
  { kind: 'sound', label: 'Audio' },
]

type Card = 'feeling' | 'photo' | 'take'

const FAN_W = 760
const FAN_H = 216
/** A card the size of the real node it holds, centred in the fan so every card shares one middle. */
const centred = (width: number, height: number): CSSProperties => ({
  left: (FAN_W - width) / 2,
  top: (FAN_H - height) / 2,
  width,
  height,
})

// Stacked, the side cards hide behind the photo, just peeking out; open, they fan out
// around the bottom like a hand of cards, still tucked behind it, reaching equally far each way.
const PLACES: Record<Card, { box: CSSProperties; stacked: string; open: string }> = {
  feeling: {
    box: centred(240, 100),
    stacked: 'translate(-40px, 10px) rotate(-6deg)',
    open: 'translate(-150px, 22px) rotate(-11deg)',
  },
  photo: {
    box: centred(200, 216),
    stacked: 'none',
    open: 'translateY(-6px)',
  },
  take: {
    box: centred(300, 170),
    stacked: 'translate(40px, 6px) rotate(6deg)',
    open: 'translate(120px, 18px) rotate(11deg)',
  },
}

/** Stacked until `open`, then fanned out; once open, the card under the pointer grows and comes forward. */
function TemplateFan({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const [hot, setHot] = useState<Card | null>(null)

  const card = (id: Card, children: ReactNode) => {
    const place = PLACES[id]
    const lift = open && hot === id ? ' scale(1.07)' : ''
    return (
      // A div, not a button: the real nodes inside have buttons of their own. The title below is the button.
      <div
        key={id}
        aria-hidden
        onClick={onOpen}
        onPointerEnter={() => setHot(id)}
        onPointerLeave={() => setHot(null)}
        className="pointer-events-auto absolute flex cursor-pointer items-center justify-center transition-transform duration-500 ease-spring motion-reduce:transition-none"
        style={{
          ...place.box,
          transformOrigin: '50% 100%',
          transform: `${open ? place.open : place.stacked}${lift}`,
          // The photo stays on top of the pile; open, whichever card is pointed at comes forward.
          zIndex: open && hot === id ? 3 : id === 'photo' ? 2 : 1,
        }}
      >
        <div className="pointer-events-none flex-none">{children}</div>
      </div>
    )
  }

  return (
    <div className="relative shrink-0" style={{ width: FAN_W, height: FAN_H }}>
      <Preview.Provider value>
        {card('feeling', <FeelingNode {...FEELING} />)}
        {card('photo', <PhotoNode {...PHOTO} />)}
        {card('take', <TakeNode {...TAKE} />)}
      </Preview.Provider>
    </div>
  )
}

/** Props for a real node drawn as an example, so the fan always matches what's on the canvas. */
const example = <T,>(type: string, data: object) => ({ id: `example-${type}`, type, data, selected: false }) as T

const FEELING = example<NodeProps<SongNode<'feeling'>>>('feeling', { name: 'Nostalgia', amount: 0.85 })
const PHOTO = example<NodeProps<SongNode<'photo'>>>('photo', { caption: 'The red house, 1997', src: photo })
const TAKE = example<NodeProps<SongNode<'take'>>>('take', { sectionId: '', state: 'done', version: 'B', length: 30 })
