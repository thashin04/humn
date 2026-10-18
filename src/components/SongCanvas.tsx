import { ReactFlow, useNodesInitialized, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useRef } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import { nodeTypes } from '@/components/nodes/nodeTypes'
import { People } from '@/components/chrome/People'
import { Rail } from '@/components/chrome/Rail'
import { Timeline } from '@/components/chrome/Timeline'
import { TitlePill } from '@/components/chrome/TitlePill'
import { Toolkit } from '@/components/chrome/Toolkit'
import { EmptyState } from '@/components/empty/EmptyState'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import { DRAWERS, NODE_DRAG_TYPE } from '@/data/library'
import { DEFAULT_ROLE, ROLES, type Kind } from '@/data/nodes'
import type { TemplateId } from '@/data/templates'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'

export function SongCanvas() {
  const { nodes, edges, tool, timelineOpen, templatePicker, open, onNodesChange } = useSong()
  const { openTemplatePicker, closeTemplatePicker, selectTemplate, addNode, fitRequest, dragKind } = useSong()
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
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
          panOnDrag={tool === 'hand'}
          selectionOnDrag={tool === 'select'}
          panOnScroll
          proOptions={{ hideAttribution: true }}
          className={tool === 'hand' ? 'cursor-grab' : undefined}
        />

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
