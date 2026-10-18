import { applyNodeChanges, type Edge, type NodeChange, type XYPosition } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STARTING_DATA, type AnySongNode, type Kind, type NodeKind } from '@/data/nodes'
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
  /** Swaps the canvas to another song, keeping the one being left. */
  open: (songId: string) => void
  onNodesChange: (changes: NodeChange<AnySongNode>[]) => void
  /** Adds a node centred on `at` and selects it; `data` overrides the kind's starting data. */
  addNode: (kind: NodeKind, at: XYPosition, data?: Record<string, unknown>) => string
  /** Fills the canvas with a template's nodes, plugged into a section. */
  applyTemplate: (id: TemplateId) => void
  setDrawer: (kind: Kind | null) => void
  setDragKind: (kind: Kind | null) => void
  updateData: (id: string, patch: Record<string, unknown>) => void
  setTool: (tool: Tool) => void
  toggleTimeline: () => void
  openTemplatePicker: () => void
  closeTemplatePicker: () => void
  selectTemplate: (id: TemplateId) => void
}

export const useSong = create<SongState>()(
  persist(
    (set) => ({
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
  open: (songId) =>
    set((s) => {
      if (s.songId === songId) return s
      const saved = s.songId ? { ...s.saved, [s.songId]: s.nodes } : s.saved
      return { songId, saved, nodes: (saved[songId] ?? []).map((n) => ({ ...n, selected: false })) }
    }),
  onNodesChange: (changes) =>
    set((s) => {
      const nodes = applyNodeChanges(changes, s.nodes)
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
  updateData: (id, patch) =>
    set((s) => keep(s, s.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AnySongNode) : n)))),
  setTool: (tool) => set({ tool }),
  toggleTimeline: () => set((s) => ({ timelineOpen: !s.timelineOpen })),
  openTemplatePicker: () => set((s) => ({ templatePicker: { ...s.templatePicker, open: true } })),
  closeTemplatePicker: () => set((s) => ({ templatePicker: { ...s.templatePicker, open: false } })),
  selectTemplate: (selected) => set((s) => ({ templatePicker: { ...s.templatePicker, selected } })),
    }),
    { name: 'humn-songs', partialize: (s) => ({ saved: s.saved }) },
  ),
)

function keep(s: SongState, nodes: AnySongNode[]) {
  return { nodes, saved: s.songId ? { ...s.saved, [s.songId]: nodes } : s.saved }
}
