import { Folder as FolderIcon, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { useState, type DragEvent, type ReactElement, type ReactNode } from 'react'
import folderIcon from '@/assets/figma/ws-nav-folder.svg'
import savedIcon from '@/assets/figma/ws-nav-saved.svg'
import sharedIcon from '@/assets/figma/ws-nav-shared.svg'
import trashIcon from '@/assets/figma/ws-nav-trash.svg'
import { Avatar } from '@/components/Avatar'
import { MaskIcon } from '@/components/MaskIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { collaborators, ME } from '@/data/collaborators'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'
import { sameView, SONG_DRAG_TYPE, songsIn, useView, type View } from './views'

export function Sidebar() {
  const { songs, folders, sidebarCollapsed: collapsed, toggleSidebar, createFolder, moveSong } = useWorkspace()
  const [view, setView] = useView()
  const [renaming, setRenaming] = useState<string | null>(null)
  const me = collaborators.find((c) => c.id === ME)!

  const count = (v: View) => songsIn(v, songs).length || undefined
  const dropInto = (folderId: string | null) => (e: DragEvent) => {
    const songId = e.dataTransfer.getData(SONG_DRAG_TYPE)
    if (songId) moveSong(songId, folderId)
  }

  const newFolder = () => {
    const id = createFolder('New folder')
    if (collapsed) toggleSidebar()
    setRenaming(id)
  }

  const nav: { view: View; label: string; icon: string; onDrop?: (e: DragEvent) => void }[] = [
    { view: { kind: 'mine' }, label: 'My songs', icon: folderIcon, onDrop: dropInto(null) },
    { view: { kind: 'shared' }, label: 'Shared with me', icon: sharedIcon },
    { view: { kind: 'saved' }, label: 'Saved sounds', icon: savedIcon },
    { view: { kind: 'trash' }, label: 'Trash', icon: trashIcon },
  ]

  return (
    <aside
      className={cn(
        // 26px is half the collapsed width, so it's a full pill there and the radius never has to animate.
        'flex h-full shrink-0 flex-col gap-1 rounded-[26px] bg-card shadow-lift transition-[width] duration-300 ease-soft',
        collapsed ? 'w-[52px] items-center px-[7px] py-3' : 'w-[232px] px-3 py-4',
      )}
    >
      {/* Owner, with the collapse toggle; collapsed shows only the toggle */}
      <div className={cn('flex items-center', collapsed ? 'pb-2' : 'gap-2 px-1.5 pt-1 pb-3')}>
        {!collapsed && (
          <>
            <Avatar id={me.id} />
            <p className="type-title flex-1 truncate text-ink">{me.name}</p>
          </>
        )}
        <WithTooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} show>
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('flex items-center justify-center rounded-full text-nav-ink-3 hover:bg-well', collapsed ? 'size-[38px]' : 'size-7')}
          >
            {collapsed ? <PanelLeftOpen className="size-4" strokeWidth={1.5} /> : <PanelLeftClose className="size-4" strokeWidth={1.5} />}
          </button>
        </WithTooltip>
      </div>

      <nav className="flex w-full flex-col gap-0.5">
        {nav.map((item) => (
          <NavItem
            key={item.label}
            label={item.label}
            icon={<MaskIcon src={item.icon} />}
            count={count(item.view)}
            active={sameView(view, item.view)}
            collapsed={collapsed}
            onClick={() => setView(item.view)}
            onDrop={item.onDrop}
          />
        ))}
      </nav>

      {/* Folders: our addition for sorting songs; not in the Figma frame yet */}
      <div className={cn('mt-4 flex w-full flex-col gap-0.5', collapsed && 'items-center border-t border-rule pt-3')}>
        {!collapsed && (
          <div className="flex items-center justify-between px-2.5 pb-1">
            <p className="type-small text-nav-ink-3">Folders</p>
            <button
              onClick={newFolder}
              aria-label="New folder"
              title="New folder"
              className="flex size-6 items-center justify-center rounded-full text-nav-ink-3 hover:bg-well"
            >
              <Plus className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )}
        {folders.map((folder) =>
          renaming === folder.id ? (
            <FolderNameInput key={folder.id} folderId={folder.id} onDone={() => setRenaming(null)} />
          ) : (
            <NavItem
              key={folder.id}
              label={folder.name}
              icon={<FolderIcon className="size-4" strokeWidth={1.5} />}
              count={count({ kind: 'folder', id: folder.id })}
              active={sameView(view, { kind: 'folder', id: folder.id })}
              collapsed={collapsed}
              onClick={() => setView({ kind: 'folder', id: folder.id })}
              onDrop={dropInto(folder.id)}
              menu={
                <FolderMenu
                  folderId={folder.id}
                  onRename={() => setRenaming(folder.id)}
                  onDeleted={() => sameView(view, { kind: 'folder', id: folder.id }) && setView({ kind: 'mine' })}
                />
              }
            />
          ),
        )}
        {collapsed && (
          <WithTooltip label="New folder" show>
            <button
              onClick={newFolder}
              aria-label="New folder"
              className="flex size-[38px] items-center justify-center rounded-full text-nav-ink-3 hover:bg-well"
            >
              <Plus className="size-4" strokeWidth={1.5} />
            </button>
          </WithTooltip>
        )}
      </div>

      <div className="flex-1" />

    </aside>
  )
}

function NavItem({
  label,
  icon,
  count,
  active,
  collapsed,
  onClick,
  onDrop,
  menu,
}: {
  label: string
  icon: ReactNode
  count?: number
  active: boolean
  collapsed: boolean
  onClick: () => void
  onDrop?: (e: DragEvent) => void
  menu?: ReactNode
}) {
  const [over, setOver] = useState(false)
  const dropProps = onDrop && {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(SONG_DRAG_TYPE)) return
      e.preventDefault()
      setOver(true)
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => {
      setOver(false)
      onDrop(e)
    },
  }

  return (
    <WithTooltip label={label} show={collapsed}>
      <div
        {...dropProps}
        className={cn(
          'group relative flex shrink-0 items-center rounded-full',
          collapsed ? 'size-[38px] justify-center' : 'h-8 w-full',
          active ? 'bg-nav-active text-nav-ink' : 'text-nav-ink-2 hover:bg-well',
          over && 'ring-[1.5px] ring-select',
        )}
      >
        <button
          onClick={onClick}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={cn('flex size-full items-center rounded-full', collapsed ? 'justify-center' : 'gap-2.5 px-3')}
        >
          {icon}
          {!collapsed && (
            <>
              <span className="type-nav flex-1 truncate text-left">{label}</span>
              {count !== undefined && (
                <span className={cn('text-[11px] leading-[1.4] text-nav-ink-3', menu && 'group-hover:invisible')}>
                  {count}
                </span>
              )}
            </>
          )}
        </button>
        {menu && !collapsed && (
          <div className="absolute right-1.5 opacity-0 group-hover:opacity-100 has-[[data-popup-open]]:opacity-100">
            {menu}
          </div>
        )}
      </div>
    </WithTooltip>
  )
}

function FolderMenu({ folderId, onRename, onDeleted }: { folderId: string; onRename: () => void; onDeleted: () => void }) {
  const deleteFolder = useWorkspace((s) => s.deleteFolder)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Folder options"
        className="flex size-6 items-center justify-center rounded-full text-nav-ink-3 hover:bg-card"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            deleteFolder(folderId)
            onDeleted()
          }}
        >
          Delete folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FolderNameInput({ folderId, onDone }: { folderId: string; onDone: () => void }) {
  const { folders, renameFolder } = useWorkspace()
  const [name, setName] = useState(folders.find((f) => f.id === folderId)?.name ?? '')
  const save = () => {
    if (name.trim()) renameFolder(folderId, name.trim())
    onDone()
  }
  return (
    <div className="flex h-8 w-full items-center gap-2.5 rounded-full bg-well px-3 text-nav-ink-2">
      <FolderIcon className="size-4 shrink-0" strokeWidth={1.5} />
      <input
        autoFocus
        onFocus={(e) => e.target.select()}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') onDone()
        }}
        aria-label="Folder name"
        className="type-nav min-w-0 flex-1 bg-transparent text-nav-ink outline-none"
      />
    </div>
  )
}

/** Tooltip to the right of an item, only while `show` (the collapsed sidebar). */
function WithTooltip({ label, show, children }: { label: string; show: boolean; children: ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
