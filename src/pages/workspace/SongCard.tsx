import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Copy, Folder, Link, MoreHoriz, OpenNewWindow, Plus, ShareAndroid, Trash, Undo } from 'iconoir-react'
import { Faces } from '@/components/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { editedLabel, type Song } from '@/data/workspace'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { CanvasThumb } from './CanvasThumb'
import { SONG_DRAG_TYPE } from './views'

export function SongCard({ song }: { song: Song }) {
  const navigate = useNavigate()
  const open = () => !song.trashed && navigate(`/song/${song.id}`)

  return (
    <ContextMenu>
      <ContextMenuTrigger
        draggable={!song.trashed}
        onDragStart={(e) => {
          e.dataTransfer.setData(SONG_DRAG_TYPE, song.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
      className="group flex w-full min-w-0 flex-col gap-2.5 rounded-[12px] border border-rule bg-card shadow-lift"
      >
      <button
        onClick={open}
        aria-label={`Open ${song.title}`}
        className={cn(
          'relative aspect-[300/148] w-full overflow-hidden rounded-t-[12px] border-[1.5px] border-transparent bg-ground',
          !song.trashed && 'group-hover:border-rule-strong',
          song.trashed && 'cursor-default opacity-60',
        )}
      >
        <Thumb song={song} />
      </button>
      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <p className="type-title truncate text-ink">{song.title}</p>
        <div className="flex items-center justify-between">
          <p className="text-[12px] leading-[1.45] text-ink-3">{editedLabel(song.editedAt)}</p>
          <div className="flex items-center gap-2">
            <Faces ids={song.collaboratorIds} />
            <SongMenu song={song} />
          </div>
        </div>
      </div>
      </ContextMenuTrigger>
      <SongContextMenu song={song} />
    </ContextMenu>
  )
}

function SongContextMenu({ song }: { song: Song }) {
  const navigate = useNavigate()
  const { folders, moveSong, duplicateSong, trashSong, restoreSong, deleteSong } = useWorkspace()
  const duplicate = () => duplicateSong(song.id)
  const copyLink = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}/song/${song.id}`)
  }
  const share = async () => {
    if (navigator.share) await navigator.share({ title: song.title, url: `${window.location.origin}/song/${song.id}` })
    else await copyLink()
  }

  return (
    <ContextMenuContent>
      {song.trashed ? (
        <>
          <ContextMenuItem onClick={() => restoreSong(song.id)}><Undo />Restore</ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => deleteSong(song.id)}><Trash />Delete forever</ContextMenuItem>
        </>
      ) : (
        <>
          <ContextMenuItem onClick={() => navigate(`/song/${song.id}`)}><OpenNewWindow />Open song</ContextMenuItem>
          <ContextMenuItem onClick={duplicate}><Copy />Duplicate</ContextMenuItem>
          <ContextMenuItem onClick={copyLink}><Link />Copy link</ContextMenuItem>
          <ContextMenuItem onClick={share}><ShareAndroid />Share</ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger><Folder />Move to folder</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {folders.map((folder) => (
                <ContextMenuItem
                  key={folder.id}
                  disabled={song.folderId === folder.id}
                  onClick={() => moveSong(song.id, folder.id)}
                >
                  {folder.name}
                </ContextMenuItem>
              ))}
              {song.folderId && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => moveSong(song.id, null)}>Remove from folder</ContextMenuItem>
                </>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => trashSong(song.id)}><Trash />Move to trash</ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  )
}

export function SongMenu({ song }: { song: Song }) {
  const navigate = useNavigate()
  const { folders, moveSong, trashSong, restoreSong, deleteSong, duplicateSong } = useWorkspace()
  const [notice, setNotice] = useState('')
  const link = `${window.location.origin}/song/${song.id}`
  const copyLink = async () => {
    await navigator.clipboard?.writeText(link)
    setNotice('Copied')
    window.setTimeout(() => setNotice(''), 1200)
  }
  const share = async () => {
    if (navigator.share) await navigator.share({ title: song.title, url: link })
    else await copyLink()
  }

  return (
    <div className="relative">
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Options for ${song.title}`}
        className="flex size-6 items-center justify-center rounded-[6px] hover:bg-well"
      >
        <MoreHoriz className="size-4 text-ink-2" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {song.trashed ? (
          <>
            <DropdownMenuItem onClick={() => restoreSong(song.id)}>Restore</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => deleteSong(song.id)}>
              Delete forever
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => navigate(`/song/${song.id}`)}>Open</DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateSong(song.id)}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem onClick={copyLink}>Copy link</DropdownMenuItem>
            <DropdownMenuItem onClick={share}>Share</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                {folders.map((f) => (
                  <DropdownMenuItem key={f.id} disabled={song.folderId === f.id} onClick={() => moveSong(song.id, f.id)}>
                    {f.name}
                  </DropdownMenuItem>
                ))}
                {song.folderId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => moveSong(song.id, null)}>Remove from folder</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => trashSong(song.id)}>
              Move to trash
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    {notice && <span className="type-caption absolute right-7 bottom-0 rounded bg-ink px-2 py-1 text-on-ink">{notice}</span>}
    </div>
  )
}

/**
 * Once a song has been opened its thumbnail is drawn from its canvas, so it
 * keeps up with every change. Until then the sample songs show their artwork.
 */
function Thumb({ song }: { song: Song }) {
  const nodes = useSong((s) => s.saved[song.id])
  if (nodes) return <CanvasThumb nodes={nodes} />
  return song.thumbnail ? <img src={song.thumbnail} alt="" className="absolute inset-0 size-full max-w-none" /> : null
}

export function NewSongCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Create a new song from a blank canvas"
      className="shine-button group relative flex min-h-[221px] w-full overflow-hidden rounded-[14px] border border-rule-strong bg-level text-center shadow-lift transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-3 hover:shadow-[0_12px_30px_rgb(20_22_26/0.11)]"
    >
      <span aria-hidden className="new-song-pattern pointer-events-none absolute inset-0 opacity-55 transition-opacity duration-500 group-hover:opacity-80" />
      <span className="relative flex h-full w-full flex-col items-center justify-center gap-3 p-4">
        <span className="flex size-11 items-center justify-center rounded-[12px] border border-rule-strong bg-button text-ink-2 shadow-[0_2px_8px_rgb(20_22_26/0.06)] transition-[background-color,color,box-shadow,transform] duration-400 ease-out group-hover:scale-105 group-hover:rotate-90 group-hover:bg-card group-hover:text-ink-1 group-hover:shadow-[0_4px_12px_rgb(20_22_26/0.10)]">
          <Plus className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="type-title text-ink">New song</span>
          <span className="type-small text-ink-2">Start from a blank canvas</span>
        </span>
      </span>
    </button>
  )
}

/** List layout: one row per song. */
export function SongRow({ song }: { song: Song }) {
  const navigate = useNavigate()
  return (
    <div
      draggable={!song.trashed}
      onDragStart={(e) => e.dataTransfer.setData(SONG_DRAG_TYPE, song.id)}
      className="flex h-[72px] items-center gap-4 border-b border-rule px-4 last:border-b-0 hover:bg-well/60"
    >
      <button
        onClick={() => !song.trashed && navigate(`/song/${song.id}`)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <span className="relative h-12 w-[88px] shrink-0 overflow-hidden rounded-[10px] bg-ground">
          <Thumb song={song} />
        </span>
        <span className="type-title truncate text-ink">{song.title}</span>
      </button>
      <span className="w-36 text-[12px] leading-[1.45] text-ink-3">{editedLabel(song.editedAt)}</span>
      <span className="flex w-24 justify-end">
        <Faces ids={song.collaboratorIds} />
      </span>
      <SongMenu song={song} />
    </div>
  )
}
