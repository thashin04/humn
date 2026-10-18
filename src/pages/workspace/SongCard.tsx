import { useNavigate } from 'react-router'
import add from '@/assets/figma/ws-add.svg'
import dots from '@/assets/figma/ws-dots.svg'
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
import { useWorkspace } from '@/store/workspace'
import { SONG_DRAG_TYPE } from './views'

export function SongCard({ song }: { song: Song }) {
  const navigate = useNavigate()
  const open = () => !song.trashed && navigate(`/song/${song.id}`)

  return (
    <div
      draggable={!song.trashed}
      onDragStart={(e) => {
        e.dataTransfer.setData(SONG_DRAG_TYPE, song.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="group flex w-full min-w-0 flex-col gap-2.5 rounded-[12px] bg-card shadow-lift"
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
        {song.thumbnail && <img src={song.thumbnail} alt="" className="absolute inset-0 size-full max-w-none" />}
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
    </div>
  )
}

export function SongMenu({ song }: { song: Song }) {
  const navigate = useNavigate()
  const { folders, moveSong, trashSong, restoreSong, deleteSong } = useWorkspace()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Options for ${song.title}`}
        className="flex size-6 items-center justify-center rounded-[6px] hover:bg-well"
      >
        <img src={dots} alt="" className="size-4" />
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
  )
}

export function NewSongCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[221px] w-full flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-rule-strong bg-white/25 hover:bg-white/60"
    >
      <span className="flex size-7 items-center justify-center rounded-[8px] bg-well">
        <img src={add} alt="" />
      </span>
      <span className="type-caption text-ink-2">New song</span>
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
      className="flex h-14 items-center gap-4 border-b border-rule px-3 last:border-b-0 hover:bg-well/60"
    >
      <button
        onClick={() => !song.trashed && navigate(`/song/${song.id}`)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <span className="relative h-9 w-[72px] shrink-0 overflow-hidden rounded-[6px] bg-ground">
          {song.thumbnail && <img src={song.thumbnail} alt="" className="absolute inset-0 size-full max-w-none" />}
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

