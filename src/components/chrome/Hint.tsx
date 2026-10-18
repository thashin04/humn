import { useConnection } from '@xyflow/react'
import type { ReactNode } from 'react'
import { DRAWERS } from '@/data/library'
import { DEFAULT_ROLE, ROLES, type Role } from '@/data/nodes'
import { useSong } from '@/store/song'

const roleName = (r: Role) => ROLES.find((x) => x.id === r)!.name
const B = ({ children }: { children: ReactNode }) => <span className="font-medium text-ink-1">{children}</span>

/** One line at the top of the canvas saying what to do next, from the Figma mockups. */
export function Hint() {
  const conn = useConnection()
  const dragKind = useSong((s) => s.dragKind)
  const next = useSong((s) => {
    const sections = s.nodes.filter((n) => n.type === 'section')
    if (!sections.length || s.nodes.length < 2) return null
    if (!s.edges.some((e) => e.data?.role)) return 'connect'
    const waiting = sections.some(
      (sec) =>
        s.edges.some((e) => e.target === sec.id) &&
        !s.nodes.some((n) => n.type === 'take' && n.data.sectionId === sec.id),
    )
    return waiting ? 'make' : null
  })

  let text: ReactNode = null
  if (dragKind) {
    const label = DRAWERS[dragKind].label
    text = (
      <>
        Let go to add it as {/^[aeiou]/i.test(label) ? 'an' : 'a'} <B>{label}</B>. Plug it into{' '}
        <B>{roleName(DEFAULT_ROLE[dragKind])}</B>.
      </>
    )
  } else if (conn.inProgress && conn.toHandle?.id) {
    text = (
      <>
        Let go to plug it into <B>{roleName(conn.toHandle.id as Role)}</B>.
      </>
    )
  } else if (conn.inProgress || next === 'connect') {
    text = (
      <>
        Pull the <B>connector</B> on a card's right edge toward the section.
      </>
    )
  } else if (next === 'make') {
    text = (
      <>
        Press <B>Make 2 takes</B> to hear it.
      </>
    )
  }

  if (!text) return null
  return (
    <div className="type-body pointer-events-none flex h-9 animate-node-enter items-center rounded-full bg-card px-3.5 whitespace-nowrap text-ink-2 shadow-lift">
      <p>{text}</p>
    </div>
  )
}
