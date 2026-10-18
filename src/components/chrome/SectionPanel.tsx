import { AppWindow, InfoCircle, NavArrowDown, Xmark } from 'iconoir-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { nameOf } from '@/data/library'
import { LENGTHS, PARTS } from '@/data/parts'
import { ROLES, type AnySongNode, type Kind, type SongNode, type Vocals } from '@/data/nodes'
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
 * rail's drawer does from the left. Opens when one section is selected;
 * clicking away or closing it deselects the section.
 */
export function SectionPanel({ songTitle }: { songTitle: string }) {
  const section = useSong((s) => {
    const picked = s.nodes.filter((n) => n.selected)
    if (picked.length !== 1 || picked[0].type !== 'section') return null
    const section = picked[0] as SongNode<'section'>
    // Only once something beyond the prompt is shaping it: until then there's little to set.
    const shaped = ROLES.some(
      (r) =>
        r.id !== 'intent' &&
        (section.data.sources[r.id] ?? []).some((src) => s.nodes.some((x) => x.id === src)),
    )
    return shaped ? section : null
  })

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {section && (
          <motion.aside
            key={section.id}
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.98, transition: { duration: 0.16, ease: [0.25, 0.8, 0.25, 1] } }}
            transition={{ type: 'spring', visualDuration: 0.34, bounce: 0.18 }}
            style={{ transformOrigin: '100% 0%' }}
            className="pointer-events-auto flex max-h-full w-[300px] flex-col overflow-hidden rounded-[26px] bg-card shadow-lift"
            aria-label="Section settings"
          >
            <Settings section={section} songTitle={songTitle} />
          </motion.aside>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}

function Settings({ section, songTitle }: { section: SongNode<'section'>; songTitle: string }) {
  const { updateData, onNodesChange } = useSong()
  const { id, data } = section
  const set = (patch: Partial<SongNode<'section'>['data']>) => updateData(id, patch)
  const part = PARTS.find((p) => p.name === data.name)
  const energy = data.energy ?? 0.4

  return (
    <>
      <div className="flex items-start gap-2.5 px-5 pt-[18px] pb-3">
        <AppWindow width={18} height={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-1" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-[1.3] font-medium text-ink-1">Section settings</p>
          <p className="type-small truncate text-ink-3">{songTitle}</p>
        </div>
        <button
          aria-label="Close section settings"
          title="Close"
          onClick={() => onNodesChange([{ type: 'select', id, selected: false }])}
          className="-mt-1 -mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-well hover:text-ink-1"
        >
          <Xmark width={16} height={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-1 pb-5 [&>*]:shrink-0">
        <Field label="Part of the song" note={part?.hint}>
          <Pills
            options={PARTS.map((p) => ({ id: p.name, label: p.name }))}
            value={data.name}
            onChange={(name) => set({ name })}
            tight
          />
        </Field>

        <Field label="Length">
          <Pills
            options={LENGTHS.map((l) => ({ id: String(l), label: l === 60 ? '1 min' : `${l} sec` }))}
            value={String(data.length)}
            onChange={(l) => set({ length: Number(l) })}
          />
        </Field>

        <Field label="Direction for this section" aside="Optional" note="Only changes this section.">
          <textarea
            value={data.direction ?? ''}
            onChange={(e) => set({ direction: e.target.value })}
            placeholder="Start gently, then let the piano open up."
            rows={3}
            className="type-body field-sizing-content min-h-[76px] w-full resize-none rounded-[12px] border border-rule bg-well px-3 py-2.5 text-ink-1 outline-none transition-colors placeholder:text-ink-3 focus:border-rule-strong focus:bg-card"
          />
        </Field>

        <span className="h-px shrink-0 bg-rule" />

        <div className="flex flex-col gap-4">
          <p className="text-[14px] leading-[1.3] font-medium text-ink-1">Shape the sound</p>
          <Field label="Energy">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={energy}
              aria-label="Energy"
              onChange={(e) => set({ energy: Number(e.target.value) })}
              className="humn-range"
              style={{ '--v': `${energy * 100}%` } as CSSProperties}
            />
            <div className="type-small mt-1.5 flex justify-between text-ink-3">
              <span>Gentle</span>
              <span>Lively</span>
            </div>
          </Field>
          <Field label="Voice">
            <Pills options={VOCALS} value={data.vocals ?? 'none'} onChange={(vocals) => set({ vocals: vocals as Vocals })} />
          </Field>
        </div>

        <Connected section={section} />

        <p className="type-small flex items-center gap-1.5 text-ink-3">
          <InfoCircle width={14} height={14} strokeWidth={1.5} className="shrink-0" />
          These shape the next takes you make.
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
function Connected({ section }: { section: SongNode<'section'> }) {
  const [open, setOpen] = useState(false)
  const nodes = useSong((s) => s.nodes)
  const plugged = ROLES.flatMap((r) =>
    (section.data.sources[r.id] ?? []).flatMap((src) => {
      const n = nodes.find((x) => x.id === src)
      return n ? [{ node: n, role: r }] : []
    }),
  )

  return (
    <div className="overflow-hidden rounded-[14px] border border-rule">
      <button
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        disabled={!plugged.length}
        className="flex h-11 w-full items-center gap-2.5 px-3.5 text-left transition-colors hover:bg-well disabled:hover:bg-transparent"
      >
        <span className="type-caption flex-1 text-ink-1">
          {plugged.length ? `Plugged in · ${plugged.length}` : 'Nothing plugged in yet'}
        </span>
        {plugged.length > 0 && (
          <NavArrowDown
            width={16}
            height={16}
            strokeWidth={1.5}
            className={cn('text-ink-3 transition-transform duration-300 ease-soft', open && 'rotate-180')}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', visualDuration: 0.3, bounce: 0 }}
            className="flex flex-col gap-0.5 border-t border-rule px-1.5 py-1.5"
          >
            {plugged.map(({ node, role }) => (
              <Plugged key={node.id} node={node} role={role.name} roleId={role.id} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function Plugged({ node, role, roleId }: { node: AnySongNode; role: string; roleId: string }) {
  const Icon = node.type in KIND_ICONS ? KIND_ICONS[node.type as Kind] : null
  return (
    <li className="flex h-8 items-center gap-2.5 rounded-[9px] px-2">
      {Icon && <Icon width={15} height={15} strokeWidth={1.5} className="shrink-0 text-ink-2" />}
      <span className="type-caption min-w-0 flex-1 truncate text-ink-1">
        {nameOf(node.data as Record<string, unknown>) || role}
      </span>
      <span className="type-small shrink-0" style={{ color: `var(--soft-role-${roleId})` }}>
        {role}
      </span>
    </li>
  )
}
