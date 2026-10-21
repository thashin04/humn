import { AppWindow, InfoCircle, NavArrowDown, Xmark } from 'iconoir-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { type CSSProperties, type ReactNode } from 'react'
import { nameOf } from '@/data/library'
import { purposeOf } from '@/data/interpret'
import { bars, LENGTHS, PARTS } from '@/data/parts'
import { ROLES, roleOf, type AnySongNode, type Kind, type SongNode, type Vocals } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { KIND_ICONS } from './kindIcons'

const VOCALS: { id: Vocals; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'hum', label: 'Humming' },
  { id: 'words', label: 'Words' },
]

/**
 * Settings for the selected section, sliding out from the right like the
 * rail's drawer does from the left. Opens when the person picks one section
 * (demo: not when the app selects one); clicking away or closing it
 * deselects the section.
 */
export function SectionPanel() {
  const section = useSong((s) => {
    const picked = s.nodes.filter((n) => n.selected)
    if (picked.length !== 1 || picked[0].type !== 'section') return null
    const section = picked[0] as SongNode<'section'>
    // Demo: only once the person has picked it themselves (or one of its inputs, to look at), never because the app
    // selected it (a part just made, cards gathered into one).
    return section.id === s.picked || !!s.focusedInputId ? section : null
  })
  // A card on its own, opened from its Edit button.
  const card = useSong((s) => {
    const picked = s.nodes.filter((n) => n.selected)
    return picked.length === 1 && picked[0].id === s.editing ? picked[0] : null
  })
  const focusedInputId = useSong((s) => s.focusedInputId)
  const nodes = useSong((s) => s.nodes)
  const setFocusedInput = useSong((s) => s.setFocusedInput)
  const editInput = useSong((s) => s.editInput)
  const focusedInput = section && focusedInputId
    ? connectedInputs(section, nodes).find(({ node }) => node.id === focusedInputId)
    : null
  // The socket it's plugged into, or the one it would go in.
  const cardRole = card &&
    (ROLES.find((r) => nodes.some((n) => n.type === 'section' && n.data.sources[r.id]?.includes(card.id))) ??
      ROLES.find((r) => r.id === roleOf(card.type))!)

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {(card || section) && (
          <motion.aside
            key={(card ?? section)!.id}
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.98, transition: { duration: 0.16, ease: [0.25, 0.8, 0.25, 1] } }}
            transition={{ type: 'spring', visualDuration: 0.34, bounce: 0.18 }}
            style={{ transformOrigin: '100% 0%' }}
            className="pointer-events-auto flex max-h-full w-[300px] flex-col overflow-hidden rounded-[26px] bg-card shadow-lift"
            aria-label="Section settings"
          >
            {card && cardRole ? (
              <InputSettings input={{ node: card, role: cardRole }} onBack={() => editInput(null)} closes />
            ) : focusedInput ? (
              <InputSettings input={focusedInput} onBack={() => setFocusedInput(null)} />
            ) : (
              section && <Settings section={section} onOpenInput={setFocusedInput} />
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}

function Settings({ section, onOpenInput }: { section: SongNode<'section'>; onOpenInput: (inputId: string) => void }) {
  const { updateData, onNodesChange } = useSong()
  const { id, data } = section
  const set = (patch: Partial<SongNode<'section'>['data']>) => updateData(id, patch)
  const part = PARTS.find((p) => p.name === data.name)

  return (
    <>
      <div className="flex items-start gap-2.5 px-5 pt-[18px] pb-3">
        <AppWindow width={18} height={18} className="mt-0.5 shrink-0 text-ink-1" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-[1.3] font-medium text-ink-1">Shape this {data.name.toLowerCase()}</p>
          <p className="type-small text-ink-3">Choose what this part should feel like.</p>
        </div>
        <button
          aria-label={`Close ${data.name.toLowerCase()} settings`}
          title="Close"
          onClick={() => onNodesChange([{ type: 'select', id, selected: false }])}
          className="-mt-1 -mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-well hover:text-ink-1"
        >
          <Xmark width={16} height={16} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-1 pb-5 [&>*]:shrink-0">
        <Field label="Creative direction" aside="Optional" note="Only changes this part.">
          <textarea
            value={data.direction ?? ''}
            onChange={(e) => set({ direction: e.target.value })}
            placeholder="Let the game environment set a warm mood, and the piano comes in slowly."
            rows={3}
            className="type-body field-sizing-content min-h-[76px] w-full resize-none rounded-[12px] border border-rule bg-well px-3 py-2.5 text-ink-1 outline-none transition-colors placeholder:text-ink-3 focus:border-rule-strong focus:bg-card"
          />
        </Field>

        <Field label="Voice">
          <Pills options={VOCALS} value={data.vocals ?? 'none'} onChange={(vocals) => set({ vocals: vocals as Vocals })} />
        </Field>

        <span className="h-px shrink-0 bg-rule" />

        <Field label="Part" note={part?.hint}>
          <Pills
            options={PARTS.map((p) => ({ id: p.name, label: p.name }))}
            value={data.name}
            onChange={(name) => set({ name })}
            tight
          />
        </Field>

        <Field label="Length">
          <Pills
            options={LENGTHS.map((l) => ({ id: String(l), label: bars(l) }))}
            value={String(data.length)}
            onChange={(l) => set({ length: Number(l) })}
          />
        </Field>

        <Connected section={section} onOpenInput={onOpenInput} />

        <p className="type-small flex items-center gap-1.5 text-ink-3">
          <InfoCircle width={14} height={14} className="shrink-0" />
          Next: choose “Hear 2 ideas” on the canvas card.
        </p>
      </div>
    </>
  )
}

function Field({ label, aside, note, children }: { label: string; aside?: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <p className="type-caption text-ink-2">{label}</p>
        {aside && <p className="type-small text-ink-3">{aside}</p>}
      </div>
      {children}
      {note && <p className="type-small -mt-0.5 text-ink-3">{note}</p>}
    </div>
  )
}

/** The drawer's segmented control: a row of pills on a well, the chosen one lifted. */
function Pills({
  options,
  value,
  onChange,
  tight,
}: {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  /** Five or more options: less padding so they still fit on one row. */
  tight?: boolean
}) {
  return (
    <div role="radiogroup" className="flex gap-0.5 rounded-full bg-well p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'type-caption flex h-7 flex-1 items-center justify-center rounded-full whitespace-nowrap transition-[background-color,color,box-shadow] duration-200',
            tight ? 'px-1' : 'px-2.5',
            value === o.id ? 'bg-card text-ink-1 shadow-lift' : 'text-ink-2 hover:text-ink-1',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** What's plugged into this section, folded away until asked for. */
function Connected({ section, onOpenInput }: { section: SongNode<'section'>; onOpenInput: (inputId: string) => void }) {
  const nodes = useSong((s) => s.nodes)
  const plugged = connectedInputs(section, nodes)

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-rule p-2">
      <div className="flex items-center justify-between px-1.5">
        <p className="type-caption text-ink-1">Inputs shaping this part</p>
        <p className="type-small text-ink-3">{plugged.length}</p>
      </div>
      {plugged.length ? (
        <div className="flex flex-col gap-1" role="list" aria-label="Inputs shaping this part">
          {plugged.map(({ node, role }) => {
            const Icon = node.type in KIND_ICONS ? KIND_ICONS[node.type as Kind] : null
            return (
              <button
                key={node.id}
                type="button"
                role="listitem"
                onClick={() => onOpenInput(node.id)}
                className="flex min-h-11 w-full items-center gap-2 rounded-[10px] px-2 text-left transition-[background-color,color] duration-200 hover:bg-well"
              >
                {Icon && <Icon width={15} height={15} className="shrink-0 text-ink-2" />}
                <span className="type-small min-w-0 flex-1 truncate text-ink-1">{inputName(node)}</span>
                <span className="type-small shrink-0 text-ink-3">{role.name}</span>
                <NavArrowDown width={14} height={14} className="-rotate-90 shrink-0 text-ink-3" />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="type-small px-1.5 pb-1 text-ink-3">Add an input to give this part a direction.</p>
      )}
    </div>
  )
}

function connectedInputs(section: SongNode<'section'>, nodes: AnySongNode[]) {
  return ROLES.flatMap((role) =>
    (section.data.sources[role.id] ?? []).flatMap((source) => {
      const node = nodes.find((candidate) => candidate.id === source)
      return node ? [{ node, role }] : []
    }),
  )
}

function InputSettings({
  input,
  onBack,
  closes,
}: {
  input: { node: AnySongNode; role: (typeof ROLES)[number] }
  onBack: () => void
  /** Opened on its own rather than from a section, so there's nothing to go back to: it closes instead. */
  closes?: boolean
}) {
  const Icon = input.node.type in KIND_ICONS ? KIND_ICONS[input.node.type as Kind] : null

  return (
    <>
      <div className="flex items-start gap-2.5 px-5 pt-[18px] pb-3">
        <button
          type="button"
          aria-label={closes ? 'Close' : 'Back to section settings'}
          onClick={onBack}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-well hover:text-ink-1',
            closes ? 'order-last -mr-2' : '-ml-2',
          )}
        >
          {closes ? (
            <Xmark width={17} height={17} />
          ) : (
            <NavArrowDown width={17} height={17} className="rotate-90" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon width={16} height={16} className="shrink-0 text-ink-2" />}
            <p className="truncate text-[15px] leading-[1.3] font-medium text-ink-1">{inputName(input.node)}</p>
          </div>
          <p className="type-small text-ink-3">{input.role.name} input</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-1 pb-5 [&>*]:shrink-0">
        <div className="rounded-[12px] bg-well p-3">
          <p className="type-small text-ink-2">What this adds</p>
          <p className="type-body mt-1 text-ink-1">{purposeOf(input.node, input.role.id)}</p>
        </div>
        <Field label="Edit this input">
          <InputEditor node={input.node} />
        </Field>
        <p className="type-small text-ink-3">Changes here update this input wherever it shapes the song.</p>
      </div>
    </>
  )
}

function inputName(node: AnySongNode) {
  return nameOf(node.data as Record<string, unknown>).trim() || DRAWER_LABELS[node.type as Kind]
}

const DRAWER_LABELS: Record<Kind, string> = {
  words: 'Prompt',
  lyrics: 'Lyrics',
  voice: 'Voice',
  photo: 'Image',
  feeling: 'Feeling',
  sound: 'Sound',
  color: 'Colour',
  instrument: 'Instrument',
  chords: 'Chords',
}

function InputEditor({ node }: { node: AnySongNode }) {
  const updateData = useSong((s) => s.updateData)
  const data = node.data as Record<string, unknown>
  const set = (patch: Record<string, unknown>) => updateData(node.id, patch)
  const fieldClass = 'type-small min-h-8 w-full rounded-[8px] border border-rule bg-card px-2.5 py-1.5 text-ink-1 outline-none placeholder:text-ink-3 focus:border-rule-strong'

  if (node.type === 'words') {
    return <textarea value={String(data.text ?? '')} onChange={(e) => set({ text: e.target.value })} rows={2} className={`${fieldClass} resize-none`} aria-label="Prompt text" />
  }
  if (node.type === 'photo') {
    return <input value={String(data.caption ?? '')} onChange={(e) => set({ caption: e.target.value })} className={fieldClass} aria-label="Image caption" />
  }
  if (node.type === 'feeling') {
    const amount = Number(data.amount ?? 0.5)
    return (
      <div>
        <input type="range" min={0} max={1} step={0.01} value={amount} onChange={(e) => set({ amount: Number(e.target.value) })} className="humn-range" style={{ '--v': `${amount * 100}%` } as CSSProperties} aria-label="Feeling intensity" />
        <div className="type-small mt-1 flex justify-between text-ink-3"><span>Subtle</span><span>Strong</span></div>
      </div>
    )
  }
  if (node.type === 'voice' || node.type === 'sound') {
    return <input value={String(data.label ?? '')} onChange={(e) => set({ label: e.target.value })} className={fieldClass} aria-label={`${node.type} label`} />
  }
  if (node.type === 'color') {
    return <input value={String(data.label ?? '')} onChange={(e) => set({ label: e.target.value })} className={fieldClass} aria-label="Colour label" />
  }
  if (node.type === 'instrument') {
    return (
      <div className="flex flex-col gap-1.5">
        <input value={String(data.name ?? '')} onChange={(e) => set({ name: e.target.value })} className={fieldClass} aria-label="Instrument name" />
        <input value={String(data.detail ?? '')} onChange={(e) => set({ detail: e.target.value })} className={fieldClass} aria-label="Instrument detail" />
      </div>
    )
  }
  if (node.type === 'chords') {
    return <input value={Array.isArray(data.chords) ? data.chords.join(', ') : ''} onChange={(e) => set({ chords: e.target.value.split(',').map((chord) => chord.trim()).filter(Boolean) })} className={fieldClass} aria-label="Chords" />
  }
  return null
}
