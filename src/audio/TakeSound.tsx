import { useEffect, useRef } from 'react'
import { useSong } from '@/store/song'
import { play } from './engine'
import { takeScore } from './scores'

/**
 * Plays the take that's playing, whichever card or panel pressed play. One
 * place for it, so the take's card and its panel don't both sound. A paused
 * take picks up where it was.
 */
export function TakeSound() {
  const playing = useSong((s) => s.playing)
  const paused = useRef<{ id: string; at: number } | null>(null)

  useEffect(() => {
    if (!playing) return
    const { nodes, setPlaying } = useSong.getState()
    const take = nodes.find((n) => n.id === playing)
    if (take?.type !== 'take' || take.data.state !== 'done') return
    const score = takeScore(nodes, take)
    const from = paused.current?.id === playing ? paused.current.at : 0
    const began = performance.now() - from * 1000
    const stop = play([{ score, at: 0, start: 0, length: score.length }], from, () => setPlaying(null))
    return () => {
      stop()
      const at = (performance.now() - began) / 1000
      paused.current = at < score.length - 0.2 ? { id: playing, at } : null
    }
  }, [playing])

  return null
}
