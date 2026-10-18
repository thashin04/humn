import { useEffect, useRef, useState } from 'react'
import { motion, MotionConfig } from 'motion/react'
import { DRAWERS } from '@/data/library'
import type { Kind } from '@/data/nodes'
import { cn } from '@/lib/utils'
import { useSong } from '@/store/song'
import { Drawer } from './Drawer'
import { KIND_ICONS } from './kindIcons'
import { useAddNode } from './useAddNode'

// One button per kind of thing. Sections are added from the toolbar.
// Prompts and lyrics are written, not picked: they go straight onto the canvas.
const WRITTEN: Kind[] = ['words', 'lyrics']
const KINDS: Kind[] = ['words', 'lyrics', 'voice', 'photo', 'sound', 'color', 'instrument']

/**
 * The rail grows into a drawer, still one floating card: pressing a kind opens
 * its drawer beside the buttons. Only the size animates; the corner radius is
 * half the rail's width, so it's a pill when closed and the same curve when open.
 */
export function Rail() {
  const { drawer, setDrawer } = useSong()
  const add = useAddNode()
  const write = (kind: Kind) => {
    setDrawer(null)
    add(kind)
  }
  const ref = useRef<HTMLDivElement>(null)
  // Keep showing the last drawer while it fades out, and note when one drawer
  // replaces another so the new contents can settle in instead of popping.
  const [shown, setShown] = useState(drawer)
  const [prev, setPrev] = useState(drawer)
  const [swapped, setSwapped] = useState(false)
  if (drawer !== prev) {
    setPrev(drawer)
    if (drawer) {
      setSwapped(prev !== null)
      setShown(drawer)
    }
  }

  // Escape or a press anywhere outside the rail tucks the drawer away.
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(null)
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setDrawer(null)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [drawer, setDrawer])

  // Opening: the card grows with a hint of spring, then the contents drift in.
  // Closing: the contents leave first, then the card settles back to a pill.
  return (
    <div
      ref={ref}
      className={cn(
        'pointer-events-auto flex overflow-hidden rounded-[26px] bg-card shadow-lift transition-[width,height] motion-reduce:transition-none',
        drawer
          ? 'h-[min(632px,100%)] w-[369px] duration-[380ms] ease-spring'
          : 'h-[306px] w-[52px] delay-[60ms] duration-[280ms] ease-soft',
      )}
    >
      <MotionConfig reducedMotion="user">
      <div className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-1 px-[7px] py-2">
        {KINDS.map((k) => {
          const Icon = KIND_ICONS[k]
          return (
            <button
              key={k}
              title={DRAWERS[k].label}
              aria-label={DRAWERS[k].label}
              aria-expanded={WRITTEN.includes(k) ? undefined : drawer === k}
              onClick={() => (WRITTEN.includes(k) ? write(k) : setDrawer(drawer === k ? null : k))}
              className={cn(
                'relative flex size-[38px] shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] ease-soft active:scale-95',
                // The icon whitens as the pill arrives, rather than before it gets there.
                drawer === k ? 'text-on-ink delay-[50ms] duration-200' : 'text-ink-2 duration-200 hover:bg-well hover:text-ink-1',
              )}
            >
              {drawer === k && (
                // One dark pill shared by every button: picking another kind slides it over.
                <motion.span
                  layoutId="rail-selected"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', visualDuration: 0.26, bounce: 0.28 }}
                  className="absolute inset-0 rounded-full bg-ink"
                />
              )}
              <Icon width={18} height={18} strokeWidth={1.5} className="relative" />
            </button>
          )
        })}
      </div>
      </MotionConfig>

      <span
        className={cn(
          'w-px shrink-0 bg-rule transition-opacity duration-200 motion-reduce:transition-none',
          drawer ? 'opacity-100' : 'opacity-0 delay-[120ms]',
        )}
      />
      <div
        className={cn(
          'w-[316px] shrink-0 transition-[opacity,transform,filter] motion-reduce:transition-none',
          drawer
            ? 'translate-x-0 opacity-100 blur-none delay-[120ms] duration-[280ms] ease-soft'
            : 'pointer-events-none -translate-x-1.5 opacity-0 blur-[2px] duration-[140ms] ease-soft',
        )}
        inert={!drawer}
      >
        {shown && (
          <div key={shown} className={cn('h-full', swapped && 'animate-drawer-swap')}>
            <Drawer kind={shown} onClose={() => setDrawer(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
