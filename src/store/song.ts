import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STARTING_DATA, type AnySongNode, type Kind, type NodeKind, type Pipe, type Role } from '@/data/nodes'
import { SEED_CANVASES } from '@/data/seedCanvases'
import { pipe, templateNodes, type TemplateId } from '@/data/templates'

export type Tool = 'select' | 'hand'

type Canvas = { nodes: AnySongNode[]; edges: Pipe[] }

type SongState = {
  songId: string | null
  /** Every song's canvas, kept between visits. */
  saved: Record<string, Canvas>
  nodes: AnySongNode[]
  edges: Pipe[]
  tool: Tool
  timelineOpen: boolean
  templatePicker: { open: boolean; selected: TemplateId }
  /** Which kind's drawer is open beside the rail. */
  drawer: Kind | null
  /** Bumped when the view should refit to the nodes (e.g. after a template lands). */
  fitRequest: number
  /** The kind being dragged out of a drawer, for the drop hint. */
  dragKind: Kind | null
  /** The take that's playing; its section's pipes flow while it does. */
  playing: string | null
  /** Swaps the canvas to another song, keeping the one being left. */
  open: (songId: string) => void
  onNodesChange: (changes: NodeChange<AnySongNode>[]) => void
  onEdgesChange: (changes: EdgeChange<Pipe>[]) => void
  /** Plugs a node's connector into one of a section's role plugs. */
  connect: (c: Connection) => void
  /** Adds a node centred on `at` and selects it; `data` overrides the kind's starting data. */
  addNode: (kind: NodeKind, at: XYPosition, data?: Record<string, unknown>) => string
  /** Fills the canvas with a template's nodes, plugged into a section. */
  applyTemplate: (id: TemplateId) => void
  /** Makes (or remakes) a section's two takes, beside it and piped from it. */
  makeTakes: (sectionId: string) => void
  setPlaying: (takeId: string | null) => void
  setDrawer: (kind: Kind | null) => void
  setDragKind: (kind: Kind | null) => void
  updateData: (id: string, patch: Record<string, unknown>) => void
  setTool: (tool: Tool) => void
  toggleTimeline: () => void
  openTemplatePicker: () => void
  closeTemplatePicker: () => void
  selectTemplate: (id: TemplateId) => void
}

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
      playing: null,
      open: (songId) =>
        set((s) => {
          if (s.songId === songId) return s
          const saved = s.songId ? { ...s.saved, [s.songId]: { nodes: s.nodes, edges: s.edges } } : s.saved
          const canvas = saved[songId] ?? SEED_CANVASES[songId] ?? { nodes: [], edges: [] }
          return {
            songId,
            saved,
            playing: null,
            nodes: canvas.nodes.map((n) => ({ ...n, selected: false })),
            edges: canvas.edges,
            // Frame whatever's there once it's measured.
            fitRequest: canvas.nodes.length ? s.fitRequest + 1 : s.fitRequest,
          }
        }),
      onNodesChange: (changes) =>
        set((s) => {
          const nodes = applyNodeChanges(changes, s.nodes)
          // Removing a node takes its pipes with it.
          const ids = new Set(nodes.map((n) => n.id))
          return keep(s, { nodes, edges: s.edges.filter((e) => ids.has(e.source) && ids.has(e.target)) })
        }),
      onEdgesChange: (changes) => set((s) => keep(s, { edges: applyEdgeChanges(changes, s.edges) })),
      connect: ({ source, target, targetHandle }) =>
        set((s) => {
          const role = targetHandle as Role
          if (s.edges.some((e) => e.source === source && e.target === target && e.targetHandle === role)) return s
          return keep(s, { edges: [...s.edges, pipe(source, target, role)] })
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
        set((s) => keep(s, { nodes: [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), node] }))
        return id
      },
      applyTemplate: (id) =>
        set((s) => {
          const made = templateNodes(id, nanoid(6))
          return {
            ...keep(s, {
              nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), ...made.nodes],
              edges: [...s.edges, ...made.edges],
            }),
            templatePicker: { ...s.templatePicker, open: false },
            fitRequest: s.fitRequest + 1,
          }
        }),
      makeTakes: (sectionId) => {
        const s = get()
        const section = s.nodes.find((n) => n.id === sectionId)
        if (!section) return
        let take = s.nodes.find((n) => n.type === 'take' && n.data.sectionId === sectionId)
        if (take) {
          s.updateData(take.id, { state: 'making', version: 'A' })
          if (s.playing === take.id) set({ playing: null })
        } else {
          const id = nanoid(8)
          take = {
            id,
            type: 'take',
            // Section is 290 wide plus its plugs; the take is 240 wide.
            position: { x: section.position.x + 145 + 90 + 120, y: section.position.y - 40 },
            origin: [0.5, 0.5],
            data: { sectionId, state: 'making', version: 'A', length: 30 },
          } as AnySongNode
          set((s) => keep(s, { nodes: [...s.nodes, take!], edges: [...s.edges, pipe(sectionId, id)] }))
        }
        const takeId = take.id
        window.setTimeout(() => get().updateData(takeId, { state: 'done' }), MAKING_MS)
      },
      setPlaying: (playing) => set({ playing }),
      setDrawer: (drawer) => set({ drawer }),
      setDragKind: (dragKind) => set({ dragKind }),
      updateData: (id, patch) =>
        set((s) =>
          keep(s, {
            nodes: s.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AnySongNode) : n)),
          }),
        ),
      setTool: (tool) => set({ tool }),
      toggleTimeline: () => set((s) => ({ timelineOpen: !s.timelineOpen })),
      openTemplatePicker: () => set((s) => ({ templatePicker: { ...s.templatePicker, open: true } })),
      closeTemplatePicker: () => set((s) => ({ templatePicker: { ...s.templatePicker, open: false } })),
      selectTemplate: (selected) => set((s) => ({ templatePicker: { ...s.templatePicker, selected } })),
    }),
    {
      name: 'humn-songs',
      version: 1,
      partialize: (s) => ({ saved: s.saved }),
      // v0 kept only nodes per song.
      migrate: (old, version) => {
        const state = old as { saved: Record<string, unknown> }
        if (version < 1) {
          for (const [id, v] of Object.entries(state.saved ?? {}))
            if (Array.isArray(v)) state.saved[id] = { nodes: v, edges: [] }
        }
        return state as Pick<SongState, 'saved'>
      },
    },
  ),
)

function keep(s: SongState, next: Partial<Canvas>) {
  const canvas = { nodes: next.nodes ?? s.nodes, edges: next.edges ?? s.edges }
  return { ...canvas, saved: s.songId ? { ...s.saved, [s.songId]: canvas } : s.saved }
}

/** True while a take is playing whose section this node feeds. */
export function useFeedsPlaying(nodeId: string) {
  return useSong((s) => {
    if (!s.playing) return false
    const take = s.nodes.find((n) => n.id === s.playing)
    if (take?.type !== 'take') return false
    return s.edges.some((e) => e.source === nodeId && e.target === take.data.sectionId)
  })
}
