import { useEffect, useState } from 'react'
import chords from '@/assets/figma/rail-chords.svg'
import color from '@/assets/figma/rail-color.svg'
import feeling from '@/assets/figma/rail-feeling.svg'
import instrument from '@/assets/figma/rail-instrument.svg'
import photo from '@/assets/figma/rail-photo.svg'
import sound from '@/assets/figma/rail-sound.svg'
import voice from '@/assets/figma/rail-voice.svg'
import words from '@/assets/figma/rail-words.svg'
import section from '@/assets/figma/icon-section.svg'
import { DRAWERS } from '@/data/library'
import type { Kind } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { Drawer } from './Drawer'
import { useAddNode } from './useAddNode'

// One button per kind of thing, with its role dot. Section last.
const KINDS: { id: Kind; icon: string }[] = [
  { id: 'words', icon: words },
  { id: 'voice', icon: voice },
  { id: 'photo', icon: photo },
  { id: 'feeling', icon: feeling },
  { id: 'sound', icon: sound },
  { id: 'color', icon: color },
  { id: 'instrument', icon: instrument },
  { id: 'chords', icon: chords },
]

/**
 * The rail grows into a drawer, still one floating card: pressing a kind opens
 * its drawer beside the buttons. Only the size animates; the corner radius is
 * half the rail's width, so it's a pill when closed and the same curve when open.
 */
export function Rail() {
  const { drawer, setDrawer } = useSong()
  const add = useAddNode()
  // Keep showing the last drawer while it fades out.
  const [shown, setShown] = useState(drawer)
  if (drawer && drawer !== shown) setShown(drawer)

  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer, setDrawer])

  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-[26px] bg-card shadow-lift transition-[width,height] duration-300 ease-soft',
        drawer ? 'h-[min(632px,calc(100dvh-180px))] w-[369px]' : 'h-[395px] w-[52px]',
      )}
    >
      <div className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-1 px-[7px] py-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            title={DRAWERS[k.id].label}
            aria-label={DRAWERS[k.id].label}
            aria-expanded={drawer === k.id}
            onClick={() => setDrawer(drawer === k.id ? null : k.id)}
            className={cn(
              'shrink-0 rounded-full transition-[background-color,transform] duration-150 active:scale-95',
              drawer === k.id ? 'bg-button' : 'hover:bg-well',
            )}
          >
            <img src={k.icon} alt="" />
          </button>
        ))}
        <span className="h-px w-[22px] shrink-0 bg-rule" />
        <button
          title="Section"
          aria-label="Section"
          onClick={() => add('section')}
          className="flex size-[38px] shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-150 hover:bg-well active:scale-95"
        >
          <img src={section} alt="" />
        </button>
      </div>

      <span className="w-px shrink-0 bg-rule" />
      <div
        className={cn(
          'w-[316px] shrink-0 transition-opacity duration-200',
          drawer ? 'opacity-100 delay-100' : 'pointer-events-none opacity-0',
        )}
        inert={!drawer}
      >
        {shown && <Drawer key={shown} kind={shown} onClose={() => setDrawer(null)} />}
      </div>
    </div>
  )
}
