import lullaby from '@/assets/figma/thumb-lullaby.svg'
import nanasHouse from '@/assets/figma/thumb-nanas-house.svg'
import roadTrip from '@/assets/figma/thumb-road-trip.svg'

export type Song = {
  id: string
  title: string
  ownerId: string
  collaboratorIds: string[]
  folderId: string | null
  editedAt: number
  /** Static mini-map for mock songs; new songs show an empty thumbnail. */
  thumbnail?: string
  trashed?: boolean
}

export type Folder = { id: string; name: string }

const MIN = 60_000
const DAY = 24 * 60 * MIN
const now = Date.now()

export const seedFolders: Folder[] = [
  { id: 'f-family', name: 'Family' },
  { id: 'f-trips', name: 'Trips' },
]

export const seedSongs: Song[] = [
  {
    id: 's-nanas-house',
    title: "Nana's house, summers",
    ownerId: 'ines',
    collaboratorIds: ['ines', 'kofi', 'sol'],
    folderId: 'f-family',
    editedAt: now - 4 * MIN,
    thumbnail: nanasHouse,
  },
  {
    id: 's-road-trip',
    title: 'Road trip, 2025',
    ownerId: 'ines',
    collaboratorIds: ['ines', 'ada'],
    folderId: 'f-trips',
    editedAt: now - DAY,
    thumbnail: roadTrip,
  },
  {
    id: 's-lullaby',
    title: 'Lullaby for Juno',
    ownerId: 'ines',
    collaboratorIds: ['ines'],
    folderId: 'f-family',
    editedAt: new Date(2026, 9, 9).getTime(),
    thumbnail: lullaby,
  },
]

export function editedLabel(editedAt: number): string {
  const diff = Date.now() - editedAt
  if (diff < MIN) return 'Just now'
  if (diff < 60 * MIN) return `Edited ${Math.round(diff / MIN)} min ago`
  if (diff < DAY) return `Edited ${Math.round(diff / (60 * MIN))} hr ago`
  if (diff < 2 * DAY) return 'Edited yesterday'
  return `Edited ${new Date(editedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}
