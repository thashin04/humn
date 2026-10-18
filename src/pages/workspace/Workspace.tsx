import { Plus } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { templates, type TemplateId } from '@/data/templates'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'
import { LayoutToggle, SearchField } from './Controls'
import { Sidebar } from './Sidebar'
import { NewSongCard, SongCard, SongRow } from './SongCard'
import { StarterCard, StartersPanel } from './Starters'
import { songsIn, useView, viewTitle } from './views'

export function Workspace() {
  const { songs, folders, layout, createSong, sidebarCollapsed } = useWorkspace()
  const [view] = useView()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const folderId = view.kind === 'folder' ? view.id : null
  const newSong = () => navigate(`/song/${createSong({ folderId })}`)
  const startFrom = (template: TemplateId) => {
    const name = templates.find((item) => item.id === template)?.name ?? 'Untitled song'
    navigate(`/song/${createSong({ folderId, title: name })}`, { state: { template } })
  }

  const canCreate = view.kind === 'mine' || view.kind === 'folder'
  const all = songsIn(view, songs).sort((a, b) => b.editedAt - a.editedAt)
  const shown = all.filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <div className="flex h-dvh gap-3 bg-ground p-3">
      <Sidebar />

      <main className="relative flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pt-3 pb-5">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed right-0 bottom-0 left-0 z-10 h-24 bg-linear-to-t from-white/90 via-white/55 to-transparent"
        />
        <header className="flex items-center justify-between">
          <h1 className="type-heading text-ink">Your workspace</h1>
          <button
            onClick={newSong}
            className="shine-button type-action flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-on-ink transition-transform duration-150 active:scale-95"
          >
            <Plus className="size-3.5" strokeWidth={1.75} />
            New song
          </button>
        </header>

        {view.kind === 'mine' && <StartersPanel onStart={startFrom} />}

        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-baseline gap-3">
            <h2 className="type-title text-ink">{viewTitle(view, folders)}</h2>
          </div>
          {view.kind !== 'starters' && view.kind !== 'saved' && (
            <div className="flex items-center gap-2">
              <SearchField value={query} onChange={setQuery} />
              <LayoutToggle />
            </div>
          )}
        </div>

        {view.kind === 'starters' ? (
          <div className="flex flex-wrap gap-4">
            {templates.map((t, index) => (
              <StarterCard key={t.id} id={t.id} index={index} onStart={startFrom} />
            ))}
          </div>
        ) : view.kind === 'saved' ? (
          <Empty>Sounds you save from your takes will live here.</Empty>
        ) : (
          <MotionConfig reducedMotion="user">
            <AnimatePresence mode="wait" initial={false}>
              {layout === 'grid' ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className={cn('grid content-start gap-4', sidebarCollapsed ? 'grid-cols-4' : 'grid-cols-3')}
                >
                  {canCreate && !query && <NewSongCard onClick={newSong} />}
                  {shown.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col overflow-hidden rounded-[14px] border border-rule bg-card shadow-lift"
                >
                  {shown.map((song) => (
                    <SongRow key={song.id} song={song} />
                  ))}
                  {canCreate && !query && (
                    <button
                      type="button"
                      onClick={newSong}
                      className="group type-caption flex h-14 items-center gap-3 border-t border-rule px-4 text-left text-ink-2 transition-[background-color,color] duration-400 hover:bg-well/60 hover:text-ink-1"
                    >
                      <span className="flex size-7 items-center justify-center rounded-[8px] bg-well text-ink-2 transition-colors duration-400 group-hover:bg-ink group-hover:text-on-ink">
                        <Plus className="size-3.5" strokeWidth={1.75} />
                      </span>
                      <span className="flex flex-col">
                        <span className="type-caption text-ink-1">New song</span>
                        <span className="type-small text-ink-3">Start from a blank canvas</span>
                      </span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </MotionConfig>
        )}

        {query && shown.length === 0 && <Empty>No songs match “{query}”.</Empty>}
        {!query && view.kind === 'trash' && all.length === 0 && <Empty>Trash is empty.</Empty>}
        {!query && view.kind === 'shared' && all.length === 0 && <Empty>Nothing shared with you yet.</Empty>}
      </main>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="type-body py-10 text-center text-ink-3">{children}</p>
}
