import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { SEED_KEPT, type KeptItem } from '@/data/library'

type YoursState = {
  /** Uploads and recordings, kept for every song. Newest first. */
  kept: KeptItem[]
  keep: (item: Omit<KeptItem, 'id'>) => void
}

// Not persisted: uploads are object URLs, which only live as long as the tab.
export const useYours = create<YoursState>()((set) => ({
  kept: SEED_KEPT,
  keep: (item) => set((s) => ({ kept: [{ ...item, id: nanoid(6) }, ...s.kept] })),
}))
