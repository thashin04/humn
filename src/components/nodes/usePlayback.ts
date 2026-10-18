import { useEffect, useRef, useState } from 'react'

/** How far through a clip we are while `playing`; calls `onEnd` at the end. Sound comes later; this is the visual. */
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

/** Plays through a clip's length and stops at the end. */
export function usePlayback(duration: number) {
  const [playing, setPlaying] = useState(false)
  const progress = useProgress(playing, duration, () => setPlaying(false))
  return { playing, progress, toggle: () => setPlaying((p) => !p) }
}
