import redHouse from '@/assets/photos/template-photo.jpg'
import type { AnySongNode } from './nodes'

/** Nodes are centred on their position, like everything added on the canvas. */
const at = (node: Omit<AnySongNode, 'origin'>) => ({ ...node, origin: [0.5, 0.5] }) as AnySongNode

/**
 * What's inside the sample songs, matching their workspace thumbnails.
 * Nana's house is the Figma "Ready to make" mockup: six things plugged into a
 * Verse, with its takes made.
 */
export const SEED_CANVASES: Record<string, AnySongNode[]> = {
  's-nanas-house': [
    at({ id: 'nh-words', type: 'words', position: { x: 255, y: 150 }, data: { text: "warm and slow, for Nana's 80th. the summers at her house" } }),
    at({ id: 'nh-voice', type: 'voice', position: { x: 261, y: 275 }, data: { label: 'Nana humming', duration: 47 } }),
    at({ id: 'nh-feeling', type: 'feeling', position: { x: 240, y: 371 }, data: { name: 'Nostalgia', amount: 0.7 } }),
    at({ id: 'nh-photo', type: 'photo', position: { x: 540, y: 508 }, data: { caption: 'The red house, 1997', src: redHouse } }),
    at({ id: 'nh-sound', type: 'sound', position: { x: 261, y: 683 }, data: { label: 'Rain on the lake', duration: 72 } }),
    at({ id: 'nh-piano', type: 'instrument', position: { x: 265, y: 795 }, data: { tab: 'Keyboard', name: 'Upright piano', detail: 'a bit out of tune' } }),
    at({
      id: 'nh-verse',
      type: 'section',
      position: { x: 975, y: 330 },
      data: {
        name: 'Verse',
        length: 30,
        sources: {
          intent: ['nh-words'],
          melody: ['nh-voice'],
          mood: ['nh-feeling'],
          harmony: ['nh-photo'],
          texture: ['nh-sound'],
          instruments: ['nh-piano'],
        },
      },
    }),
    at({ id: 'nh-take', type: 'take', position: { x: 1300, y: 290 }, data: { sectionId: 'nh-verse', state: 'done', version: 'B', length: 30 } }),
  ],
  // Still gathering: four things brought in, nothing plugged in yet.
  's-road-trip': [
    at({ id: 'rt-words', type: 'words', position: { x: 0, y: 0 }, data: { text: 'windows down, nowhere to be' } }),
    at({ id: 'rt-sound', type: 'sound', position: { x: 380, y: -10 }, data: { label: 'Highway at night', duration: 64 } }),
    at({ id: 'rt-voice', type: 'voice', position: { x: 0, y: 170 }, data: { label: 'Ada singing along', duration: 32 } }),
    at({ id: 'rt-guitar', type: 'instrument', position: { x: 380, y: 170 }, data: { tab: 'Strings', name: 'Acoustic guitar', detail: 'fingerpicked' } }),
  ],
  's-lullaby': [
    at({ id: 'lj-words', type: 'words', position: { x: 0, y: -170 }, data: { text: 'something to fall asleep to, for Juno' } }),
    at({ id: 'lj-sound', type: 'sound', position: { x: 6, y: -20 }, data: { label: 'Crickets at night', duration: 64 } }),
    at({ id: 'lj-feeling', type: 'feeling', position: { x: -15, y: 90 }, data: { name: 'Calm', amount: 0.4 } }),
    at({
      id: 'lj-verse',
      type: 'section',
      position: { x: 470, y: -40 },
      data: { name: 'Verse', length: 30, sources: { intent: ['lj-words'], texture: ['lj-sound'], mood: ['lj-feeling'] } },
    }),
    at({ id: 'lj-take', type: 'take', position: { x: 800, y: -80 }, data: { sectionId: 'lj-verse', state: 'done', version: 'A', length: 30 } }),
  ],
}
