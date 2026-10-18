import { collaborator } from '@/data/collaborators'

/** Collaborator initials in their colour, with a 2px ring so stacked faces stay separate. */
export function Avatar({ id, ring = 'var(--raised)' }: { id: string; ring?: string }) {
  const c = collaborator(id)
  return (
    <span
      title={c.name}
      className="flex size-[26px] shrink-0 items-center justify-center rounded-full border-2 text-[11px] leading-[1.45] font-semibold text-on-ink"
      style={{ background: c.color, borderColor: ring }}
    >
      {c.initial}
    </span>
  )
}

export function Faces({ ids, ring }: { ids: string[]; ring?: string }) {
  return (
    <div className="isolate flex">
      {ids.map((id, i) => (
        <span key={id} className="-mr-1.5 last:mr-0" style={{ zIndex: ids.length - i }}>
          <Avatar id={id} ring={ring} />
        </span>
      ))}
    </div>
  )
}
