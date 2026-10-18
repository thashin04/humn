import { applyNodeChanges, type Edge, type NodeChange, type XYPosition } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CLIP_DEFAULTS, newClip, type Clip } from '@/data/clips'
import { STARTING_DATA, type AnySongNode, type Kind, type NodeKind, type Role, type SectionData } from '@/data/nodes'
import { SEED_CANVASES } from '@/data/seedCanvases'
import { templateNodes, type TemplateId } from '@/data/templates'

export type Tool = 'select' | 'hand' | 'comment'

/** A note someone left on the song: at a spot on the canvas, or at a moment in the timeline. */
export type SongComment = {
  id: string
  author: string
  text: string
  /** When it was written. */
  at: number
  where: { x: number; y: number } | { t: number }
}

/** What undo puts back: the canvas and the song's clips. */
type Snapshot = { nodes: AnySongNode[]; clips: Clip[] | undefined }

type SongState = {
  songId: string | null
  /** Changes to the open song, to step back and forward through. Not kept between visits. */
  past: Snapshot[]
  future: Snapshot[]
  /** Every song's canvas, kept between visits. */
  saved: Record<string, AnySongNode[]>
  nodes: AnySongNode[]
  edges: Edge[]
  tool: Tool
  /** The timeline docked under the canvas, and how tall it's been pulled. */
  timelineOpen: boolean
  dockHeight: number
  /** The clip selected in the timeline. Picking one lets go of any cards, and the other way round. */
  clip: string | null
  /**
   * Each song's clips in the order they play. A section can come back (a
   * chorus twice), each time as its own clip. Songs that haven't been arranged
   * play each section once, left to right.
   */
  arrangements: Record<string, Clip[]>
  /** Each song's comments, oldest first. */
  comments: Record<string, SongComment[]>
  /** A node to bring into view once the canvas is showing again. */
  focus: string | null
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
  undo: () => void
  redo: () => void
  toggleTimeline: () => void
  setDockHeight: (height: number) => void
  pickClip: (id: string | null) => void
  /** Sets the current song's clips. */
  arrange: (clips: Clip[]) => void
  addComment: (where: SongComment['where'], text: string, author: string) => void
  /** Resolving a comment clears it away. */
  resolveComment: (id: string) => void
  /** Selects this node on the canvas and brings it into view. */
  showOnCanvas: (id: string) => void
  clearFocus: () => void
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
  past: [],
  future: [],
  saved: {},
  nodes: [],
  edges: [],
  tool: 'select',
  timelineOpen: false,
  dockHeight: 320,
  clip: null,
  arrangements: {},
  comments: {},
  focus: null,
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
        past: [],
        future: [],
        playing: null,
        focus: null,
        clip: null,
        nodes: nodes.map((n) => ({ ...n, selected: false })),
        // Frame whatever's there once it's measured.
        fitRequest: nodes.length ? s.fitRequest + 1 : s.fitRequest,
      }
    }),
  onNodesChange: (changes) =>
    set((s) => {
      const gone = changes.flatMap((c) => (c.type === 'remove' ? [c.id] : []))
      // A drag is one step, remembered as it starts; picking things or measuring them isn't one.
      const starts = changes.some(
        (c) => c.type === 'position' && c.dragging && !s.nodes.find((n) => n.id === c.id)?.dragging,
      )
      const nodes = unplug(applyNodeChanges(changes, s.nodes), (id) => gone.includes(id))
      const picking = changes.some((c) => c.type === 'select' && c.selected)
      return {
        ...(picking ? { clip: null } : {}),
        ...(gone.length || starts ? remember(s) : {}),
        nodes,
        saved: s.songId ? { ...s.saved, [s.songId]: nodes } : s.saved,
      }
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
    set((s) => ({ ...remember(s), ...keep(s, [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), node]) }))
    return id
  },
  applyTemplate: (id) =>
    set((s) => ({
      ...remember(s),
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
      return { ...remember(s), ...keep(s, nodes), fresh }
    }),
  disconnect: (source, section) =>
    set((s) => ({ ...remember(s), ...keep(s, unplug(s.nodes, (id) => id === source, section)) })),
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
        data: { sectionId, state: 'making', version: 'A', length: section.type === 'section' ? section.data.length : 30 },
      } as AnySongNode
      set((s) => ({ ...remember(s), ...keep(s, [...s.nodes, take!]) }))
    }
    const takeId = take.id
    // The takes finishing isn't something someone did, so it isn't a step to undo.
    window.setTimeout(
      () =>
        set((s) =>
          keep(s, s.nodes.map((n) => (n.id === takeId && n.type === 'take' ? { ...n, data: { ...n.data, state: 'done' } } : n))),
        ),
      MAKING_MS,
    )
  },
  setPlaying: (playing) => set({ playing }),
  updateData: (id, patch) =>
    set((s) => ({
      // Typing into a card, or a slider on it, is one step until it rests.
      ...remember(s, `data:${id}:${Object.keys(patch).join()}`),
      ...keep(s, s.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AnySongNode) : n))),
    })),
  setTool: (tool) => set({ tool }),
  undo: () =>
    set((s) => {
      const back = s.past.at(-1)
      if (!back || !s.songId) return s
      lastKey = ''
      return { ...restore(s, back), past: s.past.slice(0, -1), future: [snapshot(s), ...s.future] }
    }),
  redo: () =>
    set((s) => {
      const ahead = s.future[0]
      if (!ahead || !s.songId) return s
      lastKey = ''
      return { ...restore(s, ahead), past: [...s.past, snapshot(s)], future: s.future.slice(1) }
    }),
  toggleTimeline: () => set((s) => ({ timelineOpen: !s.timelineOpen, clip: null })),
  setDockHeight: (dockHeight) => set({ dockHeight }),
  pickClip: (clip) =>
    set((s) =>
      clip && s.nodes.some((n) => n.selected)
        ? { clip, ...keep(s, s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n))) }
        : { clip },
    ),
  // Dragging a clip's edge or a slider in its panel is one step until it rests.
  arrange: (order) =>
    set((s) => (s.songId ? { ...remember(s, 'arrange'), arrangements: { ...s.arrangements, [s.songId]: order } } : s)),
  addComment: (where, text, author) =>
    set((s) =>
      s.songId
        ? {
            comments: {
              ...s.comments,
              [s.songId]: [...(s.comments[s.songId] ?? []), { id: nanoid(8), author, text, at: Date.now(), where }],
            },
          }
        : s,
    ),
  resolveComment: (id) =>
    set((s) =>
      s.songId ? { comments: { ...s.comments, [s.songId]: (s.comments[s.songId] ?? []).filter((c) => c.id !== id) } } : s,
    ),
  showOnCanvas: (id) =>
    set((s) => ({ ...keep(s, s.nodes.map((n) => ({ ...n, selected: n.id === id }))), clip: null, focus: id })),
  clearFocus: () => set({ focus: null }),
  openTemplatePicker: () => set((s) => ({ templatePicker: { ...s.templatePicker, open: true } })),
  closeTemplatePicker: () => set((s) => ({ templatePicker: { ...s.templatePicker, open: false } })),
  selectTemplate: (selected) => set((s) => ({ templatePicker: { ...s.templatePicker, selected } })),
    }),
    {
      name: 'humn-songs',
      version: 3,
      partialize: (s) => ({ saved: s.saved, arrangements: s.arrangements, comments: s.comments, dockHeight: s.dockHeight }),
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
        // v2 kept each song's order as section ids; each becomes a clip as made.
        const arrangements = (state as { arrangements?: Record<string, unknown[]> }).arrangements ?? {}
        for (const [id, list] of Object.entries(arrangements))
          arrangements[id] = list.map((x) => {
            if (typeof x !== 'string') return x
            const n = (state.saved?.[id] as AnySongNode[] | undefined)?.find((n) => n.id === x)
            return { id: nanoid(8), sectionId: x, from: 0, length: n?.type === 'section' ? n.data.length : 30, ...CLIP_DEFAULTS }
          })
        return { ...state, arrangements } as Pick<SongState, 'saved' | 'arrangements' | 'comments' | 'dockHeight'>
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

const snapshot = (s: SongState): Snapshot => ({
  nodes: s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
  clips: s.songId ? s.arrangements[s.songId] : undefined,
})

function restore(s: SongState, to: Snapshot) {
  const arrangements = { ...s.arrangements }
  if (to.clips) arrangements[s.songId!] = to.clips
  else delete arrangements[s.songId!]
  return { nodes: to.nodes, saved: { ...s.saved, [s.songId!]: to.nodes }, arrangements }
}

// Changes with the same key in quick succession (a slider being dragged, words being typed) undo together.
let lastKey = ''
let lastAt = 0
const SETTLE_MS = 800
const LIMIT = 100

/** Notes the song as it is, before a change, so the change can be undone. */
function remember(s: SongState, key = '') {
  const now = Date.now()
  const same = key && key === lastKey && now - lastAt < SETTLE_MS
  lastKey = key
  lastAt = now
  if (same) return { future: [] }
  return { past: [...s.past, snapshot(s)].slice(-LIMIT), future: [] }
}

function keep(s: SongState, nodes: AnySongNode[]) {
  const saved = s.songId ? { ...s.saved, [s.songId]: nodes } : s.saved
  // A section made after the song was arranged joins at the end.
  const clips = s.songId ? s.arrangements[s.songId] : undefined
  const had = new Set(s.nodes.map((n) => n.id))
  const added = nodes.flatMap((n) => (n.type === 'section' && !had.has(n.id) ? [newClip(n)] : []))
  if (!clips || !added.length) return { nodes, saved }
  return { nodes, saved, arrangements: { ...s.arrangements, [s.songId!]: [...clips, ...added] } }
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
