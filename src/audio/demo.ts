/**
 * The demo's sound (demo branch): the songs made for the humn demo video, played
 * in place of the synth so the prototype sounds like the video. A part's takes
 * are the video's verse (a hum's phrase, then an upright piano and brushes) or
 * its chorus; a take with Strings plugged in, or a Strings track in the timeline,
 * adds the video's strings; a voice card is a real person humming.
 */
const DIR = '/audio/demo'

/** Every file runs this long (a minute and a bit), so any take or song length is covered. */
export const DEMO_LENGTH = 62

/** The hum recorded in the demo (a real person, about three seconds). */
export const HUM = { src: `${DIR}/your-hum.mp3`, duration: 3 }

/** The Strings track's own part, in time with the verse takes. */
export const STRINGS_TRACK = `${DIR}/strings.mp3`

/** What a take plays: its part's song (the chorus, or the verse for anything else), A or B, with Strings if they're in it. */
export function takeFile(part: string, version: 'A' | 'B', withStrings: boolean) {
  if (/chorus/i.test(part)) return `${DIR}/chorus-${version.toLowerCase()}.mp3`
  if (withStrings) return `${DIR}/verse-a-strings.mp3`
  return `${DIR}/verse-${version.toLowerCase()}.mp3`
}
