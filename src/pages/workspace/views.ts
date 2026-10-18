import { useSearchParams } from 'react-router'
import { ME } from '@/data/collaborators'
import type { Folder, Song } from '@/data/workspace'

export type View =
  | { kind: 'mine' }
  | { kind: 'shared' }
  | { kind: 'starters' }
  | { kind: 'saved' }
  | { kind: 'trash' }
  | { kind: 'folder'; id: string }

/** The current workspace view lives in the URL, so back/forward and reloads keep it. */
export function useView(): [View, (view: View) => void] {
  const [params, setParams] = useSearchParams()
  const folder = params.get('folder')
  const kind = params.get('view')
  const view: View = folder
    ? { kind: 'folder', id: folder }
    : kind === 'shared' || kind === 'starters' || kind === 'saved' || kind === 'trash'
      ? { kind }
      : { kind: 'mine' }

  const setView = (next: View) =>
    setParams(
      next.kind === 'mine' ? {} : next.kind === 'folder' ? { folder: next.id } : { view: next.kind },
    )
  return [view, setView]
}

export function sameView(a: View, b: View) {
  return a.kind === b.kind && (a.kind !== 'folder' || a.id === (b as { id: string }).id)
}

export function songsIn(view: View, songs: Song[]): Song[] {
  const live = songs.filter((s) => !s.trashed)
  switch (view.kind) {
    case 'mine':
      return live.filter((s) => s.ownerId === ME)
    case 'shared':
      return live.filter((s) => s.ownerId !== ME)
    case 'folder':
      return live.filter((s) => s.folderId === view.id)
    case 'trash':
      return songs.filter((s) => s.trashed)
    default:
      return []
  }
}

export function viewTitle(view: View, folders: Folder[]): string {
  switch (view.kind) {
    case 'mine':
      return 'My songs'
    case 'shared':
      return 'Shared with me'
    case 'starters':
      return 'Starters'
    case 'saved':
      return 'Saved sounds'
    case 'trash':
      return 'Trash'
    case 'folder':
      return folders.find((f) => f.id === view.id)?.name ?? 'Folder'
  }
}

export const SONG_DRAG_TYPE = 'application/x-humn-song'
