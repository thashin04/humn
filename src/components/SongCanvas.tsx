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
import { useEffect, useMemo, useRef } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import { nodeTypes } from '@/components/nodes/nodeTypes'
import { People } from '@/components/chrome/People'
import { Rail } from '@/components/chrome/Rail'
import { Timeline } from '@/components/chrome/Timeline'
import { TitlePill } from '@/components/chrome/TitlePill'
import { Toolkit } from '@/components/chrome/Toolkit'
import { EmptyState } from '@/components/empty/EmptyState'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import { PipeEdge } from '@/components/wires/PipeEdge'
import { WireLine } from '@/components/wires/WireLine'
import { DRAWERS, NODE_DRAG_TYPE } from '@/data/library'
import { DEFAULT_ROLE, ROLES, type AnySongNode, type Kind } from '@/data/nodes'
import type { TemplateId } from '@/data/templates'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'

const edgeTypes: EdgeTypes = { pipe: PipeEdge }

/** The wires are read off each section's sockets, so a section is the one place that says what's plugged in. */
function wiresOf(nodes: AnySongNode[]): PipeEdge[] {
  const ids = new Set(nodes.map((n) => n.id))
  return nodes.flatMap((sec) =>
    sec.type !== 'section'
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
  const { nodes, tool, timelineOpen, templatePicker, open, onNodesChange } = useSong()
  const { openTemplatePicker, closeTemplatePicker, selectTemplate, addNode, fitRequest, dragKind } = useSong()
  const { connect, disconnect, setSnap } = useSong()
  const edges = useMemo(() => wiresOf(nodes), [nodes])
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

        {dragKind && (
          <div className="type-body pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3.5 py-2 text-on-ink shadow-lift">
            Let go to add it as {/^[aeiou]/i.test(DRAWERS[dragKind].label) ? 'an' : 'a'} {DRAWERS[dragKind].label}. Plug it
            into {ROLES.find((r) => r.id === DEFAULT_ROLE[dragKind])!.name}.
          </div>
        )}

        <div className="absolute top-5 left-5">
          <TitlePill title={song.title} />
        </div>
        <div className="absolute top-5 right-5">
          <People ids={song.collaboratorIds} />
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
