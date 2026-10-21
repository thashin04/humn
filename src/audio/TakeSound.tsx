import { useEffect, useRef } from 'react'
import { useSong } from '@/store/song'
import { DEMO_LENGTH, STRINGS_TRACK } from './demo'
import { play, type Part } from './engine'
import { takeScore } from './scores'

/**
 * Plays the take that's playing, whichever card or panel pressed play. One
 * place for it, so the take's card and its panel don't both sound. A paused
 * take picks up where it was.
 *
 * Demo: a take that's in the song plays with the song's Strings track once
 * there is one, so adding the track while it plays, you hear them join.
 */
export function TakeSound() {
  const playing = useSong((s) => s.playing)
  const strings = useSong((s) => (s.songId ? (s.tracks[s.songId] ?? []).some((t) => /string/i.test(t.name)) : false))
  const paused = useRef<{ id: string; at: number } | null>(null)

  useEffect(() => {
    if (!playing) return
    const { nodes, setPlaying } = useSong.getState()
    const take = nodes.find((n) => n.id === playing)
    if (take?.type !== 'take' || take.data.state !== 'done') return
    const score = takeScore(nodes, take)
    const from = paused.current?.id === playing ? paused.current.at : 0
    const began = performance.now() - from * 1000
    const parts: Part[] = [{ score, at: 0, start: 0, length: score.length }]
    if (strings && take.data.added && !/chorus/i.test(score.file ?? ''))
      parts.push({ score: { length: DEMO_LENGTH, notes: [], beds: [], file: STRINGS_TRACK }, at: 0, start: 0, length: Math.min(score.length, DEMO_LENGTH) })
    const stop = play(parts, from, () => setPlaying(null))
    return () => {
      stop()
      const at = (performance.now() - began) / 1000
      paused.current = at < score.length - 0.2 ? { id: playing, at } : null
    }
  }, [playing, strings])

  return null
}
