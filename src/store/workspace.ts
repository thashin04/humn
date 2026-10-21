import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ME } from '@/data/collaborators'
import { seedFolders, seedSongs, type Folder, type Song } from '@/data/workspace'

type WorkspaceState = {
  songs: Song[]
  folders: Folder[]
  sidebarCollapsed: boolean
  layout: 'grid' | 'list'
  createSong: (init?: { title?: string; folderId?: string | null }) => string
  updateSongTitle: (songId: string, title: string) => void
  /** People join a song (demo: the team it was shared to). */
  joinSong: (songId: string, ids: string[]) => void
  duplicateSong: (songId: string) => string | undefined
  moveSong: (songId: string, folderId: string | null) => void
  trashSong: (songId: string) => void
  restoreSong: (songId: string) => void
  deleteSong: (songId: string) => void
  createFolder: (name: string) => string
  renameFolder: (folderId: string, name: string) => void
  deleteFolder: (folderId: string) => void
  toggleSidebar: () => void
  setLayout: (layout: 'grid' | 'list') => void
}

const KEEP_SONG_IDS = new Set(['s-nanas-house', 's-road-trip', 's-lullaby'])

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      songs: seedSongs,
      folders: seedFolders,
      sidebarCollapsed: false,
      layout: 'grid',
      createSong: ({ title = 'Untitled song', folderId = null } = {}) => {
        const id = nanoid(8)
        set((s) => ({
          songs: [
            { id, title, ownerId: ME, collaboratorIds: [ME], folderId, editedAt: Date.now() },
            ...s.songs,
          ],
        }))
        return id
      },
      joinSong: (songId, ids) =>
        set((s) => ({
          songs: s.songs.map((song) =>
            song.id === songId ? { ...song, collaboratorIds: [...song.collaboratorIds, ...ids.filter((id) => !song.collaboratorIds.includes(id))] } : song,
          ),
        })),
      updateSongTitle: (songId, title) =>
        set((s) => ({
          songs: s.songs.map((song) => (song.id === songId ? { ...song, title, editedAt: Date.now() } : song)),
        })),
      duplicateSong: (songId) => {
        const source = get().songs.find((song) => song.id === songId)
        if (!source) return undefined
        const id = nanoid(8)
        set((s) => ({
          songs: [{ ...source, id, title: `${source.title} copy`, editedAt: Date.now(), trashed: false }, ...s.songs],
        }))
        return id
      },
      moveSong: (songId, folderId) =>
        set((s) => ({ songs: s.songs.map((song) => (song.id === songId ? { ...song, folderId } : song)) })),
      trashSong: (songId) =>
        set((s) => ({ songs: s.songs.map((song) => (song.id === songId ? { ...song, trashed: true } : song)) })),
      restoreSong: (songId) =>
        set((s) => ({ songs: s.songs.map((song) => (song.id === songId ? { ...song, trashed: false } : song)) })),
      deleteSong: (songId) => set((s) => ({ songs: s.songs.filter((song) => song.id !== songId) })),
      createFolder: (name) => {
        const id = nanoid(8)
        set((s) => ({ folders: [...s.folders, { id, name }] }))
        return id
      },
      renameFolder: (folderId, name) =>
        set((s) => ({ folders: s.folders.map((f) => (f.id === folderId ? { ...f, name } : f)) })),
      // Songs in a deleted folder go back to the top level, never to the trash.
      deleteFolder: (folderId) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== folderId),
          songs: s.songs.map((song) => (song.folderId === folderId ? { ...song, folderId: null } : song)),
        })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setLayout: (layout) => set({ layout }),
    }),
    {
      name: 'humn-workspace',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<WorkspaceState>
        return {
          ...state,
          songs: (state.songs ?? seedSongs).filter((song) => KEEP_SONG_IDS.has(song.id)),
        }
      },
    },
  ),
)
