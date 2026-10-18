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
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import { nodeTypes } from '@/components/nodes/nodeTypes'
import { People } from '@/components/chrome/People'
import { Rail } from '@/components/chrome/Rail'
import { Timeline } from '@/components/chrome/Timeline'
import { TitlePill } from '@/components/chrome/TitlePill'
import { Toolkit } from '@/components/chrome/Toolkit'
import { Hint } from '@/components/chrome/Hint'
import { EmptyState } from '@/components/empty/EmptyState'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import { PipeEdge } from '@/components/wires/PipeEdge'
import { WireLine } from '@/components/wires/WireLine'
import { NODE_DRAG_TYPE } from '@/data/library'
import { ROLES, type AnySongNode, type Kind } from '@/data/nodes'
import type { TemplateId } from '@/data/templates'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'

const edgeTypes: EdgeTypes = { pipe: PipeEdge }

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
  const { nodes, tool, timelineOpen, templatePicker, open, onNodesChange } = useSong()
  const { closeTemplatePicker, applyTemplate, addNode, fitRequest } = useSong()
  const { connect, disconnect, setSnap } = useSong()
  const edges = useMemo(() => wiresOf(nodes), [nodes])
  const { screenToFlowPosition, fitView } = useReactFlow()
  const { songId } = useParams()
  const song = useWorkspace((s) => s.songs.find((song) => song.id === songId))
  const updateSongTitle = useWorkspace((s) => s.updateSongTitle)
  const location = useLocation()
  const starter = (location.state as { template?: TemplateId } | null)?.template

  useEffect(() => {
    if (songId) open(songId)
  }, [songId, open])

  // Workspace starters go straight into their occasion; the picker is reserved for blank songs.
  useEffect(() => {
    if (!starter) return
    applyTemplate(starter)
  }, [starter, applyTemplate])
  useEffect(() => closeTemplatePicker, [songId, closeTemplatePicker])
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

        <div className="absolute top-5 left-1/2 -translate-x-1/2">
          <Hint />
        </div>

        <div className="absolute top-5 left-5">
          <TitlePill title={song.title} songId={song.id} />
        </div>
        <div className="absolute top-5 right-5">
          <People ids={song.collaboratorIds} songId={song.id} title={song.title} />
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
      {song.title === 'Untitled song' && <NameSongDialog onSave={(title) => updateSongTitle(song.id, title)} />}
    </div>
  )
}

function NameSongDialog({ onSave }: { onSave: (title: string) => void }) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const name = title.trim()
    if (name) onSave(name)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-ink/10 p-4 backdrop-blur-[2px]">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-song-title"
        className="flex w-105 max-w-full flex-col gap-5 rounded-[20px] bg-card p-7 shadow-lift"
      >
        <div className="flex flex-col gap-2">
          <h2 id="name-song-title" className="type-display text-ink">Name your song</h2>
          <p className="type-body text-ink-2">Give this song a name so it’s easy to find in your workspace.</p>
        </div>
        <input
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Childhood memories"
          aria-label="Song name"
          className="h-11 rounded-[10px] border border-rule-strong bg-well px-3 text-ink outline-none placeholder:text-ink-3 focus:border-select focus:ring-2 focus:ring-select/20"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="shine-button type-action self-end rounded-full bg-ink px-4 py-2.5 text-on-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </form>
    </div>
  )
}
