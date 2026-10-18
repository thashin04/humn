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

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
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
    { name: 'humn-workspace' },
  ),
)
