import { useEffect, useRef, useState } from 'react'
import { Download, NavArrowLeft, ShareAndroid } from 'iconoir-react'
import { Faces } from '@/components/Avatar'
import { useCrew } from '@/components/crew/store'
import { CHATS } from '@/data/collaborators'

export function People({ ids, songId, title }: { ids: string[]; songId: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  // Share canvas asks which group chat to send it to (demo); the team then joins, live.
  const [picking, setPicking] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const link = `${window.location.origin}/song/${songId}`

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setPicking(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [])

  const copyCanvasLink = async () => {
    await navigator.clipboard?.writeText(link)
    setStatus('Canvas link copied')
    window.setTimeout(() => setStatus(''), 1800)
  }

  const shareTo = (chat: (typeof CHATS)[number]) => {
    setStatus(`Shared with ${chat.name}`)
    window.setTimeout(() => {
      setOpen(false)
      setPicking(false)
      setStatus('')
      // The team opens it straight away and starts working on it with you.
      if (chat.id === 'team') useCrew.getState().start(songId)
    }, 900)
  }

  const exportSong = () => {
    const file = new Blob([JSON.stringify({ title, songId, canvasUrl: link }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'song'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus('Song exported')
    window.setTimeout(() => setStatus(''), 1800)
  }

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      <div className="flex h-10.5 items-center gap-1 rounded-[12px] bg-card pr-1.5 pl-2.5 shadow-lift">
        <Faces ids={ids} ring="var(--soft-card)" />
        <span className="w-1.5" />
        <button
          className="type-body flex h-7.5 items-center rounded-[8px] px-2.5 text-ink-2 transition-colors hover:bg-well"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((current) => !current)}
        >
          Share
        </button>
      </div>
      <div
        role="menu"
        aria-hidden={!open}
        inert={!open}
        className={`absolute top-full right-0 z-20 mt-2 w-71.5 rounded-[18px] border border-rule bg-card p-4 shadow-lift transition-[opacity,transform,visibility] duration-500 ease-soft ${open ? 'visible translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-2 opacity-0'}`}
      >
        {picking ? (
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <button
                aria-label="Back"
                onClick={() => setPicking(false)}
                className="-ml-1.5 flex size-7 items-center justify-center rounded-full text-ink-2 hover:bg-well"
              >
                <NavArrowLeft width={16} height={16} />
              </button>
              <div>
                <p className="type-title text-ink">Share canvas</p>
                <p className="type-caption text-ink-3">Send a link to a chat</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {CHATS.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => shareTo(chat)}
                  className="flex min-h-12 items-center gap-3 rounded-[10px] bg-well px-3 text-left transition-colors hover:bg-level"
                >
                  <Faces ids={chat.members} ring="var(--soft-well)" />
                  <span className="type-action flex-1 text-ink">{chat.name}</span>
                  <span className="type-caption text-ink-3">{chat.members.length}</span>
                </button>
              ))}
              <button onClick={copyCanvasLink} className="type-caption self-start rounded-[8px] px-2 py-1 text-ink-2 hover:bg-well">
                Copy link instead
              </button>
            </div>
            {status && <p className="type-caption text-ink-2">{status}</p>}
          </div>
        ) : (
        <div className="relative flex flex-col gap-3">
            <div>
              <p className="type-title text-ink">Share this song</p>
              <p className="type-caption mt-1 text-ink-3">Send someone a way into “{title}”.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setPicking(true)} className="flex min-h-11 items-center gap-3 rounded-[10px] bg-well px-3 text-left hover:bg-level">
                <ShareAndroid className="size-4 text-ink-2" />
                <span className="flex flex-col">
                  <span className="type-action text-ink">Share canvas</span>
                  <span className="type-caption text-ink-3">Send a link to this song</span>
                </span>
              </button>
              <button onClick={exportSong} className="flex min-h-11 items-center gap-3 rounded-[10px] bg-well px-3 text-left hover:bg-level">
                <Download className="size-4 text-ink-2" />
                <span className="flex flex-col">
                  <span className="type-action text-ink">Export song</span>
                  <span className="type-caption text-ink-3">Download a copy of the canvas</span>
                </span>
              </button>
            </div>
            {status && <p className="type-caption text-ink-2">{status}</p>}
        </div>
        )}
        </div>
    </div>
  )
}
