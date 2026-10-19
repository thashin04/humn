/** The parts of a song, and what each is for, in plain words. */
export const PARTS = [
  { name: 'Intro', hint: 'Set the scene.' },
  { name: 'Verse', hint: 'Develop the story in this part.' },
  { name: 'Chorus', hint: 'The part everyone remembers.' },
  { name: 'Bridge', hint: 'Somewhere new before coming back.' },
  { name: 'Outro', hint: 'Let it settle.' },
]

/** How long a part runs, kept in seconds; 15 s is 8 bars of 4/4 at 128 beats a minute. */
export const LENGTHS = [15, 30, 45, 60]

/** Musicians count a part in bars, not seconds: a bar of 4/4 at 128 bpm is 1.875 s. */
const BAR_SECONDS = 1.875
export const bars = (seconds: number) => {
  const n = Math.round(seconds / BAR_SECONDS)
  return `${n} ${n === 1 ? 'bar' : 'bars'}`
}
