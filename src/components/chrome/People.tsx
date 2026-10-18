import { Faces } from '@/components/Avatar'

export function People({ ids }: { ids: string[] }) {
  return (
    <div className="flex h-[42px] items-center gap-1 rounded-[12px] bg-card pr-1.5 pl-2.5 shadow-lift">
      <Faces ids={ids} ring="var(--soft-card)" />
      <span className="w-1.5" />
      <button className="type-body flex h-[30px] items-center rounded-[8px] px-2.5 text-ink-2 hover:bg-well">
        Share
      </button>
    </div>
  )
}
