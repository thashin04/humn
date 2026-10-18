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
  /** The section just created from the suggestion; its settings open right away, until it's deselected. */
  made: string | null
  /** The take that's playing; the wires into its section flow while it does. */
  playing: string | null
  /** The input currently being inspected in the selected section. */
  focusedInputId: string | null
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
  /** Creates an independent playable take from an existing take. */
  branchTake: (takeId: string) => void
  /** The prompt someone is typing into, so nothing is suggested from it until they're done. */
  drafting: string | null
  setDrafting: (id: string | null) => void
  /** Turns the suggested first part into a real section at `at`, with `source` plugged in when there is one. */
  startFirstPart: (source: string | null, at: XYPosition, role: Role, energy: number) => void
  setPlaying: (takeId: string | null) => void
  setFocusedInput: (inputId: string | null) => void
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
  moveComment: (id: string, where: SongComment['where']) => void
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

type Fresh = NonNullable<SongState['fresh']>
/** Marks a connection as just made, for its pulse, and clears it once the pulse has run. */
function pulse(set: (fn: (s: SongState) => Partial<SongState> | SongState) => void, fresh: Fresh) {
  clearTimeout(freshTimer)
  freshTimer = window.setTimeout(() => set((t) => (t.fresh === fresh ? { fresh: null } : t)), 900)
  return fresh
}
// How long the pretend "listening" takes before the two takes are ready.
const MAKING_MS = 3400

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
  templatePicker: { open: false, selected: 'roadtrip' },
  drawer: null,
  fitRequest: 0,
  dragKind: null,
  snap: null,
  drafting: null,
  fresh: null,
  made: null,
  playing: null,
  focusedInputId: null,
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
        focusedInputId: null,
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
      const next = unplug(applyNodeChanges(changes, s.nodes), (id) => gone.includes(id))
      // Takes go with their section, and branches with the take they came from.
      const removed = new Set(gone)
      let changed = true
      while (changed) {
        changed = false
        for (const node of next) {
          if (node.type !== 'take') continue
          const orphaned = removed.has(node.data.sectionId) || (!!node.data.branchOf && removed.has(node.data.branchOf))
          if (orphaned && !removed.has(node.id)) {
            removed.add(node.id)
            changed = true
          }
        }
      }
      const nodes = next.filter((node) => !removed.has(node.id))
      const picking = changes.some((c) => c.type === 'select' && c.selected)
      const left = changes.some((c) => (c.type === 'select' && !c.selected) || c.type === 'remove' ? c.id === s.made : false)
      return {
        ...(picking ? { clip: null } : {}),
        ...(gone.length || starts ? remember(s) : {}),
        nodes,
        saved: s.songId ? { ...s.saved, [s.songId]: nodes } : s.saved,
        ...(left && { made: null }),
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
      ...keep(s, templateNodes(id, nanoid(6))),
      templatePicker: { ...s.templatePicker, open: false },
      focusedInputId: null,
      fitRequest: s.fitRequest + 1,
    })),
  setDrawer: (drawer) => set({ drawer }),
  setDragKind: (dragKind) => set({ dragKind }),
  setSnap: (snap) => set((s) => (s.snap?.section === snap?.section && s.snap?.role === snap?.role ? s : { snap })),
  connect: (source, section, role) =>
    set((s) => {
      // The card just plugged in becomes the selection.
      const nodes = unplug(s.nodes, (id) => id === source).map((n) => {
        const sel = n.id === source
        const m = n.selected === sel ? n : ({ ...n, selected: sel } as AnySongNode)
        return m.id === section && m.type === 'section'
          ? { ...m, data: { ...m.data, sources: { ...m.data.sources, [role]: [...(m.data.sources[role] ?? []), source] } } }
          : m
      })
      return { ...remember(s), ...keep(s, nodes), fresh: pulse(set, { id: `${source}|${section}`, source, section, role }) }
    }),
  disconnect: (source, section) =>
    set((s) => ({ ...remember(s), ...keep(s, unplug(s.nodes, (id) => id === source, section)) })),
  makeTakes: (sectionId) => {
    const s = get()
    const section = s.nodes.find((n) => n.id === sectionId)
    if (!section) return
    const length = section.type === 'section' ? section.data.length : 30
    // The section's own take, not a branch grown off it.
    let take = s.nodes.find((n) => n.type === 'take' && n.data.sectionId === sectionId && !n.data.branchOf)
    if (take) {
      s.updateData(take.id, { state: 'making', version: 'A', kept: undefined, length })
      if (s.playing === take.id) set({ playing: null })
    } else {
      take = {
        id: nanoid(8),
        type: 'take',
        // The section is 320 wide; the take is 300 wide.
        position: { x: section.position.x + 160 + 90 + 150, y: section.position.y - 60 },
        origin: [0.5, 0.5],
        data: { sectionId, state: 'making', version: 'A', length },
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
  branchTake: (takeId) => {
    const source = get().nodes.find((n) => n.id === takeId)
    if (!source || source.type !== 'take' || source.data.state === 'making') return
    const branch = {
      id: nanoid(8),
      type: 'take',
      position: { x: source.position.x + 360, y: source.position.y + 140 },
      origin: [0.5, 0.5],
      data: { sectionId: source.data.sectionId, state: 'done', version: 'A', length: source.data.length, branchOf: source.id },
    } as AnySongNode
    set((s) => ({ ...remember(s), ...keep(s, [...s.nodes.map((n) => ({ ...n, selected: false })), branch]) }))
  },
  setPlaying: (playing) => set({ playing }),
  setFocusedInput: (focusedInputId) => set({ focusedInputId }),
  setDrafting: (drafting) => set({ drafting }),
  startFirstPart: (source, at, role, energy) => {
    const id = nanoid(8)
    // Shift the section so the row it plugs into sits level with the card, keeping the wire straight.
    // (A new section is about 450 tall, and its first row's middle is about 170 down.)
    const socket = 170
    const section = {
      id,
      type: 'section',
      position: { x: at.x, y: at.y - socket + 450 / 2 },
      origin: [0.5, 0.5],
      data: { ...structuredClone(STARTING_DATA.section), energy },
    } as AnySongNode
    set((s) => keep(s, [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), section]))
    if (source) get().connect(source, id, role)
    // The new section ends up selected, with its settings open and its first input in focus. Pull back so the cards and it are all in view.
    set((s) => ({
      ...keep(s, s.nodes.map((n) => (!!n.selected === (n.id === id) ? n : ({ ...n, selected: n.id === id } as AnySongNode)))),
      made: id,
      focusedInputId: source,
      fitRequest: s.fitRequest + 1,
    }))
  },
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
  moveComment: (id, where) =>
    set((s) =>
      s.songId
        ? { comments: { ...s.comments, [s.songId]: (s.comments[s.songId] ?? []).map((c) => (c.id === id ? { ...c, where } : c)) } }
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
