import { useEffect, useRef, useState } from 'react'

/** Plays through a clip's length and stops at the end. Sound comes later; this is the visual. */
export function usePlayback(duration: number) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const from = useRef(0)

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
        setPlaying(false)
        setProgress(0)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration])

  return { playing, progress, toggle: () => setPlaying((p) => !p) }
}
