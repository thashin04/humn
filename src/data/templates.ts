import birthday from '@/assets/photos/template-birthday.jpg'
import redHouse from '@/assets/photos/template-photo.jpg'
import roadTrip from '@/assets/photos/template-roadtrip.png'
import graduation from '@/assets/photos/template-graduation.jpg'
import lateNight from '@/assets/photos/template-latenight.jpg'
import summer from '@/assets/photos/template-summer.jpg'
import type { AnySongNode, Role } from './nodes'

export type TemplateId = 'roadtrip' | 'childhood' | 'anniversary' | 'summer' | 'latenight' | 'graduation'

export type Template = {
  id: TemplateId
  name: string
  /** What it's made of, as on the card ("photo + feeling + words"). */
  ingredients: string
  description: string
  image: string
}

export const templates: Template[] = [
  {
    id: 'roadtrip',
    name: 'Road trip singalong',
    ingredients: 'place + feeling + a voice',
    description: 'Turn the road, the people, and the little moments into something you can play back together.',
    image: roadTrip,
  },
  {
    id: 'childhood',
    name: 'Childhood memories',
    ingredients: 'place + feeling + words',
    description: 'Start with a place from back then and follow the feeling it still brings up now.',
    image: redHouse,
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    ingredients: 'words + photo + a voice',
    description: 'Make a warm, personal song about the years you have chosen each other.',
    image: birthday,
  },
  {
    id: 'summer',
    name: 'Last summer together',
    ingredients: 'words + feeling + a sound',
    description: 'Gather the jokes, the heat, and the noise of the summer you all keep talking about.',
    image: summer,
  },
  {
    id: 'graduation',
    name: 'Graduation day',
    ingredients: 'words + feeling + a voice',
    description: 'Mark the end of one chapter and the start of the next, with the people who got you there.',
    image: graduation,
  },
  {
    id: 'latenight',
    name: 'Late-night talks',
    ingredients: 'words + colour + a voice',
    description: 'For the conversations that only happen after midnight, slow and a little honest.',
    image: lateNight,
  },
]

type InputSeed = { id: string; node: Omit<AnySongNode, 'id' | 'origin'> }
type SectionSeed = {
  id: string
  name: string
  title: string
  length: number
  position: { x: number; y: number }
  sources: { input: string; role: Role }[]
  take: { version: 'A' | 'B'; length: number; position: { x: number; y: number } }
}
type TemplateDefinition = { inputs: InputSeed[]; sections: SectionSeed[] }

/**
 * The complete canvas recipe for each story starter. Inputs remain ordinary
 * cards; sections remain the source of truth for connections; takes remain
 * ordinary playable take nodes. Only the recipe is template-specific.
 */
const DEFINITIONS: Record<TemplateId, TemplateDefinition> = {
  roadtrip: {
    inputs: [
      { id: 'sunset', node: { type: 'photo', position: { x: 0, y: -180 }, data: { caption: 'Scenic highway at sunset', src: roadTrip } } },
      { id: 'sunset-colour', node: { type: 'color', position: { x: 0, y: 30 }, data: { label: 'Warm sunset', gradient: 'linear-gradient(135deg, #d47c52 10%, #f4c47b 52%, #768ea3 100%)' } } },
      { id: 'guitar-intro', node: { type: 'instrument', position: { x: 0, y: 190 }, data: { tab: 'Strings', name: 'Acoustic guitar', detail: 'warm, open voicings' } } },
      { id: 'carefree', node: { type: 'feeling', position: { x: 0, y: 550 }, data: { name: 'Carefree adventure', amount: 0.78 } } },
      { id: 'road-sounds', node: { type: 'sound', position: { x: 0, y: 710 }, data: { label: 'Wind through open windows', duration: 18 } } },
      { id: 'road-drums', node: { type: 'instrument', position: { x: 0, y: 870 }, data: { tab: 'Percussion', name: 'Roadside drums', detail: 'bright and driving' } } },
    ],
    sections: [
      {
        id: 'open-road', name: 'Intro', title: 'The Open Road', length: 15, position: { x: 470, y: 0 },
        sources: [
          { input: 'sunset', role: 'mood' },
          { input: 'sunset-colour', role: 'mood' },
          { input: 'guitar-intro', role: 'instruments' },
        ],
        take: { version: 'A', length: 15, position: { x: 875, y: -40 } },
      },
      {
        id: 'windows-down', name: 'Chorus', title: 'Windows Down', length: 30, position: { x: 470, y: 650 },
        sources: [
          { input: 'carefree', role: 'mood' },
          { input: 'road-sounds', role: 'texture' },
          { input: 'road-drums', role: 'instruments' },
        ],
        take: { version: 'A', length: 30, position: { x: 875, y: 610 } },
      },
    ],
  },
  childhood: {
    inputs: [
      { id: 'playground', node: { type: 'photo', position: { x: 0, y: -180 }, data: { caption: 'The red house, 1997', src: redHouse } } },
      { id: 'golden-colour', node: { type: 'color', position: { x: 0, y: 30 }, data: { label: 'Soft golden light', gradient: 'linear-gradient(135deg, #e6be73 8%, #f4dfab 55%, #a9a57e 100%)' } } },
      { id: 'music-box', node: { type: 'instrument', position: { x: 0, y: 190 }, data: { tab: 'Keys', name: 'Music box', detail: 'small, bright notes' } } },
      { id: 'memory-voice', node: { type: 'voice', position: { x: 0, y: 550 }, data: { label: 'A memory, spoken softly', duration: 24 } } },
      { id: 'bittersweet', node: { type: 'feeling', position: { x: 0, y: 710 }, data: { name: 'Bittersweet nostalgia', amount: 0.62 } } },
      { id: 'gentle-piano', node: { type: 'instrument', position: { x: 0, y: 870 }, data: { tab: 'Keys', name: 'Gentle piano', detail: 'slow and reflective' } } },
    ],
    sections: [
      {
        id: 'back-then', name: 'Intro', title: 'Back Then', length: 15, position: { x: 470, y: 0 },
        sources: [
          { input: 'playground', role: 'mood' },
          { input: 'golden-colour', role: 'mood' },
          { input: 'music-box', role: 'instruments' },
        ],
        take: { version: 'A', length: 15, position: { x: 875, y: -40 } },
      },
      {
        id: 'little-moments', name: 'Verse', title: 'Little Moments', length: 30, position: { x: 470, y: 650 },
        sources: [
          { input: 'memory-voice', role: 'melody' },
          { input: 'bittersweet', role: 'mood' },
          { input: 'gentle-piano', role: 'instruments' },
        ],
        take: { version: 'A', length: 30, position: { x: 875, y: 610 } },
      },
    ],
  },
  anniversary: {
    inputs: [
      { id: 'shared-memory', node: { type: 'photo', position: { x: 0, y: -180 }, data: { caption: 'A shared memory', src: birthday } } },
      { id: 'warm-romance', node: { type: 'feeling', position: { x: 0, y: 30 }, data: { name: 'Warm and romantic', amount: 0.72 } } },
      { id: 'soft-piano', node: { type: 'instrument', position: { x: 0, y: 190 }, data: { tab: 'Keys', name: 'Soft piano', detail: 'close and intimate' } } },
      { id: 'personal-message', node: { type: 'voice', position: { x: 0, y: 550 }, data: { label: 'A note for us', duration: 26 } } },
      { id: 'rose-colour', node: { type: 'color', position: { x: 0, y: 710 }, data: { label: 'Soft rose', gradient: 'linear-gradient(135deg, #b86f7d 6%, #f0c7c4 52%, #f4e6d8 100%)' } } },
      { id: 'acoustic-guitar', node: { type: 'instrument', position: { x: 0, y: 870 }, data: { tab: 'Strings', name: 'Acoustic guitar', detail: 'warm and uplifting' } } },
    ],
    sections: [
      {
        id: 'how-we-met', name: 'Verse', title: 'How We Met', length: 30, position: { x: 470, y: 0 },
        sources: [
          { input: 'shared-memory', role: 'mood' },
          { input: 'warm-romance', role: 'mood' },
          { input: 'soft-piano', role: 'instruments' },
        ],
        take: { version: 'A', length: 30, position: { x: 875, y: -40 } },
      },
      {
        id: 'still-us', name: 'Chorus', title: 'Still Us', length: 30, position: { x: 470, y: 650 },
        sources: [
          { input: 'personal-message', role: 'melody' },
          { input: 'rose-colour', role: 'mood' },
          { input: 'acoustic-guitar', role: 'instruments' },
        ],
        take: { version: 'A', length: 30, position: { x: 875, y: 610 } },
      },
    ],
  },
  summer: {
    inputs: [
      { id: 'summer-words', node: { type: 'words', position: { x: 0, y: -180 }, data: { text: 'Sticky afternoons, everyone on the roof' } } },
      { id: 'summer-colour', node: { type: 'color', position: { x: 0, y: 30 }, data: { label: 'Late sun', gradient: 'linear-gradient(135deg, #f2a65a 0%, #f6d27a 48%, #8cc7c1 100%)' } } },
      { id: 'summer-ukulele', node: { type: 'instrument', position: { x: 0, y: 190 }, data: { tab: 'Strings', name: 'Ukulele', detail: 'light and bouncy' } } },
      { id: 'summer-joy', node: { type: 'feeling', position: { x: 0, y: 550 }, data: { name: 'Easy joy', amount: 0.84 } } },
      { id: 'summer-sounds', node: { type: 'sound', position: { x: 0, y: 710 }, data: { label: 'Friends laughing by the pool', duration: 16 } } },
      { id: 'summer-claps', node: { type: 'instrument', position: { x: 0, y: 870 }, data: { tab: 'Percussion', name: 'Hand claps', detail: 'loose and together' } } },
    ],
    sections: [
      {
        id: 'first-week', name: 'Intro', title: 'The First Week', length: 15, position: { x: 470, y: 0 },
        sources: [
          { input: 'summer-words', role: 'intent' },
          { input: 'summer-colour', role: 'mood' },
          { input: 'summer-ukulele', role: 'instruments' },
        ],
        take: { version: 'A', length: 15, position: { x: 875, y: -40 } },
      },
      {
        id: 'all-of-us', name: 'Chorus', title: 'All of Us', length: 30, position: { x: 470, y: 650 },
        sources: [
          { input: 'summer-joy', role: 'mood' },
          { input: 'summer-sounds', role: 'texture' },
          { input: 'summer-claps', role: 'instruments' },
        ],
        take: { version: 'A', length: 30, position: { x: 875, y: 610 } },
      },
    ],
  },
  latenight: {
    inputs: [
      { id: 'night-words', node: { type: 'words', position: { x: 0, y: -180 }, data: { text: 'Still talking at 2am' } } },
      { id: 'night-colour', node: { type: 'color', position: { x: 0, y: 30 }, data: { label: 'Midnight blue', gradient: 'linear-gradient(135deg, #1f2a4a 0%, #4b4f86 52%, #b58bb0 100%)' } } },
      { id: 'night-keys', node: { type: 'instrument', position: { x: 0, y: 190 }, data: { tab: 'Keys', name: 'Soft electric piano', detail: 'hazy and warm' } } },
      { id: 'night-voice', node: { type: 'voice', position: { x: 0, y: 550 }, data: { label: 'Something we said', duration: 22 } } },
      { id: 'night-feeling', node: { type: 'feeling', position: { x: 0, y: 710 }, data: { name: 'Quiet and close', amount: 0.36 } } },
      { id: 'night-rain', node: { type: 'sound', position: { x: 0, y: 870 }, data: { label: 'Rain on the window', duration: 20 } } },
    ],
    sections: [
      {
        id: 'after-midnight', name: 'Intro', title: 'After Midnight', length: 15, position: { x: 470, y: 0 },
        sources: [
          { input: 'night-words', role: 'intent' },
          { input: 'night-colour', role: 'mood' },
          { input: 'night-keys', role: 'instruments' },
        ],
        take: { version: 'A', length: 15, position: { x: 875, y: -40 } },
      },
      {
        id: 'honest-part', name: 'Verse', title: 'The Honest Part', length: 30, position: { x: 470, y: 650 },
        sources: [
          { input: 'night-voice', role: 'melody' },
          { input: 'night-feeling', role: 'mood' },
          { input: 'night-rain', role: 'texture' },
        ],
        take: { version: 'A', length: 30, position: { x: 875, y: 610 } },
      },
    ],
  },
  graduation: {
    inputs: [
      { id: 'grad-words', node: { type: 'words', position: { x: 0, y: -180 }, data: { text: 'We actually made it' } } },
      { id: 'grad-feeling', node: { type: 'feeling', position: { x: 0, y: 30 }, data: { name: 'Proud and a little scared', amount: 0.68 } } },
      { id: 'grad-strings', node: { type: 'instrument', position: { x: 0, y: 190 }, data: { tab: 'Strings', name: 'Swelling strings', detail: 'big and hopeful' } } },
      { id: 'grad-voice', node: { type: 'voice', position: { x: 0, y: 550 }, data: { label: 'A thank-you to the group', duration: 25 } } },
      { id: 'grad-colour', node: { type: 'color', position: { x: 0, y: 710 }, data: { label: 'Fresh green', gradient: 'linear-gradient(135deg, #6f8f72 0%, #c9d6a3 50%, #f3ead2 100%)' } } },
      { id: 'grad-drums', node: { type: 'instrument', position: { x: 0, y: 870 }, data: { tab: 'Percussion', name: 'Marching drums', detail: 'steady and building' } } },
    ],
    sections: [
      {
        id: 'last-day', name: 'Verse', title: 'The Last Day', length: 30, position: { x: 470, y: 0 },
        sources: [
          { input: 'grad-words', role: 'intent' },
          { input: 'grad-feeling', role: 'mood' },
          { input: 'grad-strings', role: 'instruments' },
        ],
        take: { version: 'A', length: 30, position: { x: 875, y: -40 } },
      },
      {
        id: 'whats-next', name: 'Chorus', title: 'What’s Next', length: 30, position: { x: 470, y: 650 },
        sources: [
          { input: 'grad-voice', role: 'melody' },
          { input: 'grad-colour', role: 'mood' },
          { input: 'grad-drums', role: 'instruments' },
        ],
        take: { version: 'A', length: 30, position: { x: 875, y: 610 } },
      },
    ],
  },
}

/** Fresh nodes for a template, with remapped IDs and all sections/takes connected. */
export function templateNodes(id: TemplateId, prefix: string): AnySongNode[] {
  const definition = DEFINITIONS[id]
  const inputIds = new Map(definition.inputs.map((input) => [input.id, `${prefix}-${input.id}`]))
  const nodes = definition.inputs.map((input) => ({
    ...structuredClone(input.node),
    id: inputIds.get(input.id),
    origin: [0.5, 0.5],
  }) as AnySongNode)

  const sections = definition.sections.flatMap((seed) => {
    const sectionId = `${prefix}-${seed.id}`
    const sources: Partial<Record<Role, string[]>> = {}
    for (const source of seed.sources) {
      const inputId = inputIds.get(source.input)
      if (inputId) (sources[source.role] ??= []).push(inputId)
    }
    const section = {
      id: sectionId,
      type: 'section',
      position: seed.position,
      origin: [0.5, 0.5],
      data: { name: seed.name, title: seed.title, length: seed.length, sources },
    } as AnySongNode
    // Both ideas, proposed, one above the other; nothing is in the song until someone adds it.
    const takes = (['A', 'B'] as const).map(
      (version, i) =>
        ({
          id: `${prefix}-${seed.id}-take${i ? '-b' : ''}`,
          type: 'take',
          position: { x: seed.take.position.x, y: seed.take.position.y - 100 + i * 200 },
          origin: [0.5, 0.5],
          data: { sectionId, state: 'done', version, length: seed.take.length },
        }) as AnySongNode,
    )
    return [section, ...takes]
  })

  return [...nodes, ...sections]
}
