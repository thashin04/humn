import { useEffect, useRef, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { Faces } from '@/components/Avatar'

export function People({ ids, songId, title }: { ids: string[]; songId: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const link = `${window.location.origin}/song/${songId}`

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [])

  const copyCanvasLink = async () => {
    await navigator.clipboard?.writeText(link)
    setStatus('Canvas link copied')
    window.setTimeout(() => setStatus(''), 1800)
  }

  const shareCanvas = async () => {
    if (navigator.share) await navigator.share({ title, url: link })
    else await copyCanvasLink()
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
        <div className="relative flex flex-col gap-3">
            <div>
              <p className="type-title text-ink">Share this song</p>
              <p className="type-caption mt-1 text-ink-3">Send someone a way into “{title}”.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={shareCanvas} className="flex min-h-11 items-center gap-3 rounded-[10px] bg-well px-3 text-left hover:bg-level">
                <Share2 className="size-4 text-ink-2" />
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
        </div>
    </div>
  )
}
