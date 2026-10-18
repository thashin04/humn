import { nanoid } from 'nanoid'
import type { AnySongNode, SongNode } from './nodes'

/** What a clip can sound like, besides itself. Named for what people hear. */
export type Effect = 'none' | 'echo' | 'dreamy' | 'radio' | 'underwater' | 'lofi'

export const EFFECTS: { id: Effect; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'echo', name: 'Echo' },
  { id: 'dreamy', name: 'Dreamy' },
  { id: 'radio', name: 'Radio' },
  { id: 'underwater', name: 'Underwater' },
  { id: 'lofi', name: 'Lo-fi' },
]

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

/**
 * One place a section plays in the song. The same section can be in the song
 * more than once, each clip with its own settings. `from` and `length` are in
 * seconds of the section's take; at another speed it takes `length / speed` to play.
 */
export type Clip = {
  id: string
  sectionId: string
  from: number
  length: number
  /** 0–2, where 1 is as made. */
  volume: number
  muted: boolean
  fadeIn: number
  fadeOut: number
  speed: number
  /** Steps up or down, -12 to 12. */
  pitch: number
  effect: Effect
  /** 0–1. */
  strength: number
  reversed: boolean
}

export const CLIP_DEFAULTS = {
  volume: 1,
  muted: false,
  fadeIn: 0,
  fadeOut: 0,
  speed: 1,
  pitch: 0,
  effect: 'none' as Effect,
  strength: 0.5,
  reversed: false,
}

export function newClip(section: SongNode<'section'>): Clip {
  return { id: nanoid(8), sectionId: section.id, from: 0, length: section.data.length, ...CLIP_DEFAULTS }
}

/** How long a clip takes to play. */
export const playTime = (c: Clip) => c.length / c.speed

/**
 * The song's clips with their sections, in order. Clips whose section is gone
 * drop out, and a section that got shorter cuts its clips down to fit. Until
 * someone arranges the song, it's each section once, left to right as on the canvas.
 */
export function clipsOf(nodes: AnySongNode[], clips: Clip[] | undefined) {
  const sections = new Map(nodes.flatMap((n) => (n.type === 'section' ? [[n.id, n] as const] : [])))
  const list =
    clips ??
    [...sections.values()]
      .sort((a, b) => a.position.x - b.position.x)
      .map((s) => ({ ...newClip(s), id: `auto-${s.id}` }))
  return list.flatMap((c) => {
    const section = sections.get(c.sectionId)
    if (!section) return []
    const from = Math.min(c.from, Math.max(0, section.data.length - 1))
    return [{ clip: { ...c, from, length: Math.min(c.length, section.data.length - from) }, section }]
  })
}
