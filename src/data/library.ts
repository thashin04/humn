import birthday from '@/assets/photos/template-birthday.jpg'
import redHouse from '@/assets/photos/template-photo.jpg'
import type { Kind } from './nodes'

/** Drag data for a drawer tile on its way to the canvas: `{ kind, data }`. */
export const NODE_DRAG_TYPE = 'application/humn-node'

/** One thing in a drawer. `data` becomes the node's data when it's added. */
export type LibraryItem = {
  name: string
  meta?: string
  data: Record<string, unknown>
  img?: string
  gradient?: string
}

/** A dashed "make your own" tile at the start of Yours. */
export type OwnAction = { label: string; does: 'upload' | 'record' | 'new' }

export type DrawerSpec = {
  /** As on the rail button. */
  label: string
  /** What the role does, from the prototype's role hints. */
  hint: string
  search: string
  /** Heading over Yours ("Uploads" in the Figma image drawer). */
  yoursTitle: string
  own: OwnAction[]
  library: LibraryItem[]
}

const gradient = (a: string, b: string, angle: number) => `linear-gradient(${angle}deg, ${a} 14.29%, ${b} 85.71%)`
const chords = (s: string) => s.split(' ').map((c) => c.replace(/([A-G])b/g, '$1♭'))

/** Photos for the instruments' cards (Pexels: 17082397, 15441048, 7095712), in public/instruments. */
export const INSTRUMENT_PHOTOS: Record<string, string> = {
  'Upright piano': '/instruments/piano.jpg',
  'Brushed drums': '/instruments/drums.jpg',
  Strings: '/instruments/strings.jpg',
  'Acoustic guitar': '/instruments/guitar.jpg',
  'Music box': '/instruments/music-box.jpg',
}

export const DRAWERS: Record<Kind, DrawerSpec> = {
  words: {
    label: 'Prompt',
    hint: "Tells the music what it's about and who it's for.",
    search: 'Search prompts',
    yoursTitle: 'Written',
    own: [{ label: 'Write your own', does: 'new' }],
    library: ["for someone's birthday", 'a road-trip singalong', 'something to fall asleep to', 'how a place sounded'].map(
      (text) => ({ name: `“${text}”`, data: { text } }),
    ),
  },
  lyrics: {
    label: 'Lyrics',
    hint: 'Words to be sung, a line or a whole verse.',
    search: 'Search lyrics',
    yoursTitle: 'Written',
    own: [{ label: 'Write your own', does: 'new' }],
    library: [],
  },
  voice: {
    label: 'Record',
    hint: 'A tune to carry: a hum, a whistle, a song you have.',
    search: 'Search recordings',
    yoursTitle: 'Recordings',
    own: [
      { label: 'Record a hum', does: 'record' },
      { label: 'Upload a recording', does: 'upload' },
    ],
    library: (
      [
        ['A simple hum', 12],
        ['Whistled tune', 9],
        ['La-la melody', 14],
        ['Old folk tune', 21],
      ] as const
    ).map(([label, duration]) => ({ name: label, meta: `0:${String(duration).padStart(2, '0')}`, data: { label, duration } })),
  },
  photo: {
    label: 'Image',
    hint: 'How it should feel: a photo, a place, a feeling.',
    search: 'Search images',
    yoursTitle: 'Uploads',
    own: [{ label: 'Upload', does: 'upload' }],
    library: [
      { name: 'A red house', data: { caption: 'A red house', src: redHouse }, img: redHouse },
      { name: 'A lake in the rain', data: { caption: 'A lake in the rain', src: birthday }, img: birthday },
      ...['Old houses, late light', 'Porches in summer', 'Gardens in July', 'Screen doors'].map((caption) => ({
        name: caption,
        data: { caption },
      })),
    ],
  },
  feeling: {
    label: 'Feeling',
    hint: 'How it should feel: a photo, a place, a feeling.',
    search: 'Search feelings',
    yoursTitle: 'Named',
    own: [{ label: 'Name your own', does: 'new' }],
    library: ['Nostalgia', 'Joy', 'Calm', 'Longing', 'Hope', 'Restless'].map((name) => ({
      name,
      data: { name, amount: 0.6 },
    })),
  },
  sound: {
    label: 'Audio',
    hint: 'Sound underneath: rain, a room, a door.',
    search: 'Search sounds',
    yoursTitle: 'Recordings',
    own: [
      { label: 'Record a sound', does: 'record' },
      { label: 'Upload a sound', does: 'upload' },
    ],
    library: (
      [
        ['Rain on the lake', 72],
        ['Screen door, twice', 6],
        ['Kitchen radio', 40],
        ['Crickets at night', 64],
        ['Highway at night', 64],
        ['A busy café', 55],
      ] as const
    ).map(([label, duration]) => ({ name: label, meta: `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`, data: { label, duration } })),
  },
  color: {
    label: 'Colour',
    hint: 'How it should feel: a photo, a place, a feeling.',
    search: 'Search colours',
    yoursTitle: 'Made',
    own: [{ label: 'Make a gradient', does: 'new' }],
    library: [
      { label: 'Soft horizons', gradient: gradient('#ff927c', '#6865db', 135) },
      { label: 'Sea glass', gradient: gradient('#a6e8d2', '#2f6f9a', 160) },
      { label: 'Late summer', gradient: gradient('#f6c26b', '#d9622b', 120) },
      { label: 'Dusk', gradient: gradient('#f3a5b8', '#3b3a72', 200) },
    ].map((c) => ({ name: c.label, data: c, gradient: c.gradient })),
  },
  instrument: {
    label: 'Instrument',
    hint: 'What plays it.',
    search: 'Search instruments',
    yoursTitle: 'Described',
    own: [{ label: 'Describe your own', does: 'new' }],
    library: (
      [
        ['Keyboard', 'Upright piano', 'a bit out of tune'],
        ['Strings', 'Acoustic guitar', 'fingerpicked'],
        ['Strings', 'Strings', 'slow and swelling'],
        ['Keyboard', 'Music box', 'small and bright'],
        ['Drums', 'Brushed drums', 'soft, behind the beat'],
        ['Strings', 'Ukulele', 'a little sunny'],
        ['Voices', 'Choir', 'far away'],
        ['Keyboard', 'Synth pad', 'warm and wide'],
      ] as const
    ).map(([tab, name, detail]) => ({ name, meta: detail, data: { tab, name, detail, ...(INSTRUMENT_PHOTOS[name] && { thumb: INSTRUMENT_PHOTOS[name] }) } })),
  },
  chords: {
    label: 'Chords',
    hint: 'The chords underneath. Pick them by feel, or by name if you know them.',
    search: 'Search chords',
    yoursTitle: 'Yours',
    own: [{ label: 'Tap your own', does: 'new' }],
    library: [
      ['Hopeful lift', 'F C Dm Bb'],
      ['Sad turn', 'Dm Bb F C'],
      ['Old-fashioned', 'F Dm Bb C'],
      ['Jazzy way home', 'Gm7 C7 Fmaj7'],
      ['Simple and bright', 'F Bb C F'],
      ['Bittersweet', 'Fmaj7 Am7 Bbmaj7 Bbm'],
    ].map(([name, c]) => ({ name, meta: chords(c).join(' '), data: { chords: chords(c) } })),
  },
}

/** Things people have kept, ready for any song. Seeded with the Figma examples. */
export type KeptItem = LibraryItem & { id: string; kind: Kind; by?: string }

export const SEED_KEPT: KeptItem[] = [
  { id: 'k-house', kind: 'photo', name: 'The red house, 1997', data: { caption: 'The red house, 1997', src: redHouse }, img: redHouse },
  { id: 'k-garden', kind: 'photo', name: 'Garden in July', data: { caption: 'Garden in July' } },
  { id: 'k-lake', kind: 'photo', name: 'Rain on the lake', data: { caption: 'Rain on the lake', src: birthday }, img: birthday },
  { id: 'k-nana', kind: 'voice', name: 'Nana humming at the sink', meta: '0:47 · Kofi', data: { label: 'Nana humming', duration: 47 }, by: 'Kofi' },
  { id: 'k-80th', kind: 'words', name: "“warm and slow, for Nana's 80th”", data: { text: "warm and slow, for Nana's 80th" } },
  { id: 'k-door', kind: 'sound', name: 'Screen door, twice', meta: '0:06', data: { label: 'Screen door, twice', duration: 6 } },
]

/** The name a node shows, to mark drawer items already in the song. */
export function nameOf(data: Record<string, unknown>): string {
  const v = data.caption ?? data.label ?? data.name ?? data.text
  return typeof v === 'string' ? v : ''
}
