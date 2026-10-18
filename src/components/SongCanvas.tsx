import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  type EdgeChange,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import { nodeTypes } from '@/components/nodes/nodeTypes'
import { People } from '@/components/chrome/People'
import { Rail } from '@/components/chrome/Rail'
import { TitlePill } from '@/components/chrome/TitlePill'
import { Toolkit } from '@/components/chrome/Toolkit'
import { Hint } from '@/components/chrome/Hint'
import { EmptyState } from '@/components/empty/EmptyState'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import { TimelineView } from '@/components/timeline/TimelineView'
import { PipeEdge } from '@/components/wires/PipeEdge'
import { WireLine } from '@/components/wires/WireLine'
import { NODE_DRAG_TYPE } from '@/data/library'
import { ROLES, type AnySongNode, type Kind } from '@/data/nodes'
import type { TemplateId } from '@/data/templates'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'

const edgeTypes: EdgeTypes = { pipe: PipeEdge }
// Kept stable: React Flow copies this into its store on every change, over any fitView queued in between.
const FIT = { padding: 0.25, maxZoom: 1 }

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

export function SongCanvas() {
  const view = useSong((s) => s.view)
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

  if (!song || song.trashed) return <Navigate to="/" replace />

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-ground">
      <div className="relative min-h-0 flex-1">
        {view === 'canvas' ? <Canvas /> : <TimelineView />}

        <div className="absolute top-5 left-5">
          <TitlePill title={song.title} />
        </div>
        <div className="absolute top-5 right-5">
          <People ids={song.collaboratorIds} />
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
          <Toolkit />
        </div>
      </div>

      {templatePicker.open && <TemplatePicker />}
    </div>
  )
}

/** The node canvas, with the rail to add to it and the hint for what to do next. */
function Canvas() {
  const { nodes, tool, onNodesChange } = useSong()
  const { addNode, fitRequest, focus, clearFocus } = useSong()
  const { connect, disconnect, setSnap } = useSong()
  const edges = useMemo(() => wiresOf(nodes), [nodes])
  const { screenToFlowPosition, fitView } = useReactFlow()
  // A template just landed: bring all of it into view once every node is measured.
  const measured = useNodesInitialized()
  // Coming back to a particular node, skip framing everything first.
  const [arriving] = useState(focus)
  const fitted = useRef(fitRequest)
  useEffect(() => {
    if (!measured || fitted.current === fitRequest) return
    fitted.current = fitRequest
    fitView({ padding: 0.25, maxZoom: 1, duration: 500 })
  }, [measured, fitRequest, fitView])
  // Back from the timeline to a particular card or section: bring it into view.
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
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
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
            if (snap && state.fromNode) connect(state.fromNode.id, snap.section, snap.role)
            setSnap(null)
          }}
          fitView={!arriving}
          fitViewOptions={FIT}
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
      </div>

      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Hint />
      </div>
      <div className="absolute top-1/2 left-5 -translate-y-1/2">
        <Rail />
      </div>
    </>
  )
}
