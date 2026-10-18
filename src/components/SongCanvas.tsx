import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import { nodeTypes } from '@/components/nodes/nodeTypes'
import { People } from '@/components/chrome/People'
import { Rail } from '@/components/chrome/Rail'
import { SectionPanel } from '@/components/chrome/SectionPanel'
import { Timeline } from '@/components/chrome/Timeline'
import { TitlePill } from '@/components/chrome/TitlePill'
import { Toolkit } from '@/components/chrome/Toolkit'
import { Hint } from '@/components/chrome/Hint'
import { EmptyState } from '@/components/empty/EmptyState'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import { PipeEdge } from '@/components/wires/PipeEdge'
import { WireLine } from '@/components/wires/WireLine'
import { GhostEdge } from '@/components/wires/GhostEdge'
import { GHOST_ID, type GhostNode } from '@/components/nodes/ghost'
import { interpret } from '@/data/interpret'
import { NODE_DRAG_TYPE } from '@/data/library'
import { ROLES, type AnySongNode, type Kind } from '@/data/nodes'
import type { TemplateId } from '@/data/templates'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'

const edgeTypes: EdgeTypes = { pipe: PipeEdge, ghost: GhostEdge }

/**
 * The wires are read off each section's sockets, so a section is the one place
 * that says what's plugged in. Each take also gets a wire in from its section.
 */
function wiresOf(nodes: AnySongNode[]): PipeEdge[] {
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
        : ROLES.flatMap((r) =>
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
              data: { role: r.id },
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
  const { nodes, tool, timelineOpen, templatePicker, open, onNodesChange } = useSong()
  const { openTemplatePicker, closeTemplatePicker, selectTemplate, addNode, fitRequest } = useSong()
  const { connect, disconnect, setSnap } = useSong()
  const edges = useMemo(() => wiresOf(nodes), [nodes])
  const drafting = useSong((s) => s.drafting)
  // The ghost isn't kept with the song, so remember its measured size here or React Flow would hide it again.
  const [ghostSize, setGhostSize] = useState<{ width: number; height: number }>()
  const ghost = useMemo(() => suggestFirstPart(nodes, drafting, ghostSize), [nodes, drafting, ghostSize])
  const shownNodes = useMemo(() => (ghost ? [...nodes, ghost.node] : nodes) as Node[], [nodes, ghost])
  const shownEdges = useMemo(() => (ghost?.edge ? [...edges, ghost.edge] : edges) as Edge[], [edges, ghost])
  const { screenToFlowPosition, fitView } = useReactFlow()
  const { songId } = useParams()
  const song = useWorkspace((s) => s.songs.find((song) => song.id === songId))
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
  // A template just landed: bring all of it into view once every node is measured.
  const measured = useNodesInitialized()
  const fitted = useRef(fitRequest)
  useEffect(() => {
    if (!measured || fitted.current === fitRequest) return
    fitted.current = fitRequest
    fitView({ padding: 0.25, maxZoom: 1, duration: 500 })
  }, [measured, fitRequest, fitView])

  if (!song || song.trashed) return <Navigate to="/" replace />

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-ground">
      <div
        className="relative min-h-0 flex-1"
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
            changes.forEach((c) => c.type === 'remove' && disconnect(...(c.id.split('|') as [string, string])))
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
          fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
          panOnDrag={tool === 'hand'}
          selectionOnDrag={tool === 'select'}
          panOnScroll
          proOptions={{ hideAttribution: true }}
          className={tool === 'hand' ? 'cursor-grab' : undefined}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.4} color="var(--soft-dot)" />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <EmptyState />
          </div>
        )}

        <div className="absolute top-5 left-1/2 -translate-x-1/2">
          <Hint />
        </div>

        <div className="absolute top-5 left-5">
          <TitlePill title={song.title} />
        </div>
        <div className="absolute top-5 right-5">
          <People ids={song.collaboratorIds} />
        </div>
        <div className="pointer-events-none absolute top-[78px] right-5 bottom-[84px] flex items-start">
          <SectionPanel songTitle={song.title} />
        </div>
        <div className="absolute top-1/2 left-5 -translate-y-1/2">
          <Rail />
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
          <Toolkit />
        </div>
      </div>

      {timelineOpen && <Timeline />}
      {templatePicker.open && <TemplatePicker />}
    </div>
  )
}
