import { interpret } from '@/data/interpret'
import type { AnySongNode, SongNode } from '@/data/nodes'
import type { Bed, Note, Score, Timbre } from './engine'

/** The same "random" every time for the same name, so a card always sounds like itself. */
function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** "Fmaj7" → the notes in it, from the F below middle C. */
export function chordNotes(name: string) {
  const m = /^([A-G])([#♯b♭]?)(.*)$/.exec(name.trim())
  if (!m) return { root: 48, tones: [48, 52, 55], minor: false }
  const root = 48 + PC[m[1]] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0)
  const q = m[3]
  const shape = q.startsWith('maj7')
    ? [0, 4, 7, 11]
    : q.startsWith('m7')
      ? [0, 3, 7, 10]
      : q.startsWith('dim')
        ? [0, 3, 6]
        : q.startsWith('m')
          ? [0, 3, 7]
          : q.startsWith('7')
            ? [0, 4, 7, 10]
            : [0, 4, 7]
  return { root, tones: shape.map((s) => root + s), minor: shape[1] === 3 }
}

/** What's named on an instrument card, as one of the synth's voices. */
export function timbreOf(name: string): Timbre | 'drums' {
  const n = name.toLowerCase()
  if (n.includes('drum')) return 'drums'
  if (n.includes('music box')) return 'musicbox'
  if (n.includes('ukulele')) return 'ukulele'
  if (n.includes('guitar')) return 'guitar'
  if (n.includes('choir') || n.includes('voice')) return 'choir'
  if (n.includes('synth') || n.includes('pad')) return 'pad'
  if (n.includes('string') || n.includes('cello') || n.includes('violin')) return 'strings'
  return 'piano'
}

export type Song = {
  length: number
  chords: string[]
  /** Seconds a chord lasts: one bar of four beats. */
  bar: number
  instruments: Timbre[]
  lead?: Timbre
  seed: string
  drums: 'none' | 'soft' | 'full'
  bass?: boolean
  sounds?: string[]
  /** A and B play the same things differently. */
  variant?: 0 | 1
}

/** A little song: chords played by each instrument, bass, drums, a tune on top and sounds underneath. */
export function songScore(s: Song): Score {
  const notes: Note[] = []
  const add = (t: number, dur: number, midi: number, gain: number, timbre: Timbre) => {
    if (t < s.length) notes.push({ t, dur: Math.min(dur, s.length - t), midi, gain, timbre })
  }
  const beat = s.bar / 4
  const rand = seeded(s.seed)
  const bars = Math.ceil(s.length / s.bar)
  const key = chordNotes(s.chords[0])
  // The tune walks a five-note scale, so nothing it lands on sounds wrong.
  const scale = (key.minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]).map((d) => key.root + 12 + d)
  const ladder = [...scale.map((n) => n - 12), ...scale, ...scale.map((n) => n + 12)]
  let step = 5 + Math.floor(rand() * 3)

  for (let b = 0; b < bars; b++) {
    const t = b * s.bar
    const { root, tones } = chordNotes(s.chords[b % s.chords.length])
    const up = tones.map((n) => n + 12)
    // The last bar of four breathes out: held, quieter.
    const last = b % 4 === 3

    for (const timbre of s.instruments) {
      if (timbre === 'piano') {
        if (s.variant === 1 && !last) [0, 1, 2, 1, 0, 1, 2, 1].forEach((k, i) => add(t + i * beat * 0.5, beat * 0.5, up[k % up.length] + (i === 4 ? 12 : 0), 0.5, 'piano'))
        else {
          up.forEach((n) => add(t, beat * 2, n, 0.42, 'piano'))
          if (!last) up.forEach((n) => add(t + beat * 2, beat * 2, n, 0.34, 'piano'))
        }
      } else if (timbre === 'guitar' || timbre === 'ukulele') {
        const lift = timbre === 'ukulele' ? 12 : 0
        const hits = last ? [0] : s.variant === 1 ? [0, 1.5, 2, 3] : [0, 1, 2, 2.5, 3.5]
        for (const h of hits) [root, ...tones].forEach((n, i) => add(t + h * beat + i * 0.014, beat, n + lift + (i ? 0 : 12), h ? 0.4 : 0.55, timbre))
      } else if (timbre === 'musicbox') {
        const pattern = s.variant === 1 ? [0, 2, 1, 2] : [0, 1, 2, 1]
        pattern.forEach((k, i) => add(t + i * beat, beat, up[k] + 12, 0.5, 'musicbox'))
      } else {
        // Strings, a pad or a choir hold the chord.
        up.forEach((n, i) => add(t, s.bar * 0.96, n - (timbre === 'pad' && i === 0 ? 12 : 0), timbre === 'choir' ? 0.5 : 0.6, timbre))
      }
    }

    if (s.bass) {
      add(t, beat * 2, root - 12, 0.8, 'bass')
      if (!last) add(t + beat * 2, beat * 2, (s.variant === 1 ? root + 7 : root) - 12, 0.7, 'bass')
    }

    if (s.drums !== 'none') {
      for (let i = 0; i < 4; i++) {
        const at = t + i * beat
        if (i === 0 || (s.drums === 'full' && i === 2)) add(at, 0.3, 36, 0.8, 'kick')
        if (i % 2 === 1) add(at, 0.25, 60, 0.7, s.drums === 'full' ? 'snare' : 'brush')
        if (s.drums === 'full') [0, 0.5].forEach((h) => add(at + h * beat, 0.05, 60, h ? 0.5 : 0.8, 'hat'))
      }
    }

    if (s.lead) {
      // A phrase per bar, landing on a note of the chord.
      const rhythms = last
        ? [[[0, 3]]]
        : [
            [[0, 1], [1, 1], [2, 2]],
            [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]],
            [[0, 2], [2, 1], [3, 1]],
            [[0.5, 0.5], [1, 1], [2, 1.5]],
          ]
      const rhythm = rhythms[Math.floor(rand() * rhythms.length)]
      rhythm.forEach(([at, len], i) => {
        if (i === 0) {
          // Find the nearest chord note to where the tune is.
          const target = ladder.reduce((best, n, k) => (up.some((c) => (c - n) % 12 === 0) && Math.abs(k - step) < Math.abs(best - step) ? k : best), step)
          step = target
        } else step = Math.min(ladder.length - 2, Math.max(1, step + Math.round((rand() - 0.5) * 3)))
        add(t + at * beat, len * beat * 0.92, ladder[step], last ? 0.7 : 0.85, s.lead!)
      })
    }
  }

  const beds: Bed[] = []
  for (const sound of s.sounds ?? []) {
    const texture = soundScore(sound, s.length, 0.5)
    notes.push(...texture.notes)
    beds.push(...texture.beds)
  }
  return { length: s.length, notes, beds }
}

/** A recorded sound, made from what it's called: rain, crickets, a café, a door. */
export function soundScore(label: string, length: number, level = 1, file?: string): Score {
  if (file) return { length, notes: [], beds: [], file }
  const l = label.toLowerCase()
  const rand = seeded(label)
  const notes: Note[] = []
  const beds: Bed[] = []
  const every = (gap: number, make: (t: number) => void) => {
    for (let t = rand() * gap; t < length - 0.2; t += gap * (0.4 + rand() * 1.2)) make(t)
  }
  if (/rain|storm|shower|lake|water/.test(l)) {
    beds.push({ t: 0, dur: length, gain: 0.35 * level, kind: 'rain' })
    every(0.09, (t) => notes.push({ t, dur: 0.04, midi: 1500 + rand() * 3500, gain: (0.2 + rand() * 0.5) * level, timbre: 'drop' }))
  } else if (/highway|road|car|traffic|train/.test(l)) {
    beds.push({ t: 0, dur: length, gain: 0.55 * level, kind: 'road' })
  } else if (/cricket|night|frog|summer/.test(l)) {
    beds.push({ t: 0, dur: length, gain: 0.18 * level, kind: 'night' })
    every(0.7, (t) => notes.push({ t, dur: 0.16, midi: 4200 + rand() * 600, gain: (0.6 + rand() * 0.4) * level, timbre: 'chirp' }))
  } else if (/caf|restaurant|crowd|party|room/.test(l)) {
    beds.push({ t: 0, dur: length, gain: 0.3 * level, kind: 'room' })
    every(1.6, (t) => notes.push({ t, dur: 0.4, midi: 2400 + rand() * 1800, gain: level, timbre: 'clink' }))
  } else if (/radio|tv|record/.test(l)) {
    beds.push({ t: 0, dur: length, gain: 0.08 * level, kind: 'radio' })
    const tune = songScore({ length, chords: ['C', 'Am', 'F', 'G'], bar: 2.2, instruments: ['piano'], lead: 'hum', seed: label, drums: 'soft' })
    notes.push(...tune.notes.map((n) => ({ ...n, gain: n.gain * 0.35 * level })))
  } else if (/door|knock|step|foot/.test(l)) {
    const times = /twice/.test(l) ? [0.3, Math.min(length - 1, 2.6)] : [0.3]
    for (const t of times) {
      notes.push({ t, dur: 0.6, midi: 0, gain: 0.7 * level, timbre: 'creak' })
      notes.push({ t: t + 0.75, dur: 0.3, midi: 0, gain: level, timbre: 'thud' })
    }
    beds.push({ t: 0, dur: length, gain: 0.06 * level, kind: 'air' })
  } else {
    beds.push({ t: 0, dur: length, gain: 0.25 * level, kind: 'air' })
  }
  return { length, notes, beds }
}

/** A hum, a whistle, a la-la: a tune on its own, from what it's called. */
export function voiceScore(label: string, length: number, file?: string): Score {
  if (file) return { length, notes: [], beds: [], file }
  const l = label.toLowerCase()
  const folk = /folk|old/.test(l)
  return songScore({
    length,
    chords: folk ? ['Am', 'G', 'F', 'E'] : ['F', 'Dm', 'Bb', 'C'],
    bar: /la-la|whistl/.test(l) ? 2 : 2.6,
    instruments: [],
    lead: /whistl/.test(l) ? 'whistle' : 'hum',
    seed: label,
    drums: 'none',
  })
}

/** Chords, a beat-and-a-bit each, on a piano with a pad behind it. */
export function chordsScore(chords: string[]): Score {
  return songScore({ length: chords.length * 1.2, chords, bar: 1.2, instruments: ['piano', 'pad'], seed: chords.join(), drums: 'none', bass: true })
}

/** A few bars, to hear what an instrument sounds like. */
export function instrumentScore(name: string): Score {
  const t = timbreOf(name)
  return songScore({
    length: 4.8,
    chords: ['C', 'Am', 'F', 'G'],
    bar: 1.2,
    instruments: t === 'drums' ? [] : [t],
    seed: name,
    drums: t === 'drums' ? 'soft' : 'none',
    bass: t === 'drums',
  })
}

const FEELING_LIFT: [RegExp, number][] = [
  [/joy|happy|hope|bright|excite/i, 0.15],
  [/restless|angry|wild/i, 0.25],
  [/calm|longing|nostalgia|sad|tired|peace/i, -0.12],
]
const HOMES = [
  ['F', 'C', 'Dm', 'Bb'],
  ['Dm', 'Bb', 'F', 'C'],
  ['C', 'Am', 'F', 'G'],
  ['Am', 'F', 'C', 'G'],
]

/**
 * What a take sounds like, from what's plugged into its section: the chords
 * card's chords, the instruments named, a hum for the tune, sounds underneath,
 * livelier for a lively part. A and B are two ways of playing the same things.
 */
export function takeScore(nodes: AnySongNode[], take: SongNode<'take'>): Score {
  const section = nodes.find((n): n is SongNode<'section'> => n.id === take.data.sectionId && n.type === 'section')
  const feeding = (role: string) =>
    (section?.data.sources[role as keyof typeof section.data.sources] ?? []).flatMap((id) => nodes.filter((n) => n.id === id))
  const all = Object.keys(section?.data.sources ?? {}).flatMap(feeding)
  const of = <K extends AnySongNode['type']>(type: K) => all.filter((n): n is Extract<AnySongNode, { type: K }> => n.type === type)
  const variant = take.data.version === 'B' ? 1 : 0
  const rand = seeded(take.id)

  const intent = of('words')[0]
  let energy = section?.data.energy ?? (intent ? interpret(intent).energy : 0.45)
  for (const f of of('feeling')) energy += (FEELING_LIFT.find(([re]) => re.test(f.data.name))?.[1] ?? 0) * f.data.amount
  energy = Math.min(1, Math.max(0, energy))

  const chords = of('chords')[0]?.data.chords ?? HOMES[(Math.floor(rand() * 2) * 2 + variant) % HOMES.length]
  const named = of('instrument').map((n) => timbreOf(n.data.name))
  const drumsNamed = named.includes('drums')
  const instruments = named.filter((t): t is Timbre => t !== 'drums')
  const voice = of('voice')[0]
  const sings = !!voice || of('lyrics').length > 0 || (section?.data.vocals ?? 'none') !== 'none'
  const bpm = (64 + energy * 60) * (variant ? 1.05 : 1)

  return songScore({
    length: take.data.length,
    chords,
    bar: (60 / bpm) * 4,
    instruments: instruments.length ? instruments : variant ? ['guitar', 'strings'] : ['piano', 'pad'],
    lead: sings ? (voice && /whistl/i.test(voice.data.label) ? 'whistle' : 'hum') : instruments.length ? undefined : variant ? undefined : 'musicbox',
    seed: `${voice?.data.label ?? ''}${take.id}`,
    drums: energy > 0.6 ? 'full' : energy > 0.35 || drumsNamed ? 'soft' : 'none',
    bass: true,
    sounds: of('sound').map((n) => n.data.label),
    variant,
  })
}
