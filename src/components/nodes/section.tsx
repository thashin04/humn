import { Handle, Position, useReactFlow, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import { Check, NavArrowDown, Plus, Refresh } from 'iconoir-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import iconSection from '@/assets/figma/node-icon-section.svg'
import { KIND_ICONS } from '@/components/chrome/kindIcons'
import { slotSentence } from '@/data/interpret'
import { DRAWERS } from '@/data/library'
import { clock, DEFAULT_ROLE, ROLES, type AnySongNode, type Kind, type Role, type SongNode } from '@/data/nodes'
import { LENGTHS, PARTS } from '@/data/parts'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { NodeShell } from './NodeShell'

const ADDABLE: Kind[] = ['lyrics', 'voice', 'photo', 'sound', 'color', 'instrument']

/**
 * A part of the song, read as a story rather than a form: what shapes it,
 * then one line for each kind of thing plugged in ("Nana humming guides the
 * tune"). Empty slots don't show; pulling a wire in, or "Add an
 * influence", is how new ones arrive. Ends with a note and one thing to do.
 */
export function SectionNode({ id, data, selected }: NodeProps<SongNode<'section'>>) {
  const targeted = useSong((s) => s.snap?.section === id)
  const snapRole = useSong((s) => (s.snap?.section === id ? s.snap.role : null))
  const { makeTakes, updateData } = useSong()
  const nodes = useSong((s) => s.nodes)
  const focusedInputId = useSong((s) => s.focusedInputId)
  const setFocusedInput = useSong((s) => s.setFocusedInput)
  const set = (patch: Partial<SongNode<'section'>['data']>) => updateData(id, patch)

  const filled = ROLES.flatMap((r) => {
    const cards = (data.sources[r.id] ?? [])
      .flatMap((src) => nodes.find((n) => n.id === src) ?? [])
      // Pictures lead, so a slot's thumbnail and sentence start with something you can see.
      .sort((a, b) => Number(isVisual(b)) - Number(isVisual(a)))
    return cards.length ? [{ role: r.id, cards }] : []
  })
  const empty = ROLES.filter((r) => !filled.some((f) => f.role === r.id)).map((r) => r.id)
  // A slot's socket moves between its own row and the landing row as cards come and go, sometimes
  // without the card changing size, so tell React Flow to measure where the sockets are again.
  const updateNodeInternals = useUpdateNodeInternals()
  const layout = filled.map((f) => f.role).join()
  useEffect(() => updateNodeInternals(id), [layout, id, updateNodeInternals])
  const count = filled.reduce((n, f) => n + f.cards.length, 0)

  return (
    <NodeShell
      width={320}
      tall
      icon={iconSection}
      label={data.name}
      selected={selected}
      targeted={targeted}
      tab={
        <Menu
          label={data.name}
          heading="Part of the song"
          value={data.name}
          options={PARTS.map((p) => p.name)}
          note={(name) => PARTS.find((p) => p.name === name)?.hint}
          onPick={(name) => set({ name })}
          trigger={
            <>
              <img src={iconSection} alt="" className="size-[15px]" />
              <span className="type-title whitespace-nowrap text-ink-1">{data.name}</span>
            </>
          }
        />
      }
    >
      <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
        <div className="flex justify-end">
          <Menu
            label="Length"
            heading="Length"
            value={String(data.length)}
            options={LENGTHS.map(String)}
            show={(l) => clock(Number(l))}
            onPick={(l) => set({ length: Number(l) })}
            pill
            trigger={<span className="font-mono text-[12px] text-ink-1">{clock(data.length)}</span>}
          />
        </div>
        <div className="flex flex-col gap-1 px-1.5 pb-1.5">
          <p className="line-clamp-2 text-[19px] leading-[1.2] font-semibold tracking-[-0.015em] text-ink">What shapes your {data.name.toLowerCase()}</p>
          <p className="type-caption text-ink-3">
            {count
              ? `${count} ${count === 1 ? 'thing' : 'things'} plugged in. Hear two ideas when you’re ready.`
              : `Add an input to shape your ${data.name.toLowerCase()}.`}
          </p>
        </div>

        {filled.map(({ role, cards }) => (
          <Slot key={role} section={id} role={role} cards={cards} focusedInputId={focusedInputId} onFocusInput={setFocusedInput} />
        ))}

        <AddInfluence section={id} empty={empty} hot={snapRole && empty.includes(snapRole) ? snapRole : null} />

        <div className="relative">
          <HearButton section={id} disabled={!filled.length} onClick={() => makeTakes(id)} />
          {/* Where the wire out to this section's take starts: beside the button that makes it. */}
          <Handle
            type="source"
            id="take"
            position={Position.Right}
            isConnectable={false}
            className="wire-out"
            style={{ top: 'calc(50% + 3px)', right: -12 }}
          />
        </div>
      </div>
    </NodeShell>
  )
}

/**
 * The verse's one thing to do. Hear 2 ideas the first time; while they're
 * being made it holds a quiet "Making…" with a spinner; after that it offers
 * to regenerate. The label slides between states, and the icon turns on press.
 */
function HearButton({ section, disabled, onClick }: { section: string; disabled: boolean; onClick: () => void }) {
  const state = useSong((s) => {
    const takes = s.nodes.filter((n) => n.type === 'take' && n.data.sectionId === section && !n.data.branchOf)
    return takes.some((t) => t.type === 'take' && t.data.state === 'making') ? 'making' : takes.length ? 'done' : null
  })
  const [turns, setTurns] = useState(0)
  const making = state === 'making'
  const label = making ? 'Making 2 ideas…' : state ? 'Regenerate' : 'Hear 2 ideas'

  return (
    <button
      type="button"
      disabled={disabled || making}
      aria-busy={making}
      onClick={() => {
        setTurns((t) => t + 1)
        onClick()
      }}
      className={cn(
        'nodrag type-action relative mt-1.5 flex h-11 w-full items-center justify-center overflow-hidden rounded-[14px] transition-[opacity,transform,background-color,color] duration-200 active:scale-[0.98]',
        making ? 'bg-well text-ink-2' : 'bg-ink text-on-ink hover:opacity-90 disabled:opacity-30',
      )}
    >
      {/* While making, a soft sheen sweeps across, so the wait reads as work. */}
      {making && <span aria-hidden className="hear-sheen pointer-events-none absolute inset-0" />}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          initial={{ y: 14, opacity: 0, filter: 'blur(2px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -14, opacity: 0, filter: 'blur(2px)' }}
          transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.2 }}
          className="relative flex items-center gap-2"
        >
          {making ? (
            <span aria-hidden className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
          ) : state ? (
            <motion.span animate={{ rotate: turns * 360 }} transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.15 }}>
              <Refresh width={15} height={15} strokeWidth={1.75} />
            </motion.span>
          ) : (
            <KindIcon kind="sound" className="size-4" />
          )}
          {label}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

/** Everything plugged into one slot, as one line about the verse. Its wires plug in at the row's left edge. */
function Slot({ section, role, cards, focusedInputId, onFocusInput }: { section: string; role: Role; cards: AnySongNode[]; focusedInputId: string | null; onFocusInput: (id: string) => void }) {
  const hot = useSong((s) => s.snap?.section === section && s.snap.role === role)
  const landed = useSong((s) => s.fresh?.section === section && s.fresh.role === role)
  const title = slotSentence(cards, role)
  const focused = cards.some((card) => card.id === focusedInputId)
  const roleLabel = ROLES.find((item) => item.id === role)?.name ?? role

  return (
    <div
      className={cn(
        'animate-row-in relative flex min-h-[64px] items-center gap-3 rounded-[14px] border bg-card p-2 pr-2.5 transition-[background-color,border-color,box-shadow] duration-200',
        hot
          ? 'border-[var(--c)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--c)_12%,transparent)]'
          : focused
            ? 'border-select bg-level shadow-[0_0_0_3px_color-mix(in_srgb,var(--soft-accent)_12%,transparent)]'
            : 'border-rule hover:bg-well',
      )}
      style={{ '--c': `var(--soft-role-${role})` } as CSSProperties}
      onClick={() => onFocusInput(cards.find((card) => card.id === focusedInputId)?.id ?? cards[0].id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onFocusInput(cards.find((card) => card.id === focusedInputId)?.id ?? cards[0].id)
        }
      }}
      aria-label={`Inspect ${roleLabel.toLowerCase()} input`}
    >
      <Handle type="target" id={role} position={Position.Left} isConnectableStart={false} className="wire-socket" />
      <span aria-hidden data-hump="" className={cn('wire-hump', landed && 'wire-pop-in')} />
      <Thumb cards={cards} role={role} />
      <div className="min-w-0 flex-1">
        <p className="type-caption line-clamp-2 text-ink-1">{title}</p>
      </div>
      <span aria-hidden className="grip-dots shrink-0" />
    </div>
  )
}

/** A look at what's in a slot: the photo or colour itself, or the kind's mark in the slot's colour. */
function Thumb({ cards, role }: { cards: AnySongNode[]; role: Role }) {
  const first = cards[0]
  const base = 'relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[11px]'
  const tint = { background: `color-mix(in srgb, var(--soft-role-${role}) 10%, var(--soft-card))` }
  const more = cards.length > 1 && (
    <span className="absolute right-1 bottom-1 rounded-full bg-card/90 px-1 font-mono text-[10px] leading-[14px] text-ink-2">
      +{cards.length - 1}
    </span>
  )
  if (first.type === 'photo' && first.data.src)
    return (
      <span className={base}>
        <img src={first.data.src} alt="" draggable={false} className="size-full object-cover" />
        {more}
      </span>
    )
  if (first.type === 'instrument' && first.data.thumb)
    return (
      <span className={base}>
        <img src={first.data.thumb} alt="" draggable={false} className="size-full object-cover" />
        {more}
      </span>
    )
  if (first.type === 'color')
    return (
      <span className={base} style={{ backgroundImage: first.data.gradient }}>
        {more}
      </span>
    )
  return (
    <span className={base} style={tint}>
      <KindIcon kind={first.type as Kind} className="size-5 text-[var(--c)]" />
      {more}
    </span>
  )
}

function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
  // A take carried on from the last part shows as sound.
  const Icon = KIND_ICONS[kind] ?? KIND_ICONS.sound
  return Icon ? <Icon strokeWidth={1.5} className={className} /> : null
}

/**
 * Below the slots: add a card that plugs straight in. While a wire is pulled
 * toward a slot that's still empty, this is where it lands, so it says so.
 */
function AddInfluence({ section, empty, hot }: { section: string; empty: Role[]; hot: Role | null }) {
  const [open, setOpen] = useState(false)
  const { addNode, connect } = useSong()
  const { getNode } = useReactFlow()
  const hotName = hot && ROLES.find((r) => r.id === hot)!.name

  const add = (kind: Kind) => {
    setOpen(false)
    const sec = getNode(section)
    if (!sec) return
    const plugged = useSong.getState().nodes.filter((n) => n.type !== 'section' && n.type !== 'take').length
    const id = addNode(kind, { x: sec.position.x - 380, y: sec.position.y - 120 + (plugged % 4) * 90 })
    connect(id, section, DEFAULT_ROLE[kind])
  }

  return (
    <div className="relative" style={{ '--c': `var(--soft-role-${hot ?? 'intent'})` } as CSSProperties}>
      {/* Empty slots' sockets live here, so a wire pulled toward one has somewhere to land. */}
      {empty.map((r) => (
        <Handle key={r} type="target" id={r} position={Position.Left} isConnectableStart={false} className="wire-socket" />
      ))}
      {hot && <span aria-hidden data-hump="" className="wire-hump" />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'nodrag type-caption flex h-10 items-center gap-2 rounded-[12px] border px-3 transition-[border-color,background-color,box-shadow] duration-200',
          hot
            ? 'w-full border-[var(--c)] bg-[color-mix(in_srgb,var(--c)_6%,var(--soft-card))] text-ink-1 shadow-[0_0_0_4px_color-mix(in_srgb,var(--c)_12%,transparent)]'
            : 'border-rule text-ink-1 hover:border-rule-strong hover:bg-well',
        )}
      >
        {hot ? (
          <>
            <span className="size-1.5 rounded-full bg-[var(--c)]" />
            Plug in as {hotName}
          </>
        ) : (
          <>
            <Plus width={16} height={16} strokeWidth={1.5} className="text-ink-2" />
            Add an input
          </>
        )}
      </button>
      {open && !hot && (
        <div className="animate-wire-card absolute top-11 left-0 z-10 flex gap-1 rounded-[14px] bg-card p-1.5 shadow-[0_0_0_.5px_rgb(20_22_26/0.12),0_8px_24px_rgb(20_22_26/0.12)]">
          {ADDABLE.map((k) => (
            <button
              key={k}
              type="button"
              title={DRAWERS[k].label}
              aria-label={`Add ${DRAWERS[k].label}`}
              onClick={() => add(k)}
              className="nodrag flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-well hover:text-ink-1"
            >
              <KindIcon kind={k} className="size-[18px]" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** A small menu off a label: the part of the song in the tab, the length in its pill. */
function Menu({
  label,
  heading,
  value,
  options,
  show = (o) => o,
  note,
  onPick,
  trigger,
  pill,
}: {
  label: string
  heading: string
  value: string
  options: string[]
  show?: (o: string) => string
  /** A quieter line under each option, saying what it's for. */
  note?: (o: string) => string | undefined
  onPick: (o: string) => void
  trigger: ReactNode
  pill?: boolean
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  // Escape, or a press anywhere else, closes it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'nodrag flex items-center gap-1.5 transition-colors',
          pill ? 'h-7 rounded-full border border-rule bg-card px-2.5 hover:border-rule-strong' : 'h-7 rounded-[8px] hover:opacity-80',
          open && pill && 'border-rule-strong',
        )}
      >
        {trigger}
        <NavArrowDown width={14} height={14} strokeWidth={1.5} className={cn('text-ink-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          className={cn(
            'animate-wire-card absolute top-9 z-20 rounded-[16px] bg-card p-1.5 shadow-[0_0_0_.5px_rgb(20_22_26/0.12),0_12px_32px_rgb(20_22_26/0.14)]',
            note ? 'w-[256px]' : 'w-[132px]',
            pill ? 'right-0 origin-top-right' : '-left-2 origin-top-left',
          )}
        >
          <p className="type-small px-2 pt-1 pb-1.5 text-ink-3">{heading}</p>
          <ul role="listbox" aria-label={heading} className="flex flex-col gap-px">
            {options.map((o) => {
              const on = o === value
              const hint = note?.(o)
              return (
                <li key={o}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      setOpen(false)
                      if (!on) onPick(o)
                    }}
                    className={cn(
                      'nodrag flex w-full items-center gap-2 rounded-[10px] px-2 text-left transition-colors',
                      hint ? 'py-1.5' : 'h-8',
                      on ? 'bg-well' : 'hover:bg-well',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn('type-caption block text-ink-1', pill && 'font-mono text-[12px]')}>{show(o)}</span>
                      {hint && <span className="type-small block truncate text-ink-3">{hint}</span>}
                    </span>
                    <Check
                      width={14}
                      height={14}
                      strokeWidth={2}
                      className={cn('shrink-0 text-ink-1 transition-opacity', on ? 'opacity-100' : 'opacity-0')}
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function isVisual(n: AnySongNode) {
  return (n.type === 'photo' && !!n.data.src) || n.type === 'color' || (n.type === 'instrument' && !!n.data.thumb)
}
