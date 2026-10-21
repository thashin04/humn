import { create } from 'zustand'

/**
 * The team's cursors (demo): where each is on the screen, and whether it's typing or pulling a wire. One resting
 * on the canvas is pinned there (`pin`, in canvas coordinates), so it stays on what it's over as the canvas moves.
 */
export type P = { x: number; y: number }
export type Cursor = { at: P; pin: P | null; shown: boolean; press: number; typing: boolean; wire: { from: P; color: string } | null }
export const CREW = ['thashin', 'naziat', 'tory'] as const
export type Who = (typeof CREW)[number]

type CrewState = { cursors: Record<Who, Cursor>; run: number; songId: string | null; start: (songId: string) => void }
const idle = (): Cursor => ({ at: { x: window.innerWidth + 40, y: window.innerHeight * 0.4 }, pin: null, shown: false, press: 0, typing: false, wire: null })

/** Starting it (sharing the song to the team) sets the crew to work on that song. */
export const useCrew = create<CrewState>()((set) => ({
  cursors: { thashin: idle(), naziat: idle(), tory: idle() },
  run: 0,
  songId: null,
  start: (songId) => set((s) => ({ run: s.run + 1, songId })),
}))
