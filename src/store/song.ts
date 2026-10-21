import { applyNodeChanges, type Edge, type NodeChange, type XYPosition } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CLIP_DEFAULTS, clipsOf, newClip, type Clip } from '@/data/clips'
import { roleOf, STARTING_DATA, type AnySongNode, type Kind, type NodeKind, type Role, type SectionData, type SongNode, type TakeEdit } from '@/data/nodes'
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
  /** Left by someone else while you watched (demo): shown open until it's closed. */
  show?: boolean
}

/** An instrument playing along under the whole song in the timeline (demo): Strings, drums… */
export type Track = { id: string; name: string; detail: string }

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
  /** Each song's tracks under the song in the timeline (demo). */
  tracks: Record<string, Track[]>
  addTrack: (name: string, detail: string) => void
  removeTrack: (id: string) => void
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
  /** A first part just started from a suggestion (demo): its settings wait, and open once something else is plugged into it. */
  opensOnPlug: string | null
  /** The take that's playing; the wires into its section flow while it does. */
  playing: string | null
  /** The input currently being inspected in the selected section. */
  focusedInputId: string | null
  /** The card whose settings are open in the side panel, from its Edit button. */
  editing: string | null
  editInput: (id: string | null) => void
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
  /**
   * Plugs a card into a section's socket, or straight into a take (demo), which is then made again with it in.
   * A card plugs in one place, so this moves it if it was elsewhere.
   */
  connect: (source: string, section: string, role: Role) => void
  disconnect: (source: string, section: string) => void
  /**
   * Makes two takes for a section, A and B, beside it and wired from it. Making
   * again replaces the ones still only proposed; takes in the song stay.
   */
  makeTakes: (sectionId: string) => void
  /** Puts a proposed take in the song: it joins the end of the timeline, which opens to show it. */
  addToTimeline: (takeId: string) => void
  /** Trims, levels or fades a take; where it's already in the song, its clips follow. */
  editTake: (takeId: string, edit: TakeEdit | undefined) => void
  /**
   * Plugs the given cards into a section, each in its own slot: the selected
   * section if one is among them, or a new one beside them.
   */
  gather: (ids: string[]) => void
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
  addComment: (where: SongComment['where'], text: string, author: string, show?: boolean) => void
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
  tracks: {},
  focus: null,
  templatePicker: { open: false, selected: 'roadtrip' },
  drawer: null,
  fitRequest: 0,
  dragKind: null,
  snap: null,
  drafting: null,
  fresh: null,
  made: null,
  opensOnPlug: null,
  playing: null,
  focusedInputId: null,
  editing: null,
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
        editing: null,
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
      // Letting go of the card being edited closes its settings.
      const stopEditing = changes.some(
        (c) => (c.type === 'select' && !c.selected) || c.type === 'remove' ? c.id === s.editing : false,
      )
      return {
        ...(picking ? { clip: null } : {}),
        ...(stopEditing && { editing: null }),
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
  connect: (source, section, role) => {
    if (get().nodes.find((n) => n.id === section)?.type === 'take') return plugIntoTake(source, section, role)
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
    })
    // The first part someone started, now with more plugged into it: its settings open (demo).
    if (get().opensOnPlug === section)
      set((s) => ({
        ...keep(s, s.nodes.map((n) => (!!n.selected === (n.id === section) ? n : ({ ...n, selected: n.id === section } as AnySongNode)))),
        made: section,
        opensOnPlug: null,
      }))
  },
  disconnect: (source, section) =>
    set((s) => ({ ...remember(s), ...keep(s, unplug(s.nodes, (id) => id === source, section)) })),
  makeTakes: (sectionId) => {
    const s = get()
    const section = s.nodes.find((n) => n.id === sectionId)
    if (section?.type !== 'section') return
    const length = section.data.length
    const own = s.nodes.filter((n): n is SongNode<'take'> => n.type === 'take' && n.data.sectionId === sectionId && !n.data.branchOf)
    const proposed = new Set(own.filter((t) => !t.data.added).map((t) => t.id))
    // New ideas sit beside the section, one column further out for each column of takes already in the song.
    const kept = own.filter((t) => t.data.added).length
    const x = section.position.x + 160 + 90 + 150 + Math.ceil(kept / 2) * 340
    const made = (['A', 'B'] as const).map(
      (version, i) =>
        ({
          id: nanoid(8),
          type: 'take',
          position: { x, y: section.position.y - 105 + i * 200 },
          origin: [0.5, 0.5],
          data: { sectionId, state: 'making', version, length },
        }) as AnySongNode,
    )
    if (s.playing && proposed.has(s.playing)) set({ playing: null })
    // The verse lets go, so its panel steps aside and the new ideas are in view.
    set((s) => ({
      ...remember(s),
      ...keep(s, [
        ...unplug(s.nodes.filter((n) => !proposed.has(n.id)), (id) => proposed.has(id)).map((n) =>
          n.selected ? ({ ...n, selected: false } as AnySongNode) : n,
        ),
        ...made,
      ]),
      made: null,
      focusedInputId: null,
    }))
    const ids = new Set(made.map((t) => t.id))
    // The takes finishing isn't something someone did, so it isn't a step to undo.
    window.setTimeout(
      () =>
        set((s) =>
          keep(s, s.nodes.map((n) => (ids.has(n.id) && n.type === 'take' ? { ...n, data: { ...n.data, state: 'done' } } : n))),
        ),
      MAKING_MS,
    )
  },
  addToTimeline: (takeId) =>
    set((s) => {
      const take = s.nodes.find((n) => n.id === takeId)
      if (take?.type !== 'take' || take.data.state !== 'done' || take.data.added || !s.songId) return s
      const nodes = s.nodes.map((n) => (n.id === takeId ? ({ ...n, data: { ...n.data, added: true } } as AnySongNode) : n))
      const section = s.nodes.find((n) => n.id === take.data.sectionId)
      const clips = s.arrangements[s.songId]
      const arrangements =
        clips && section?.type === 'section'
          ? { ...s.arrangements, [s.songId]: [...clips, newClip(section, take)] }
          : s.arrangements
      return { ...remember(s), ...keep(s, nodes), arrangements, timelineOpen: true, playing: null }
    }),
  editTake: (takeId, edit) =>
    set((s) => {
      const take = s.nodes.find((n) => n.id === takeId)
      if (take?.type !== 'take') return s
      const nodes = s.nodes.map((n) => (n.id === takeId ? ({ ...n, data: { ...n.data, edit } } as AnySongNode) : n))
      const clips = s.songId ? s.arrangements[s.songId] : undefined
      const e = edit ?? { from: 0, to: take.data.length, volume: 1, fadeIn: 0, fadeOut: 0 }
      const arrangements =
        clips && s.songId
          ? {
              ...s.arrangements,
              [s.songId]: clips.map((c) =>
                c.takeId === takeId
                  ? { ...c, from: e.from, length: Math.max(1, e.to - e.from), volume: e.volume, fadeIn: e.fadeIn, fadeOut: e.fadeOut }
                  : c,
              ),
            }
          : s.arrangements
      return { ...remember(s, `edit:${takeId}`), ...keep(s, nodes), arrangements }
    }),
  gather: (ids) => {
    const s = get()
    const picked = s.nodes.filter((n) => ids.includes(n.id))
    const sections = picked.filter((n) => n.type === 'section')
    // Cards, and takes that are in the song; proposed takes aren't anything to build on yet.
    const cards = picked.filter((n) => n.type !== 'section' && (n.type !== 'take' || (n.data.added && n.data.state === 'done')))
    if (!cards.length) return
    let target = sections.length === 1 ? sections[0].id : null
    if (!target) {
      const right = Math.max(...cards.map((n) => n.position.x + (n.measured?.width ?? 260) / 2))
      const mid = cards.reduce((t, n) => t + n.position.y, 0) / cards.length
      target = nanoid(8)
      const section = {
        id: target,
        type: 'section',
        position: { x: right + 120 + 160, y: mid },
        origin: [0.5, 0.5],
        data: structuredClone(STARTING_DATA.section),
      } as AnySongNode
      set((s) => ({ ...remember(s), ...keep(s, [...s.nodes, section]) }))
    }
    for (const c of cards) get().connect(c.id, target, roleOf(c.type))
    const id = target
    set((s) => ({
      ...keep(s, s.nodes.map((n) => (!!n.selected === (n.id === id) ? n : ({ ...n, selected: n.id === id } as AnySongNode)))),
      made: id,
    }))
  },
  branchTake: (takeId) => {
    const source = get().nodes.find((n) => n.id === takeId)
    if (!source || source.type !== 'take' || source.data.state === 'making') return
    const branch = {
      id: nanoid(8),
      type: 'take',
      position: { x: source.position.x + 360, y: source.position.y + 140 },
      origin: [0.5, 0.5],
      data: { sectionId: source.data.sectionId, state: 'done', version: source.data.version, length: source.data.length, branchOf: source.id },
    } as AnySongNode
    set((s) => ({ ...remember(s), ...keep(s, [...s.nodes.map((n) => ({ ...n, selected: false })), branch]) }))
  },
  setPlaying: (playing) => set({ playing }),
  setFocusedInput: (focusedInputId) => set({ focusedInputId }),
  editInput: (editing) => set({ editing }),
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
    // Demo: nothing's picked yet, so its settings stay closed until something more is plugged into it (see connect).
    // Pull back so the cards and it are all in view.
    set((s) => ({
      ...keep(s, s.nodes.map((n) => (n.selected ? ({ ...n, selected: false } as AnySongNode) : n))),
      opensOnPlug: id,
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
  addTrack: (name, detail) =>
    set((s) =>
      s.songId ? { tracks: { ...s.tracks, [s.songId]: [...(s.tracks[s.songId] ?? []), { id: nanoid(8), name, detail }] } } : s,
    ),
  removeTrack: (id) =>
    set((s) => (s.songId ? { tracks: { ...s.tracks, [s.songId]: (s.tracks[s.songId] ?? []).filter((t) => t.id !== id) } } : s)),
  addComment: (where, text, author, show) =>
    set((s) =>
      s.songId
        ? {
            comments: {
              ...s.comments,
              [s.songId]: [...(s.comments[s.songId] ?? []), { id: nanoid(8), author, text, at: Date.now(), where, ...(show && { show }) }],
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
      version: 4,
      partialize: (s) => ({ saved: s.saved, arrangements: s.arrangements, comments: s.comments, tracks: s.tracks, dockHeight: s.dockHeight }),
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
        // v3 kept both ideas in one take, with the one in the song as `kept`; that take is now in the song.
        for (const nodes of Object.values(state.saved ?? {}))
          if (Array.isArray(nodes))
            for (const n of nodes as AnySongNode[])
              if (n.type === 'take' && (n.data as { kept?: string }).kept) n.data = { ...n.data, added: true }
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

/**
 * A card plugged straight into a take (demo): it comes out of anywhere else it was, and the take is made
 * again with it in ("Making", then done), so what it plays changes (Strings join it, for one).
 */
function plugIntoTake(source: string, takeId: string, role: Role) {
  const set = useSong.setState
  set((s) => {
    const nodes = unplug(s.nodes, (id) => id === source).map((n) => {
      if (n.id !== takeId || n.type !== 'take') return n.id === source ? ({ ...n, selected: true } as AnySongNode) : n.selected ? ({ ...n, selected: false } as AnySongNode) : n
      return { ...n, selected: false, data: { ...n.data, sources: [...(n.data.sources ?? []), source], state: 'making' } } as AnySongNode
    })
    return {
      ...remember(s),
      ...keep(s, nodes),
      playing: s.playing === takeId ? null : s.playing,
      fresh: pulse(set, { id: `${source}|${takeId}`, source, section: takeId, role }),
    }
  })
  window.setTimeout(
    () => set((s) => keep(s, s.nodes.map((n) => (n.id === takeId && n.type === 'take' ? ({ ...n, data: { ...n.data, state: 'done' } } as AnySongNode) : n)))),
    MAKING_MS * 0.7,
  )
}

/** Takes matching cards out of every socket (or just `section`'s), leaving untouched sections as they were. */
function unplug(nodes: AnySongNode[], match: (id: string) => boolean, section?: string): AnySongNode[] {
  return nodes.map((n) => {
    // A take's own inputs (demo) come out the same way.
    if (n.type === 'take' && (!section || n.id === section) && n.data.sources?.some(match)) {
      const left = n.data.sources.filter((id) => !match(id))
      return { ...n, data: { ...n.data, sources: left.length ? left : undefined } } as AnySongNode
    }
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
  // Only takes added on purpose go in the song (see addToTimeline), so nothing joins the timeline here.
  const saved = s.songId ? { ...s.saved, [s.songId]: nodes } : s.saved
  return { nodes, saved }
}

/** True while the clip picked in the timeline is this section, or the take it plays. */
export function useInPickedClip(nodeId: string) {
  return useSong((s) => {
    if (!s.clip || !s.timelineOpen) return false
    const picked = clipsOf(s.nodes, s.songId ? s.arrangements[s.songId] : undefined).find((i) => i.clip.id === s.clip)
    return picked?.section.id === nodeId || picked?.take.id === nodeId
  })
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
