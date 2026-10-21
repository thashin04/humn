import lateNight from '@/assets/photos/template-latenight.jpg'
import summer from '@/assets/photos/template-summer.jpg'
import type { LibraryItem } from './library'
import type { Kind } from './nodes'

const gradient = (a: string, b: string, angle: number) => `linear-gradient(${angle}deg, ${a} 14.29%, ${b} 85.71%)`

/**
 * The Generate tab, written ahead: the prototype has no model behind it, so
 * each kind has a prompt that types itself in and the two things it "makes".
 */
export const GENERATED: Record<Kind, { prompt: string; made: LibraryItem[] }> = {
  words: {
    prompt: 'a song for my sister, the week she moves away',
    made: [
      { name: '“for my sister, the week she moves away”', data: { text: 'for my sister, the week she moves away' } },
      { name: '“boxes in the hall, and all the songs we shared”', data: { text: 'boxes in the hall, and all the songs we shared' } },
    ],
  },
  lyrics: {
    prompt: "the porch light at nana's, summer nights",
    made: [
      {
        name: 'Porch light',
        meta: '4 lines',
        data: { text: "Porch light's on, the moths know the way\nScreen door hums what you didn't say\nLemonade sweating on the rail\nSummer nights that never go stale" },
      },
      {
        name: "Nana's yard",
        meta: '4 lines',
        data: { text: "Crickets keep time in Nana's yard\nStars come out, but not too hard\nShe hums a tune she won't explain\nI hum it back, again, again" },
      },
    ],
  },
  voice: {
    prompt: 'a slow, low hum, like someone half asleep',
    made: [
      { name: 'Slow, low hum', meta: '0:14', data: { label: 'Slow, low hum', duration: 14 } },
      { name: 'Hum that drifts up', meta: '0:11', data: { label: 'Hum that drifts up', duration: 11 } },
    ],
  },
  photo: {
    prompt: 'an old kitchen in late afternoon light',
    made: [
      { name: 'Late light, open window', data: { caption: 'Late light, open window', src: summer }, img: summer },
      { name: 'The kitchen after dark', data: { caption: 'The kitchen after dark', src: lateNight }, img: lateNight },
    ],
  },
  feeling: {
    prompt: 'when the car goes quiet on the drive home',
    made: [
      { name: 'Quiet wonder', data: { name: 'Quiet wonder', amount: 0.7 } },
      { name: 'Bittersweet', data: { name: 'Bittersweet', amount: 0.6 } },
    ],
  },
  sound: {
    prompt: 'rain on a tin roof, thunder far away',
    made: [
      { name: 'Rain on a tin roof', meta: '0:48', data: { label: 'Rain on a tin roof', duration: 48 } },
      { name: 'Night rain, window open', meta: '1:00', data: { label: 'Night rain, window open', duration: 60 } },
    ],
  },
  color: {
    prompt: 'the sky right after a summer storm',
    made: [
      { label: 'After the storm', gradient: gradient('#9fc3e6', '#f2b9a0', 150) },
      { label: 'Wet pavement', gradient: gradient('#b8c0c8', '#4b5a6e', 190) },
    ].map((c) => ({ name: c.label, data: c, gradient: c.gradient })),
  },
  instrument: {
    prompt: 'something warm and a little old, like a record',
    made: [
      { name: 'Old electric piano', meta: 'warm, a little worn', data: { tab: 'Keyboard', name: 'Old electric piano', detail: 'warm, a little worn' } },
      { name: 'Nylon guitar', meta: 'soft and close', data: { tab: 'Strings', name: 'Nylon guitar', detail: 'soft and close' } },
    ],
  },
  chords: {
    prompt: 'hopeful, but with a little ache in it',
    made: [
      { name: 'Hope with an ache', meta: 'F Am B♭ B♭m', data: { chords: ['F', 'Am', 'B♭', 'B♭m'] } },
      { name: 'Lifting slowly', meta: 'C G Am F', data: { chords: ['C', 'G', 'Am', 'F'] } },
    ],
  },
}
