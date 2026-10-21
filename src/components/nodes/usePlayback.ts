import { useEffect, useRef, useState } from 'react'
import type { Score } from '@/audio/engine'
import { useSound, whole } from '@/audio/useSound'

/** How far through a clip we are while `playing`; calls `onEnd` at the end. The visual; `usePlayback` adds the sound. */
export function useProgress(playing: boolean, duration: number, onEnd: () => void) {
  const [progress, setProgress] = useState(0)
  const from = useRef(0)
  const end = useRef(onEnd)
  useEffect(() => {
    end.current = onEnd
  })

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const start = performance.now() - from.current * duration * 1000
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000))
      from.current = p
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
      else {
        from.current = 0
        setProgress(0)
        end.current()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration])

  return progress
}

/** Plays through a clip's length, out loud when there's a `score`, and stops at the end. */
export function usePlayback(duration: number, score?: () => Score) {
  const [playing, setPlaying] = useState(false)
  const progress = useProgress(playing, duration, () => setPlaying(false))
  // Picks up where it was paused.
  useSound(playing, () => (score ? whole(score()) : null), () => progress * duration, () => setPlaying(false))
  return { playing, progress, toggle: () => setPlaying((p) => !p) }
}
