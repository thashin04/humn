import type { Node } from '@xyflow/react'

/** What a node does to the music. A section has one socket per role. */
export type Role = 'intent' | 'lyrics' | 'melody' | 'harmony' | 'mood' | 'texture' | 'instruments'

export const ROLES: { id: Role; name: string }[] = [
  { id: 'intent', name: 'Intent' },
  { id: 'lyrics', name: 'Lyrics' },
  { id: 'melody', name: 'Melody' },
  { id: 'harmony', name: 'Harmony' },
  { id: 'mood', name: 'Mood' },
  { id: 'texture', name: 'Texture' },
  { id: 'instruments', name: 'Instruments' },
]

export type Kind = 'words' | 'lyrics' | 'voice' | 'photo' | 'feeling' | 'sound' | 'color' | 'instrument' | 'chords'

/** Each kind starts in a role; people can drop it into a different socket. */
export const DEFAULT_ROLE: Record<Kind, Role> = {
  words: 'intent',
  lyrics: 'lyrics',
  voice: 'melody',
  photo: 'mood',
  feeling: 'mood',
  sound: 'texture',
  color: 'mood',
  instrument: 'instruments',
  chords: 'harmony',
}

export type WordsData = { text: string }
/** Lines to be sung, in the person's own words. */
export type LyricsData = { text: string }
export type VoiceData = { label: string; duration: number }
export type PhotoData = { caption: string; src?: string }
export type FeelingData = { name: string; amount: number }
export type SoundData = { label: string; duration: number; place?: string }
export type ColorData = { label: string; gradient: string }
export type InstrumentData = { tab: string; name: string; detail: string; thumb?: string }
export type ChordsData = { chords: string[] }
/** A section says what's plugged into each of its sockets; the wires are drawn from this. */
export type Vocals = 'none' | 'hum' | 'words'
export type SectionData = {
  name: string
  length: number
  sources: Partial<Record<Role, string[]>>
  /** What this part is called on the card; falls back to the song's title. */
  title?: string
  /** A note in people's own words for just this section ("start gently, then let the piano open up"). */
  direction?: string
  /** 0 gentle … 1 lively. */
  energy?: number
  vocals?: Vocals
}
/**
 * Two versions of what a section made. Making until the mock "listening" ends.
 * `version` is the one last picked or played; `kept` is the one put in the song.
 */
export type TakeData = { sectionId: string; state: 'making' | 'done'; version: 'A' | 'B'; length: number; kept?: 'A' | 'B' }

type DataOf = {
  words: WordsData
  lyrics: LyricsData
  voice: VoiceData
  photo: PhotoData
  feeling: FeelingData
  sound: SoundData
  color: ColorData
  instrument: InstrumentData
  chords: ChordsData
  section: SectionData
  take: TakeData
}

export type NodeKind = keyof DataOf
export type SongNode<K extends NodeKind = NodeKind> = Node<DataOf[K], K>
export type AnySongNode = { [K in NodeKind]: SongNode<K> }[NodeKind]

/**
 * What a node holds when it's first added. Prompt starts empty; the rest use
 * the Figma sheet's examples until recording and uploading are built.
 */
export const STARTING_DATA: { [K in NodeKind]: DataOf[K] } = {
  words: { text: '' },
  lyrics: { text: '' },
  voice: { label: 'Nana humming', duration: 47 },
  photo: { caption: 'The red house, 1997' },
  feeling: { name: 'Nostalgia', amount: 0.7 },
  sound: { label: 'Rain on the lake', duration: 72 },
  color: { label: 'Open road', gradient: 'linear-gradient(135deg, #d5ac7e 14.29%, #87ceeb 85.71%)' },
  instrument: { tab: 'Keyboard', name: 'Upright piano', detail: 'a bit out of tune' },
  chords: { chords: ['F', 'Dm', 'B♭', 'C'] },
  section: { name: 'Verse', length: 30, sources: {} },
  take: { sectionId: '', state: 'making', version: 'A', length: 30 },
}

/** m:ss, as in the node meta ("0:47"). */
export function clock(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
