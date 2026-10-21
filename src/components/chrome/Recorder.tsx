import { useEffect, useState } from 'react'
import { HUM } from '@/audio/demo'

const BARS = 38
const STEP = 0.09 // seconds a bar stands for

/** The hum's loudness, a value every STEP seconds, read once from the file itself. */
let envelope: Promise<number[]> | null = null
function humEnvelope() {
  envelope ??= fetch(HUM.src)
    .then((r) => r.arrayBuffer())
    .then((b) => new AudioContext().decodeAudioData(b))
    .then((buf) => {
      const d = buf.getChannelData(0)
      const n = Math.floor(buf.sampleRate * STEP)
      const out: number[] = []
      for (let i = 0; i + n <= d.length; i += n) {
        let s = 0
        for (let j = i; j < i + n; j++) s += d[j] * d[j]
        out.push(Math.sqrt(s / n))
      }
      const peak = Math.max(...out, 1e-6)
      return out.map((v) => v / peak)
    })
    .catch(() => [])
  return envelope
}

/**
 * Recording a hum (demo). It looks and sounds like recording: a red light, the
 * time, and a waveform that moves with what's heard. What's heard is the demo's
 * real hum, played as it "records"; Done keeps it as "Your hum".
 */
export function Recorder({ onDone }: { onDone: (seconds: number) => void }) {
  const [secs, setSecs] = useState(0)
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0))

  useEffect(() => {
    const began = performance.now()
    const el = new Audio(HUM.src)
    void el.play().catch(() => {})
    let env: number[] = []
    void humEnvelope().then((e) => (env = e))
    let raf = 0
    let bar = -1
    const tick = (now: number) => {
      const t = (now - began) / 1000
      setSecs(t)
      // A new bar every STEP: the hum's own loudness at that moment, and the room's hiss once it's done.
      const k = Math.floor(t / STEP)
      if (k !== bar) {
        bar = k
        const level = (env[k] ?? 0) * (0.85 + Math.random() * 0.15) + Math.random() * 0.05
        setLevels((l) => [...l.slice(1), Math.min(1, level)])
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      el.pause()
    }
  }, [])

  const t = Math.floor(secs)
  return (
    <div className="col-span-2 flex animate-node-enter flex-col gap-3 rounded-[14px] border-[1.5px] border-[#f3b4b0] bg-[#fff6f5] p-3.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#c13a3f]">
        <span className="size-2.5 animate-pulse rounded-full bg-[#e5484d]" />
        Recording your hum
        <span className="ml-auto font-mono font-medium text-[#b45a5d]">
          {Math.floor(t / 60)}:{String(t % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="flex h-[50px] items-center gap-[3.5px]">
        {levels.map((v, i) => (
          <span
            key={i}
            className="w-[3px] shrink-0 rounded-full bg-[#e5484d] transition-[height] duration-100"
            style={{ height: 3 + v * 44, opacity: 0.35 + 0.65 * Math.min(1, v * 3 + 0.1) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[12px] text-[#b07a7c]">Hum what you hear in your head</span>
        <button
          type="button"
          onClick={() => onDone(Math.max(1, Math.min(HUM.duration, Math.round(secs))))}
          className="flex h-[30px] items-center rounded-full bg-ink px-4 text-[13px] font-medium text-on-ink transition-transform active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  )
}
