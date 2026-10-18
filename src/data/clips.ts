import { nanoid } from 'nanoid'
import type { AnySongNode, SongNode, TakeEdit } from './nodes'

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
  /** The take that plays. Clips from before takes were kept one at a time play their section's take in the song. */
  takeId?: string
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

export function newClip(section: SongNode<'section'>, take?: SongNode<'take'>): Clip {
  const e: Partial<TakeEdit> = take?.data.edit ?? {}
  const length = take?.data.length ?? section.data.length
  const from = e.from ?? 0
  return {
    id: nanoid(8),
    sectionId: section.id,
    takeId: take?.id,
    ...CLIP_DEFAULTS,
    from,
    length: Math.max(1, (e.to ?? length) - from),
    volume: e.volume ?? 1,
    fadeIn: e.fadeIn ?? 0,
    fadeOut: e.fadeOut ?? 0,
  }
}

/** How long a clip takes to play. */
export const playTime = (c: Clip) => c.length / c.speed

/**
 * The song's clips with their sections and takes, in order. Only takes that
 * have been added to the timeline play; clips whose take or section is gone
 * drop out, and a take that got shorter cuts its clips down to fit. Until
 * someone arranges the song, it's each added take once, left to right as on the canvas.
 */
export function clipsOf(nodes: AnySongNode[], clips: Clip[] | undefined) {
  const sections = new Map(nodes.flatMap((n) => (n.type === 'section' ? [[n.id, n] as const] : [])))
  const added = nodes.filter((n): n is SongNode<'take'> => n.type === 'take' && !!n.data.added && n.data.state === 'done')
  const list =
    clips ??
    [...added]
      .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
      .flatMap((t) => {
        const section = sections.get(t.data.sectionId)
        return section ? [{ ...newClip(section, t), id: `auto-${t.id}` }] : []
      })
  return list.flatMap((c) => {
    const take = c.takeId ? added.find((t) => t.id === c.takeId) : added.find((t) => t.data.sectionId === c.sectionId)
    const section = take && sections.get(take.data.sectionId)
    if (!take || !section) return []
    const from = Math.min(c.from, Math.max(0, take.data.length - 1))
    return [{ clip: { ...c, takeId: take.id, from, length: Math.min(c.length, take.data.length - from) }, section, take }]
  })
}
