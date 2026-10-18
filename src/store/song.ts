import { applyNodeChanges, type Edge, type NodeChange, type XYPosition } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STARTING_DATA, type AnySongNode, type Kind, type NodeKind, type Role, type SectionData } from '@/data/nodes'
import { SEED_CANVASES } from '@/data/seedCanvases'
import { templateNodes, type TemplateId } from '@/data/templates'

export type Tool = 'select' | 'hand'

type SongState = {
  songId: string | null
  /** Every song's canvas, kept between visits. */
  saved: Record<string, AnySongNode[]>
  nodes: AnySongNode[]
  edges: Edge[]
  tool: Tool
  timelineOpen: boolean
  templatePicker: { open: boolean; selected: TemplateId }
  /** Which kind's drawer is open beside the rail. */
  drawer: Kind | null
  /** Bumped when the view should refit to the nodes (e.g. after a template lands). */
  fitRequest: number
  /** The kind being dragged out of a drawer, for the drop hint. */
  dragKind: Kind | null
  /** The socket a wire being pulled would plug into if let go now. */
  snap: { section: string; role: Role } | null
  /** The connection just made, for a moment, so it can pulse into place. */
  fresh: { id: string; source: string; section: string; role: Role } | null
  /** The take that's playing; the wires into its section flow while it does. */
  playing: string | null
  /** Swaps the canvas to another song, keeping the one being left. */
  open: (songId: string) => void
  onNodesChange: (changes: NodeChange<AnySongNode>[]) => void
  /** Adds a node centred on `at` and selects it; `data` overrides the kind's starting data. */
  addNode: (kind: NodeKind, at: XYPosition, data?: Record<string, unknown>) => string
  /** Fills the canvas with a template's nodes, plugged into a section. */
  applyTemplate: (id: TemplateId) => void
  setDrawer: (kind: Kind | null) => void
  setDragKind: (kind: Kind | null) => void
  setSnap: (snap: { section: string; role: Role } | null) => void
  /** Plugs a card into a section's socket. A card plugs in one place, so this moves it if it was elsewhere. */
  connect: (source: string, section: string, role: Role) => void
  disconnect: (source: string, section: string) => void
  /** Makes (or remakes) a section's two takes, beside it and wired from it. */
  makeTakes: (sectionId: string) => void
  setPlaying: (takeId: string | null) => void
  updateData: (id: string, patch: Record<string, unknown>) => void
  setTool: (tool: Tool) => void
  toggleTimeline: () => void
  openTemplatePicker: () => void
  closeTemplatePicker: () => void
  selectTemplate: (id: TemplateId) => void
}

let freshTimer = 0
// How long the pretend "listening" takes before the two takes are ready.
const MAKING_MS = 2600

export const useSong = create<SongState>()(
  persist(
    (set, get) => ({
  songId: null,
  saved: {},
  nodes: [],
  edges: [],
  tool: 'select',
  timelineOpen: false,
  templatePicker: { open: false, selected: 'photo' },
  drawer: null,
  fitRequest: 0,
  dragKind: null,
  snap: null,
  fresh: null,
  playing: null,
  open: (songId) =>
    set((s) => {
      if (s.songId === songId) return s
      const saved = s.songId ? { ...s.saved, [s.songId]: s.nodes } : s.saved
      const nodes = saved[songId] ?? SEED_CANVASES[songId] ?? []
      return {
        songId,
        saved,
        playing: null,
        nodes: nodes.map((n) => ({ ...n, selected: false })),
        // Frame whatever's there once it's measured.
        fitRequest: nodes.length ? s.fitRequest + 1 : s.fitRequest,
      }
    }),
  onNodesChange: (changes) =>
    set((s) => {
      const gone = changes.flatMap((c) => (c.type === 'remove' ? [c.id] : []))
      const nodes = unplug(applyNodeChanges(changes, s.nodes), (id) => gone.includes(id))
      return { nodes, saved: s.songId ? { ...s.saved, [s.songId]: nodes } : s.saved }
    }),
  addNode: (kind, at, data) => {
    const id = nanoid(8)
    const node = {
      id,
      type: kind,
      position: at,
      origin: [0.5, 0.5],
      selected: true,
      data: { ...structuredClone(STARTING_DATA[kind]), ...data },
    } as AnySongNode
    set((s) => keep(s, [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), node]))
    return id
  },
  applyTemplate: (id) =>
    set((s) => ({
      ...keep(s, [...s.nodes.map((n) => ({ ...n, selected: false })), ...templateNodes(id, nanoid(6))]),
      templatePicker: { ...s.templatePicker, open: false },
      fitRequest: s.fitRequest + 1,
    })),
  setDrawer: (drawer) => set({ drawer }),
  setDragKind: (dragKind) => set({ dragKind }),
  setSnap: (snap) => set((s) => (s.snap?.section === snap?.section && s.snap?.role === snap?.role ? s : { snap })),
  connect: (source, section, role) =>
    set((s) => {
      const nodes = unplug(s.nodes, (id) => id === source).map((n) =>
        n.id === section && n.type === 'section'
          ? { ...n, data: { ...n.data, sources: { ...n.data.sources, [role]: [...(n.data.sources[role] ?? []), source] } } }
          : n,
      )
      const fresh = { id: `${source}|${section}`, source, section, role }
      clearTimeout(freshTimer)
      freshTimer = window.setTimeout(() => set((t) => (t.fresh === fresh ? { fresh: null } : t)), 900)
      return { ...keep(s, nodes), fresh }
    }),
  disconnect: (source, section) =>
    set((s) => keep(s, unplug(s.nodes, (id) => id === source, section))),
  makeTakes: (sectionId) => {
    const s = get()
    const section = s.nodes.find((n) => n.id === sectionId)
    if (!section) return
    let take = s.nodes.find((n) => n.type === 'take' && n.data.sectionId === sectionId)
    if (take) {
      s.updateData(take.id, { state: 'making', version: 'A' })
      if (s.playing === take.id) set({ playing: null })
    } else {
      take = {
        id: nanoid(8),
        type: 'take',
        // The section is 270 wide; the take is 240 wide.
        position: { x: section.position.x + 135 + 80 + 120, y: section.position.y - 40 },
        origin: [0.5, 0.5],
        data: { sectionId, state: 'making', version: 'A', length: 30 },
      } as AnySongNode
      set((s) => keep(s, [...s.nodes, take!]))
    }
    const takeId = take.id
    window.setTimeout(() => get().updateData(takeId, { state: 'done' }), MAKING_MS)
  },
  setPlaying: (playing) => set({ playing }),
  updateData: (id, patch) =>
    set((s) => keep(s, s.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AnySongNode) : n)))),
  setTool: (tool) => set({ tool }),
  toggleTimeline: () => set((s) => ({ timelineOpen: !s.timelineOpen })),
  openTemplatePicker: () => set((s) => ({ templatePicker: { ...s.templatePicker, open: true } })),
  closeTemplatePicker: () => set((s) => ({ templatePicker: { ...s.templatePicker, open: false } })),
  selectTemplate: (selected) => set((s) => ({ templatePicker: { ...s.templatePicker, selected } })),
    }),
    {
      name: 'humn-songs',
      version: 2,
      partialize: (s) => ({ saved: s.saved }),
      // v1 kept each song as { nodes, edges }; plug those edges back into their sections.
      migrate: (old) => {
        const state = old as { saved?: Record<string, unknown> }
        for (const [id, v] of Object.entries(state.saved ?? {})) {
          if (Array.isArray(v)) continue
          const { nodes = [], edges = [] } = v as { nodes?: AnySongNode[]; edges?: { source: string; target: string; targetHandle?: string }[] }
          state.saved![id] = nodes.map((n) => {
            if (n.type !== 'section') return n
            const sources: SectionData['sources'] = {}
            for (const e of edges)
              if (e.target === n.id && e.targetHandle && e.targetHandle !== 'in')
                (sources[e.targetHandle as Role] ??= []).push(e.source)
            return { ...n, data: { ...n.data, sources } }
          })
        }
        return state as Pick<SongState, 'saved'>
      },
    },
  ),
)

/** Takes matching cards out of every socket (or just `section`'s), leaving untouched sections as they were. */
function unplug(nodes: AnySongNode[], match: (id: string) => boolean, section?: string): AnySongNode[] {
  return nodes.map((n) => {
    if (n.type !== 'section' || (section && n.id !== section)) return n
    const entries = Object.entries(n.data.sources) as [Role, string[]][]
    if (!entries.some(([, ids]) => ids.some(match))) return n
    const sources: SectionData['sources'] = {}
    for (const [role, ids] of entries) {
      const left = ids.filter((id) => !match(id))
      if (left.length) sources[role] = left
    }
    return { ...n, data: { ...n.data, sources } }
  })
}

function keep(s: SongState, nodes: AnySongNode[]) {
  return { nodes, saved: s.songId ? { ...s.saved, [s.songId]: nodes } : s.saved }
}

/** True while a take is playing whose section this card is plugged into. */
export function useFeedsPlaying(nodeId: string) {
  return useSong((s) => {
    const take = s.playing ? s.nodes.find((n) => n.id === s.playing) : undefined
    if (take?.type !== 'take') return false
    const section = s.nodes.find((n) => n.id === take.data.sectionId)
    return section?.type === 'section' && Object.values(section.data.sources).some((ids) => ids?.includes(nodeId))
  })
}
