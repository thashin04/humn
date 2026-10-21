import { useEffect, useRef } from 'react'
import { play, type Part, type Playback, type Score } from './engine'

/**
 * Sound for something that plays: while `playing`, plays what `parts` makes
 * from `at()` seconds in. If something else starts playing, this one stops
 * and `onCut` says so, so its button can go back to play. A new `cue` (a
 * seek) starts it again from `at()`. Returns a way to add parts to it while
 * it plays, without a break in what's already sounding.
 */
export function useSound(playing: boolean, parts: () => Part[] | null, at: () => number, onCut: () => void, cue?: unknown) {
  const latest = useRef({ parts, at, onCut })
  const running = useRef<Playback | null>(null)
  useEffect(() => {
    latest.current = { parts, at, onCut }
  })
  useEffect(() => {
    if (!playing) return
    const made = latest.current.parts()
    if (!made) return
    const stop = play(made, latest.current.at(), () => latest.current.onCut())
    running.current = stop
    return () => {
      running.current = null
      stop()
    }
  }, [playing, cue])
  return (more: Part[]) => running.current?.join(more)
}

/** One score, start to end. */
export const whole = (score: Score): Part[] => [{ score, at: 0, start: 0, length: score.length }]
