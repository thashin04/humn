import type { Effect } from '@/data/clips'

/**
 * The prototype's sound. Nothing is recorded: every card, take and clip is
 * played by a small synth in the browser, made from what's plugged in, so
 * there's something to hear without real audio files.
 */

export type Timbre =
  | 'piano'
  | 'guitar'
  | 'ukulele'
  | 'strings'
  | 'musicbox'
  | 'choir'
  | 'pad'
  | 'hum'
  | 'whistle'
  | 'bass'
  | 'kick'
  | 'snare'
  | 'brush'
  | 'hat'
  // Bits of the world, for sounds.
  | 'drop'
  | 'chirp'
  | 'clink'
  | 'creak'
  | 'thud'

/** One sound at `t` seconds in. `midi` is the pitch (60 is middle C), or hertz for a drop, chirp or clink. */
export type Note = { t: number; dur: number; midi: number; gain: number; timbre: Timbre }
/** A steady wash underneath: rain, a road, a room. */
export type Bed = { t: number; dur: number; gain: number; kind: BedKind }
export type BedKind = 'rain' | 'road' | 'room' | 'radio' | 'night' | 'air'
/** Something to play: notes, washes, or a real file someone uploaded. */
export type Score = { length: number; notes: Note[]; beds: Bed[]; file?: string }

/** How a score is played: louder, faster, higher, through an effect. As on a clip. */
export type Mix = {
  volume?: number
  speed?: number
  pitch?: number
  effect?: Effect
  strength?: number
  fadeIn?: number
  fadeOut?: number
}
/** A score placed at `at` seconds, playing `length` seconds of it from `start`. */
export type Part = { score: Score; at: number; start: number; length: number; mix?: Mix }

let ctx: AudioContext | null = null
let master: AudioNode | null = null
const noise: Partial<Record<'white' | 'pink' | 'brown', AudioBuffer>> = {}

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 4
    const out = ctx.createGain()
    out.gain.value = 0.8
    comp.connect(out).connect(ctx.destination)
    master = comp
  }
  void ctx.resume()
  return { ctx, master: master! }
}

function noiseBuffer(ctx: AudioContext, colour: 'white' | 'pink' | 'brown') {
  const made = noise[colour]
  if (made) return made
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
  const d = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, last = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    if (colour === 'white') d[i] = w
    else if (colour === 'pink') {
      b0 = 0.997 * b0 + w * 0.029591
      b1 = 0.985 * b1 + w * 0.032534
      b2 = 0.95 * b2 + w * 0.048056
      d[i] = (b0 + b1 + b2 + w * 0.05) * 2.2
    } else {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    }
  }
  noise[colour] = buffer
  return buffer
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/** What one play needs to put sounds out and take them back. */
type Out = { ctx: AudioContext; keep: (n: AudioScheduledSourceNode) => void }

function osc({ ctx, keep }: Out, type: OscillatorType, f: number, when: number, end: number) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f, when)
  o.start(when)
  o.stop(end)
  keep(o)
  return o
}
function burst({ ctx, keep }: Out, colour: 'white' | 'pink' | 'brown', when: number, end: number) {
  const s = ctx.createBufferSource()
  s.buffer = noiseBuffer(ctx, colour)
  s.loop = true
  s.start(when, Math.random() * 2)
  s.stop(end)
  keep(s)
  return s
}
function filter(ctx: AudioContext, type: BiquadFilterType, f: number, q = 0.7) {
  const b = ctx.createBiquadFilter()
  b.type = type
  b.frequency.value = f
  b.Q.value = q
  return b
}
/** A gain that rises over `attack`, holds, and falls away over `release` once the note's done. */
function envelope(ctx: AudioContext, when: number, dur: number, peak: number, attack: number, release: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.linearRampToValueAtTime(peak, when + attack)
  g.gain.setValueAtTime(peak, when + Math.max(attack, dur))
  g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(attack, dur) + release)
  return g
}
/** A gain that strikes and dies away, like a string or a bell. */
function strike(ctx: AudioContext, when: number, peak: number, decay: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.linearRampToValueAtTime(peak, when + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay)
  return g
}
function vibrato(out: Out, o: OscillatorNode, when: number, end: number, rate: number, depth: number) {
  const lfo = osc(out, 'sine', rate, when, end)
  const amt = out.ctx.createGain()
  amt.gain.value = depth
  lfo.connect(amt).connect(o.frequency)
}

function note(out: Out, dest: AudioNode, n: Note, when: number) {
  const { ctx } = out
  // Bits of the world are pitched in hertz; everything musical by note.
  const f = n.timbre === 'drop' || n.timbre === 'chirp' || n.timbre === 'clink' ? n.midi : hz(n.midi)
  const g = n.gain
  const dur = n.dur
  switch (n.timbre) {
    case 'piano': {
      const end = when + Math.min(dur + 1.2, 3)
      const e = strike(ctx, when, g * 0.5, end - when)
      const lp = filter(ctx, 'lowpass', 2600)
      osc(out, 'triangle', f, when, end).connect(lp)
      const h = ctx.createGain()
      h.gain.value = 0.25
      osc(out, 'sine', f * 2, when, end).connect(h).connect(lp)
      lp.connect(e).connect(dest)
      return
    }
    case 'guitar':
    case 'ukulele': {
      const decay = n.timbre === 'guitar' ? 1.4 : 0.7
      const end = when + decay
      const lp = filter(ctx, 'lowpass', 3200, 2)
      lp.frequency.setValueAtTime(3200, when)
      lp.frequency.exponentialRampToValueAtTime(500, when + 0.35)
      osc(out, 'sawtooth', f, when, end).connect(lp)
      lp.connect(strike(ctx, when, g * 0.32, decay)).connect(dest)
      return
    }
    case 'strings':
    case 'pad': {
      const pad = n.timbre === 'pad'
      const attack = pad ? 0.6 : 0.35
      const release = pad ? 1.1 : 0.6
      const end = when + dur + release + 0.05
      const lp = filter(ctx, 'lowpass', pad ? 900 : 1700)
      for (const detune of pad ? [0.994, 1, 1.006] : [0.997, 1.003]) {
        const o = osc(out, 'sawtooth', f * detune, when, end)
        if (!pad) vibrato(out, o, when, end, 5, f * 0.003)
        o.connect(lp)
      }
      lp.connect(envelope(ctx, when, dur, g * (pad ? 0.09 : 0.11), attack, release)).connect(dest)
      return
    }
    case 'musicbox': {
      const end = when + 1.3
      const e = strike(ctx, when, g * 0.32, 1.3)
      osc(out, 'sine', f * 2, when, end).connect(e)
      const h = ctx.createGain()
      h.gain.value = 0.18
      osc(out, 'sine', f * 6, when, end).connect(h).connect(e)
      e.connect(dest)
      return
    }
    case 'choir': {
      const end = when + dur + 0.8
      const o = osc(out, 'sawtooth', f, when, end)
      vibrato(out, o, when, end, 5.2, f * 0.006)
      const e = envelope(ctx, when, dur, g * 0.9, 0.4, 0.7)
      // Two formants make an "ah".
      for (const [ff, q] of [[700, 5], [1150, 6]]) o.connect(filter(ctx, 'bandpass', ff, q)).connect(e)
      e.connect(dest)
      return
    }
    case 'hum':
    case 'whistle': {
      const whistle = n.timbre === 'whistle'
      const p = whistle ? f * 4 : f
      const end = when + dur + 0.2
      const o = osc(out, 'sine', p * 0.985, when, end)
      o.frequency.linearRampToValueAtTime(p, when + 0.07)
      vibrato(out, o, when + 0.15, end, 5.5, p * 0.005)
      const e = envelope(ctx, when, dur, g * (whistle ? 0.16 : 0.28), 0.06, 0.14)
      const lp = filter(ctx, 'lowpass', whistle ? 5000 : 950)
      o.connect(lp)
      if (!whistle) {
        const t = ctx.createGain()
        t.gain.value = 0.4
        osc(out, 'triangle', p, when, end).connect(t).connect(lp)
      }
      lp.connect(e).connect(dest)
      return
    }
    case 'bass': {
      const end = when + dur + 0.2
      const lp = filter(ctx, 'lowpass', 420)
      osc(out, 'triangle', f, when, end).connect(lp)
      lp.connect(envelope(ctx, when, dur, g * 0.5, 0.01, 0.15)).connect(dest)
      return
    }
    case 'kick': {
      const o = osc(out, 'sine', 140, when, when + 0.35)
      o.frequency.exponentialRampToValueAtTime(42, when + 0.14)
      o.connect(strike(ctx, when, g * 0.9, 0.32)).connect(dest)
      return
    }
    case 'snare': {
      burst(out, 'white', when, when + 0.2).connect(filter(ctx, 'bandpass', 1900, 0.8)).connect(strike(ctx, when, g * 0.5, 0.18)).connect(dest)
      osc(out, 'triangle', 185, when, when + 0.1).connect(strike(ctx, when, g * 0.3, 0.08)).connect(dest)
      return
    }
    case 'brush': {
      const s = burst(out, 'white', when, when + 0.3)
      const e = ctx.createGain()
      e.gain.setValueAtTime(0.0001, when)
      e.gain.linearRampToValueAtTime(g * 0.16, when + 0.04)
      e.gain.exponentialRampToValueAtTime(0.0001, when + 0.26)
      s.connect(filter(ctx, 'bandpass', 3200, 0.6)).connect(e).connect(dest)
      return
    }
    case 'hat': {
      burst(out, 'white', when, when + 0.08).connect(filter(ctx, 'highpass', 7500)).connect(strike(ctx, when, g * 0.12, 0.05)).connect(dest)
      return
    }
    case 'drop': {
      burst(out, 'white', when, when + 0.05).connect(filter(ctx, 'bandpass', f, 3)).connect(strike(ctx, when, g * 0.5, 0.035)).connect(dest)
      return
    }
    case 'chirp': {
      const o = osc(out, 'sine', f, when, when + dur)
      const e = ctx.createGain()
      e.gain.setValueAtTime(0, when)
      // A cricket: three quick pulses.
      for (let i = 0; i < 3; i++) {
        e.gain.setValueAtTime(g * 0.05, when + i * 0.05)
        e.gain.setValueAtTime(0, when + i * 0.05 + 0.025)
      }
      o.connect(e).connect(dest)
      return
    }
    case 'clink': {
      const e = strike(ctx, when, g * 0.08, 0.5)
      osc(out, 'sine', f, when, when + 0.5).connect(e)
      osc(out, 'sine', f * 2.76, when, when + 0.5).connect(e)
      e.connect(dest)
      return
    }
    case 'creak': {
      const o = osc(out, 'sawtooth', 85, when, when + dur + 0.1)
      o.frequency.linearRampToValueAtTime(140, when + dur * 0.6)
      o.frequency.linearRampToValueAtTime(110, when + dur)
      o.connect(filter(ctx, 'bandpass', 950, 7)).connect(envelope(ctx, when, dur, g * 0.6, 0.05, 0.1)).connect(dest)
      return
    }
    case 'thud': {
      const o = osc(out, 'sine', 90, when, when + 0.3)
      o.frequency.exponentialRampToValueAtTime(48, when + 0.2)
      o.connect(strike(ctx, when, g * 0.8, 0.28)).connect(dest)
      burst(out, 'brown', when, when + 0.15).connect(filter(ctx, 'lowpass', 300)).connect(strike(ctx, when, g * 0.6, 0.12)).connect(dest)
      return
    }
  }
}

function bed(out: Out, dest: AudioNode, b: Bed, when: number, dur: number) {
  const { ctx } = out
  const end = when + dur
  const e = ctx.createGain()
  const fade = Math.min(0.8, dur / 3)
  e.gain.setValueAtTime(0.0001, when)
  e.gain.linearRampToValueAtTime(b.gain, when + fade)
  e.gain.setValueAtTime(b.gain, end - fade)
  e.gain.linearRampToValueAtTime(0.0001, end)
  let src: AudioNode
  switch (b.kind) {
    case 'rain':
      src = burst(out, 'pink', when, end).connect(filter(ctx, 'highpass', 500)).connect(filter(ctx, 'lowpass', 7000))
      break
    case 'road': {
      // Cars passing: the wash swells and falls.
      const swell = ctx.createGain()
      swell.gain.value = 0.6
      const lfo = osc(out, 'sine', 0.12, when, end)
      const depth = ctx.createGain()
      depth.gain.value = 0.4
      lfo.connect(depth).connect(swell.gain)
      src = burst(out, 'brown', when, end).connect(filter(ctx, 'lowpass', 520)).connect(swell)
      break
    }
    case 'room':
      src = burst(out, 'pink', when, end).connect(filter(ctx, 'bandpass', 700, 0.5))
      break
    case 'radio':
      src = burst(out, 'white', when, end).connect(filter(ctx, 'bandpass', 1800, 1.2))
      break
    case 'night':
      src = burst(out, 'brown', when, end).connect(filter(ctx, 'lowpass', 300))
      break
    default:
      src = burst(out, 'pink', when, end).connect(filter(ctx, 'lowpass', 900))
  }
  src.connect(e).connect(dest)
}

/** An effect between a part and the speakers, named as on a clip. */
function effectChain(ctx: AudioContext, effect: Effect, strength: number, dest: AudioNode) {
  const input = ctx.createGain()
  if (effect === 'none') {
    input.connect(dest)
    return input
  }
  const s = Math.min(1, Math.max(0, strength))
  if (effect === 'underwater' || effect === 'lofi' || effect === 'radio') {
    const chain =
      effect === 'underwater'
        ? [filter(ctx, 'lowpass', 1200 - s * 900, 1.5)]
        : effect === 'lofi'
          ? [filter(ctx, 'lowpass', 3600 - s * 2000), filter(ctx, 'highpass', 120)]
          : [filter(ctx, 'highpass', 450 + s * 300), filter(ctx, 'lowpass', 3200 - s * 1200, 1.4)]
    chain.reduce<AudioNode>((a, b) => a.connect(b), input).connect(dest)
    return input
  }
  // Echo and dreamy: the sound, plus repeats of it.
  input.connect(dest)
  const delay = ctx.createDelay(2)
  delay.delayTime.value = effect === 'echo' ? 0.34 : 0.48
  const feedback = ctx.createGain()
  feedback.gain.value = (effect === 'echo' ? 0.3 : 0.5) + s * 0.25
  const wet = ctx.createGain()
  wet.gain.value = 0.25 + s * 0.4
  const tone = filter(ctx, 'lowpass', effect === 'echo' ? 4000 : 2000)
  input.connect(delay).connect(tone).connect(feedback).connect(delay)
  tone.connect(wet).connect(dest)
  return input
}

let current: { stop: () => void } | null = null

/** Stops what `play` started; `join` adds more to it while it plays (on the same clock: a clip just put in the song). */
export type Playback = (() => void) & { join: (parts: Part[]) => void }

/**
 * Plays `parts` from `from` seconds in. Only one thing plays at a time: what
 * was playing stops, and hears about it through its own `onCut`. Returns stop.
 */
export function play(parts: Part[], from = 0, onCut?: () => void): Playback {
  current?.stop()
  const { ctx, master } = audio()
  const voice = ctx.createGain()
  voice.connect(master)
  const live = new Set<AudioScheduledSourceNode>()
  const files: HTMLAudioElement[] = []
  const timers: number[] = []
  const out: Out = {
    ctx,
    keep: (n) => {
      live.add(n)
      n.onended = () => live.delete(n)
    },
  }
  const t0 = ctx.currentTime + 0.06

  // Everything to play, on one clock, scheduled a little ahead as it comes.
  type Due = { when: number; go: () => void }
  const due: Due[] = []
  /** Lines a part up on the clock, where `from` seconds into the song falls at `t0`. */
  const add = (part: Part, from: number, t0: number) => {
    const mix = part.mix ?? {}
    const speed = mix.speed ?? 1
    const span = part.length / speed
    if (part.at + span <= from) return
    const into = Math.max(0, from - part.at)
    const begin = t0 + Math.max(0, part.at - from)
    const end = begin + span - into
    const scoreFrom = part.start + into * speed
    const scoreTo = part.start + part.length
    const pitch = mix.pitch ?? 0

    // Level and fades, then the effect.
    const level = ctx.createGain()
    const vol = Math.min(2, Math.max(0, mix.volume ?? 1))
    const fadeIn = mix.fadeIn ?? 0
    const fadeOut = Math.min(mix.fadeOut ?? 0, end - begin)
    level.gain.setValueAtTime(fadeIn > into ? (vol * into) / fadeIn : vol, begin)
    if (fadeIn > into) level.gain.linearRampToValueAtTime(vol, begin + fadeIn - into)
    if (fadeOut > 0) {
      level.gain.setValueAtTime(vol, end - fadeOut)
      level.gain.linearRampToValueAtTime(0.0001, end)
    }
    level.connect(effectChain(ctx, mix.effect ?? 'none', mix.strength ?? 0.5, voice))

    const at = (t: number) => begin + (t - scoreFrom) / speed
    for (const n of part.score.notes) {
      if (n.t < scoreFrom - 0.01 || n.t >= scoreTo) continue
      const dur = Math.min(n.dur, scoreTo - n.t) / speed
      due.push({ when: at(n.t), go: () => note(out, level, { ...n, dur, midi: n.midi + pitch }, at(n.t)) })
    }
    for (const b of part.score.beds) {
      const s = Math.max(b.t, scoreFrom)
      const e = Math.min(b.t + b.dur, scoreTo)
      if (e - s > 0.1) due.push({ when: at(s), go: () => bed(out, level, b, at(s), (e - s) / speed) })
    }
    if (part.score.file) {
      const el = new Audio(part.score.file)
      el.currentTime = scoreFrom
      el.playbackRate = speed
      el.volume = Math.min(1, vol)
      files.push(el)
      timers.push(window.setTimeout(() => void el.play().catch(() => {}), (begin - ctx.currentTime) * 1000))
      timers.push(window.setTimeout(() => el.pause(), (end - ctx.currentTime) * 1000))
    }
  }
  for (const part of parts) add(part, from, t0)
  due.sort((a, b) => a.when - b.when)
  let next = 0
  const pump = () => {
    const horizon = ctx.currentTime + 1.2
    while (next < due.length && due[next].when < horizon) due[next++].go()
  }
  pump()
  const timer = window.setInterval(pump, 250)

  let done = false
  const stop = () => {
    if (done) return
    done = true
    if (current === handle) current = null
    window.clearInterval(timer)
    timers.forEach((t) => window.clearTimeout(t))
    files.forEach((f) => f.pause())
    const now = ctx.currentTime
    voice.gain.setValueAtTime(voice.gain.value, now)
    voice.gain.linearRampToValueAtTime(0.0001, now + 0.08)
    window.setTimeout(() => {
      live.forEach((n) => {
        try {
          n.stop()
        } catch {
          // Already stopped.
        }
      })
      voice.disconnect()
    }, 120)
  }
  const handle = {
    stop: () => {
      stop()
      onCut?.()
    },
  }
  current = handle
  const join = (more: Part[]) => {
    if (done) return
    // From where the song has got to, just ahead of now.
    const at = ctx.currentTime + 0.06
    for (const part of more) add(part, from + (at - t0), at)
    due.splice(next, due.length - next, ...due.slice(next).sort((a, b) => a.when - b.when))
    pump()
  }
  return Object.assign(stop, { join })
}
