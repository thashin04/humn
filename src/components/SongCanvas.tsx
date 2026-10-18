import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  useViewport,
  ViewportPortal,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type EdgeTypes,
  type XYPosition,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import { nodeTypes } from '@/components/nodes/nodeTypes'
import { People } from '@/components/chrome/People'
import { Rail } from '@/components/chrome/Rail'
import { SectionPanel } from '@/components/chrome/SectionPanel'
import { TitlePill } from '@/components/chrome/TitlePill'
import { Toolkit } from '@/components/chrome/Toolkit'
import { Hint } from '@/components/chrome/Hint'
import { DraftPin, PinWithCard } from '@/components/comments/Comments'
import { EmptyState } from '@/components/empty/EmptyState'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import { CLIP_PANEL, TimelineView } from '@/components/timeline/TimelineView'
import { PipeBody, PipeEdge, PipeEdgeLine } from '@/components/wires/PipeEdge'
import { WireLine } from '@/components/wires/WireLine'
import { GhostEdge } from '@/components/wires/GhostEdge'
import { GHOST_ID, type GhostNode } from '@/components/nodes/ghost'
import { ME } from '@/data/collaborators'
import { interpret } from '@/data/interpret'
import { NODE_DRAG_TYPE } from '@/data/library'
import { ROLES, type AnySongNode, type Kind } from '@/data/nodes'
import type { TemplateId } from '@/data/templates'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'

const edgeTypes: EdgeTypes = { pipe: PipeEdge, pipeBody: PipeBody, pipeEdge: PipeEdgeLine, ghost: GhostEdge }
// Kept stable: React Flow copies this into its store on every change, over any fitView queued in between.
const FIT = { padding: 0.25, maxZoom: 1 }
const FIT_ANIMATED = { ...FIT, duration: 300 }

/**
 * The wires are read off each section's sockets, so a section is the one place
 * that says what's plugged in. Each take also gets a wire in from its section.
 */
function wiresOf(nodes: AnySongNode[]): PipeEdge[] {
  const lines = linesOf(nodes)
  // Each wire three times: all the pipes' edges, then all their strips, then all their lines, so nothing covers a line.
  return [
    ...lines.map((e) => ({ ...e, id: `${e.id}|edge`, type: 'pipeEdge' as const })),
    ...lines.map((e) => ({ ...e, id: `${e.id}|body`, type: 'pipeBody' as const })),
    ...lines,
  ]
}

function linesOf(nodes: AnySongNode[]): PipeEdge[] {
  const ids = new Set(nodes.map((n) => n.id))
  return nodes.flatMap((sec): PipeEdge[] =>
    sec.type === 'take'
      ? ids.has(sec.data.sectionId)
        ? [
            {
              id: `${sec.data.sectionId}|${sec.id}`,
              type: 'pipe',
              source: sec.data.sectionId,
              sourceHandle: 'take',
              target: sec.id,
              targetHandle: 'in',
              selectable: false,
              focusable: false,
              data: {},
            },
          ]
        : []
      : sec.type !== 'section'
        ? []
        : ROLES.filter((r) => (sec.data.sources[r.id] ?? []).some((src) => ids.has(src))).flatMap((r, row, rows) =>
          (sec.data.sources[r.id] ?? [])
            .filter((src) => ids.has(src))
            .map((src) => ({
              id: `${src}|${sec.id}`,
              type: 'pipe' as const,
              source: src,
              target: sec.id,
              targetHandle: r.id,
              selectable: false,
              focusable: false,
              // The top row turns furthest out, so pipes into lower rows run inside it, as in Figma.
              data: { role: r.id, lane: rows.length - 1 - row },
            })),
        ),
  )
}

/**
 * Once someone has made their first contribution and there's no section yet,
 * suggest one beside it: a ghost they can make real with one click. It offers
 * to plug in that first card; once there's a second, it stops guessing which,
 * and drops the suggested wire.
 */
function suggestFirstPart(nodes: AnySongNode[], drafting: string | null, measured?: { width: number; height: number }) {
  if (nodes.some((n) => n.type === 'section')) return null
  const cards = nodes.filter((n) => n.type !== 'take')
  if (!cards.length) return null
  const from = cards[0]
  if (from.id === drafting || ((from.type === 'words' || from.type === 'lyrics') && !from.data.text.trim())) return null
  const one = cards.length === 1
  const reading = interpret(from)
  const width = from.measured?.width ?? 260
  const node: GhostNode = {
    id: GHOST_ID,
    type: 'ghost',
    // Beside the contribution, with room for the wire: half of it, a gap, half of a section.
    position: { x: from.position.x + width / 2 + 130 + 135, y: from.position.y },
    origin: [0.5, 0.5],
    draggable: false,
    selectable: false,
    focusable: false,
    measured,
    data: { source: one ? from.id : null, role: reading.role, energy: reading.energy },
  }
  const edge: GhostEdge = {
    id: `${GHOST_ID}-wire`,
    type: 'ghost',
    source: from.id,
    target: GHOST_ID,
    targetHandle: 'in',
    selectable: false,
    focusable: false,
    data: { role: reading.role },
  }
  return { node, edge: one ? edge : null }
}

export function SongCanvas() {
  const timelineOpen = useSong((s) => s.timelineOpen)
  const still = useReducedMotion()
  const templatePicker = useSong((s) => s.templatePicker)
  const { songId } = useParams()
  const song = useWorkspace((s) => s.songs.find((song) => song.id === songId))
  const { open, openTemplatePicker, closeTemplatePicker, selectTemplate } = useSong()
  const starter = (useLocation().state as { template?: TemplateId } | null)?.template

  // Opening a song from a workspace starter lands on the picker with it chosen.
  useEffect(() => {
    if (!starter) return
    selectTemplate(starter)
    openTemplatePicker()
  }, [starter, selectTemplate, openTemplatePicker])
  useEffect(() => closeTemplatePicker, [songId, closeTemplatePicker])
  useEffect(() => {
    if (songId) open(songId)
  }, [songId, open])
  useShortcuts()

  if (!song || song.trashed) return <Navigate to="/" replace />

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-ground">
      <div className="relative min-h-0 flex-1">
        <Canvas />

        <div className="absolute top-5 left-5">
          <TitlePill songId={song.id} title={song.title} />
        </div>
        {/* A selected section's settings, or the timeline's selected clip, open here on the right. Never both: picking one lets go of the other. */}
        <div className="pointer-events-none absolute top-[76px] right-5 bottom-5 flex items-start">
          <SectionPanel />
        </div>
        <div id={CLIP_PANEL} className="pointer-events-none absolute top-[76px] right-5 bottom-5 z-10 flex items-start" />
        <div className="absolute top-5 right-5">
          <People ids={song.collaboratorIds} />
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
          <Toolkit />
        </div>
      </div>

      {/* The dock grows up from the bottom edge, and the canvas gives way as it does. */}
      <AnimatePresence initial={false}>
        {timelineOpen && (
          <motion.div
            key="timeline"
            className="shrink-0 overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={still ? { duration: 0 } : { type: 'spring', duration: 0.5, bounce: 0 }}
          >
            <TimelineView />
          </motion.div>
        )}
      </AnimatePresence>
      {templatePicker.open && <TemplatePicker />}
    </div>
  )
}

/** Undo and redo, V / C for the select and comment tools, and zooming, anywhere but while typing. */
function useShortcuts() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return
      const { undo, redo, setTool, tool } = useSong.getState()
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if (!mod && !e.altKey && e.key === 'v') setTool('select')
      else if (!mod && !e.altKey && e.key === 'c') setTool('comment')
      else if (e.key === 'Escape' && tool === 'comment') setTool('select')
      // + and − zoom the canvas, with or without ⌘ (instead of the browser zooming the page); ⇧1 fits it all.
      else if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        zoomIn({ duration: 200 })
      } else if (e.key === '-') {
        e.preventDefault()
        zoomOut({ duration: 200 })
      } else if (e.shiftKey && e.code === 'Digit1') fitView(FIT_ANIMATED)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomIn, zoomOut, fitView])
}

/** Comments left on the canvas. They stay the same size however far in or out it's zoomed. */
function CanvasComments({
  draft,
  onPost,
  onCancel,
  open,
  setOpen,
}: {
  draft: XYPosition | null
  onPost: (text: string) => void
  onCancel: () => void
  open: string | null
  setOpen: (id: string | null) => void
}) {
  const comments = useSong((s) => (s.songId ? s.comments[s.songId] : undefined))
  const moveComment = useSong((s) => s.moveComment)
  const { zoom } = useViewport()
  const place = (x: number, y: number) => ({ transform: `translate(${x}px, ${y}px) scale(${1 / zoom})`, transformOrigin: '0 0' })
  return (
    <ViewportPortal>
      {comments?.map((c) =>
        'x' in c.where ? (
          <div key={c.id} className="pointer-events-auto absolute top-0 left-0 z-[1000]" style={place(c.where.x, c.where.y)}>
            <PinWithCard
              comment={c}
              open={open === c.id}
              onToggle={() => setOpen(open === c.id ? null : c.id)}
              // Screen pixels to canvas units, from where the pin was when the drag began.
              onDrag={((from) => (dx: number, dy: number) => moveComment(c.id, { x: from.x + dx / zoom, y: from.y + dy / zoom }))(c.where)}
            />
          </div>
        ) : null,
      )}
      {draft && (
        <div className="pointer-events-auto absolute top-0 left-0 z-[1001]" style={place(draft.x, draft.y)}>
          <DraftPin onPost={onPost} onCancel={onCancel} />
        </div>
      )}
    </ViewportPortal>
  )
}

/** The node canvas, with the rail to add to it and the hint for what to do next. */
function Canvas() {
  const { nodes, tool, onNodesChange } = useSong()
  const { addNode, fitRequest, focus, clearFocus } = useSong()
  const { connect, disconnect, setSnap, addComment } = useSong()
  const commenting = tool === 'comment'
  const [draft, setDraft] = useState<XYPosition | null>(null)
  const [openComment, setOpenComment] = useState<string | null>(null)
  if (!commenting && draft) setDraft(null)
  const edges = useMemo(() => wiresOf(nodes), [nodes])
  const drafting = useSong((s) => s.drafting)
  // The ghost isn't kept with the song, so remember its measured size here or React Flow would hide it again.
  const [ghostSize, setGhostSize] = useState<{ width: number; height: number }>()
  const ghost = useMemo(() => suggestFirstPart(nodes, drafting, ghostSize), [nodes, drafting, ghostSize])
  const shownNodes = useMemo(() => (ghost ? [...nodes, ghost.node] : nodes) as Node[], [nodes, ghost])
  const shownEdges = useMemo(() => (ghost?.edge ? [...edges, ghost.edge] : edges) as Edge[], [edges, ghost])
  const { screenToFlowPosition, fitView } = useReactFlow()
  // A template just landed: bring all of it into view once every node is measured.
  const measured = useNodesInitialized()
  const fitted = useRef(fitRequest)
  useEffect(() => {
    if (!measured || fitted.current === fitRequest) return
    fitted.current = fitRequest
    fitView({ padding: 0.25, maxZoom: 1, duration: 500 })
  }, [measured, fitRequest, fitView])
  // Asked from the timeline to show a card or section: bring it into view.
  useEffect(() => {
    if (!measured || !focus) return
    fitView({ nodes: [{ id: focus }], padding: 0.3, maxZoom: 1, duration: 500 })
    clearFocus()
  }, [measured, focus, fitView, clearFocus])

  return (
    <>
      <div
        className="absolute inset-0"
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(NODE_DRAG_TYPE)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData(NODE_DRAG_TYPE)
          if (!raw) return
          e.preventDefault()
          const { kind, data } = JSON.parse(raw) as { kind: Kind; data: Record<string, unknown> }
          addNode(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }), data)
        }}
      >
        <ReactFlow
          nodes={shownNodes}
          edges={shownEdges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes: NodeChange[]) => {
            const ghostSized = changes.find((c) => c.type === 'dimensions' && c.id === GHOST_ID && c.dimensions)
            if (ghostSized?.type === 'dimensions' && ghostSized.dimensions) setGhostSize(ghostSized.dimensions)
            const rest = changes.filter((c) => !('id' in c) || c.id !== GHOST_ID)
            if (rest.length) onNodesChange(rest as NodeChange<AnySongNode>[])
          }}
          onEdgesChange={(changes: EdgeChange[]) =>
            changes.forEach((c) => c.type === 'remove' && c.id.split('|').length === 2 && disconnect(...(c.id.split('|') as [string, string])))
          }
          edgeTypes={edgeTypes}
          connectionLineComponent={WireLine}
          connectOnClick={false}
          connectionRadius={0}
          // Let go near a section and the wire plugs into whichever socket it was drawn to.
          onConnectEnd={(_, state) => {
            const snap = useSong.getState().snap
            // Prompts say what they mean already; anything else is asked how it should shape the verse.
            if (snap && state.fromNode) connect(state.fromNode.id, snap.section, snap.role)
            setSnap(null)
          }}
          fitView
          fitViewOptions={FIT}
          panOnDrag={tool === 'hand'}
          selectionOnDrag={tool === 'select'}
          // Commenting: a press anywhere, on a card or not, starts a comment there.
          nodesDraggable={!commenting}
          nodesConnectable={!commenting}
          elementsSelectable={!commenting}
          onPaneClick={(e) => {
            setOpenComment(null)
            if (commenting) setDraft(screenToFlowPosition({ x: e.clientX, y: e.clientY }))
          }}
          onNodeClick={(e) => {
            if (!commenting) return
            setOpenComment(null)
            setDraft(screenToFlowPosition({ x: e.clientX, y: e.clientY }))
          }}
          panOnScroll
          proOptions={{ hideAttribution: true }}
          className={tool === 'hand' ? 'cursor-grab' : commenting ? 'commenting' : undefined}
        >
          <CanvasComments
            draft={draft}
            open={openComment}
            setOpen={setOpenComment}
            onCancel={() => setDraft(null)}
            onPost={(text) => {
              if (draft) addComment(draft, text, ME)
              setDraft(null)
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.4} color="var(--soft-dot)" />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <EmptyState />
          </div>
        )}
      </div>

      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Hint />
      </div>
      {/* Centred in the open space between the title and the canvas's bottom edge, timeline or not. */}
      <div className="pointer-events-none absolute top-[76px] bottom-5 left-5">
        <div className="flex h-full items-center">
          <Rail />
        </div>
      </div>
    </>
  )
}
