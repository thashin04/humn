import { useReactFlow, type InternalNode } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { INSTRUMENT_PHOTOS } from '@/data/library'
import { clipsOf, playTime } from '@/data/clips'
import { collaborator } from '@/data/collaborators'
import { STARTING_DATA, type AnySongNode, type Role } from '@/data/nodes'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'
import { CREW, useCrew, type Cursor, type P, type Who } from './store'

/**
 * The team, live (demo). Once the song is shared to "Team 😎", Thashin, Naziat
 * and Tory join: their cursors come in, Naziat plugs a sound straight into the
 * Verse's Take A (it's made again with it in), and then, as in the demo video,
 * they build a Chorus off it: Thashin carries the Verse on into it, they bring
 * in a Feeling, Brushed drums and Strings and wire each in, make its takes,
 * play one, put it in the song, and leave notes on the timeline. They work at once, each moving their own way, and look around
 * while the others are busy. Everything they do goes through the app's own
 * actions, so it's all real once they've done it: undo, play, move, unplug.
 */

const put = (who: Who, patch: Partial<Cursor>) =>
  useCrew.setState((s) => ({ cursors: { ...s.cursors, [who]: { ...s.cursors[who], ...patch } } }))
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** How each person moves: their pace, which way their moves tend to bend, how they get going, and how far they overshoot. */
type Hand = { pace: number; bend: number; ease: (k: number) => number; overshoot: number }
const HANDS: Record<Who, Hand> = {
  // Steady: a smooth start and stop, curves a little to the left.
  thashin: { pace: 1, bend: 0.16, ease: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2), overshoot: 5 },
  // Quick and decisive: off fast, eases in late, a bigger swoop and a bigger overshoot.
  naziat: { pace: 1.3, bend: -0.24, ease: (k) => 1 - (1 - k) ** 4, overshoot: 8 },
  // Unhurried: gentle all the way, nearly straight lines.
  tory: { pace: 0.85, bend: 0.1, ease: (k) => 0.5 - Math.cos(Math.PI * k) / 2, overshoot: 3 },
}

// A move in progress is replaced by the next one for the same person (so looking around never gets in the way of work).
const moves: Record<Who, number> = { thashin: 0, naziat: 0, tory: 0 }

/**
 * Moves a cursor to wherever `to` is (asked every frame, so it follows the canvas as it moves): along a curve
 * that bends their way, as long as the distance asks for, a little past the mark, then settling back onto it.
 */
function move(who: Who, to: () => P | null, slow = 1) {
  const id = ++moves[who]
  return new Promise<void>((done) => {
    const hand = HANDS[who]
    const from = { ...useCrew.getState().cursors[who].at }
    const first = to() ?? from
    const dist = Math.hypot(first.x - from.x, first.y - from.y)
    const ms = Math.min(1400, Math.max(260, (230 + dist * 0.85) / hand.pace)) * slow
    // This move's curve: their usual bend, sometimes the other way, never the same twice.
    const bend = hand.bend * (Math.random() < 0.75 ? 1 : -1) * rand(0.6, 1.4)
    const t0 = performance.now()
    const step = (now: number) => {
      if (moves[who] !== id) return done()
      const k = Math.min(1, (now - t0) / ms)
      const target = to() ?? first
      const dx = target.x - from.x
      const dy = target.y - from.y
      const len = Math.hypot(dx, dy) || 1
      // Out along the curve to a point just past the target, then back onto it over the last bit.
      const over = Math.min(hand.overshoot, len * 0.05)
      const past = { x: target.x + (dx / len) * over, y: target.y + (dy / len) * over }
      const c = { x: (from.x + past.x) / 2 - (dy / len) * len * bend, y: (from.y + past.y) / 2 + (dx / len) * len * bend }
      let at: P
      if (k < 0.86) {
        const e = hand.ease(k / 0.86)
        at = { x: (1 - e) ** 2 * from.x + 2 * (1 - e) * e * c.x + e * e * past.x, y: (1 - e) ** 2 * from.y + 2 * (1 - e) * e * c.y + e * e * past.y }
      } else {
        const s = (k - 0.86) / 0.14
        const e = s * s * (3 - 2 * s)
        at = { x: past.x + (target.x - past.x) * e, y: past.y + (target.y - past.y) * e }
      }
      put(who, { at })
      if (k < 1) requestAnimationFrame(step)
      else done()
    }
    requestAnimationFrame(step)
  })
}

/** A click is just a beat on the spot (no animation on the cursor). */
const click = () => sleep(rand(110, 180))

const rect = (el: Element | null | undefined): P | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
const buttonIn = (nodeId: string, match: RegExp) =>
  [...document.querySelectorAll(`.react-flow__node[data-id="${nodeId}"] button`)].find((b) => match.test(b.getAttribute('aria-label') ?? b.textContent ?? ''))

export function Crew() {
  const rf = useReactFlow()
  const run = useCrew((s) => s.run)
  const cursors = useCrew((s) => s.cursors)
  const ran = useRef(0)

  useEffect(() => {
    if (!run || ran.current === run) return
    ran.current = run
    let stopped = false
    void script(rf, () => stopped)
    return () => {
      stopped = true
    }
  }, [run, rf])

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <svg className="absolute inset-0 size-full overflow-visible">
        {CREW.map((who) => {
          const c = cursors[who]
          if (!c.wire) return null
          const { from } = c.wire
          const to = { x: c.at.x - 1, y: c.at.y - 1 }
          const dx = Math.max(36, Math.abs(to.x - from.x) * 0.5)
          const d = `M${from.x} ${from.y}C${from.x + dx} ${from.y} ${to.x - dx} ${to.y} ${to.x} ${to.y}`
          return (
            <g key={who}>
              <path d={d} fill="none" stroke="var(--soft-card)" strokeWidth={10} strokeLinecap="round" />
              <path d={d} fill="none" stroke={c.wire.color} strokeWidth={2} strokeLinecap="round" />
              <circle cx={to.x} cy={to.y} r={4.5} fill="var(--soft-card)" stroke={c.wire.color} strokeWidth={2} />
            </g>
          )
        })}
      </svg>
      {CREW.map((who) => (
        <FigmaCursor key={who} who={who} cursor={cursors[who]} />
      ))}
    </div>
  )
}

/** Figma's cursor at its own size: a small tilted arrowhead in the person's colour with a white rim, and their name. */
function FigmaCursor({ who, cursor }: { who: Who; cursor: Cursor }) {
  const c = collaborator(who)
  return (
    <div
      className="absolute top-0 left-0 transition-opacity duration-300"
      style={{ transform: `translate(${cursor.at.x}px, ${cursor.at.y}px)`, opacity: cursor.shown ? 1 : 0 }}
    >
      <svg width={18} height={20} viewBox="-3 -3 30 34" className="absolute -top-[2px] -left-[2px] overflow-visible drop-shadow-[0_1px_2px_rgb(0_0_0/0.2)]">
        <path
          d="M0.6 0.4L24.3 13.6Q25.6 14.4 24.2 14.9L13.6 18.2Q12.6 18.5 12.1 19.3L6.4 28Q5.6 29.1 5.3 27.8L0 1.1Q-0.2 -0.1 0.6 0.4Z"
          fill={c.color}
          stroke="white"
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </svg>
      <div
        className="absolute top-[16px] left-[11px] flex items-center gap-0.5 rounded-[4px] px-[5px] py-[2px] text-[11px] leading-[13px] font-medium whitespace-nowrap text-white"
        style={{ background: c.color }}
      >
        {c.name}
        {cursor.typing && <span className="animate-pulse">…</span>}
      </div>
    </div>
  )
}

type RF = ReturnType<typeof useReactFlow>

async function script(rf: RF, stopped: () => boolean) {
  const song = () => useSong.getState()
  const node = (id: string) => rf.getInternalNode(id) as InternalNode<AnySongNode> | undefined
  const screen = (p: P) => rf.flowToScreenPosition(p)
  const handle = (id: string, kind: 'source' | 'target', handleId: string) => () => {
    const n = node(id)
    const h = n?.internals.handleBounds?.[kind]?.find((b) => b.id === handleId)
    if (!n || !h) return null
    return screen({ x: n.internals.positionAbsolute.x + h.x + h.width / 2, y: n.internals.positionAbsolute.y + h.y + h.height / 2 })
  }
  /** Somewhere on a node (a fraction across and down it). */
  const onNode = (id: string, fx: number, fy: number) => () => {
    const n = node(id)
    if (!n) return null
    return screen({ x: n.internals.positionAbsolute.x + (n.measured.width ?? 260) * fx, y: n.internals.positionAbsolute.y + (n.measured.height ?? 100) * fy })
  }
  const fit = () => rf.fitView({ padding: 0.16, maxZoom: 1, duration: 700 })
  /** Just off the screen on each person's own side (somewhere along it): Thashin's the top, Naziat's the left, Tory's the bottom. */
  const off = (who: Who): P => {
    const w = window.innerWidth
    const h = window.innerHeight
    if (who === 'thashin') return { x: w * rand(0.45, 0.85), y: -40 }
    if (who === 'naziat') return { x: -40, y: h * rand(0.25, 0.6) }
    return { x: w * rand(0.3, 0.7), y: h + 40 }
  }

  // ---- while someone isn't doing anything, they look around now and then: toward what someone else is doing, or over a card
  const busy: Record<Who, boolean> = { thashin: false, naziat: false, tory: false }
  let looking = false
  const look = (who: Who): P | null => {
    const others = CREW.filter((w) => w !== who && busy[w])
    if (others.length && Math.random() < 0.6) {
      // Toward someone at work, not on top of them.
      const at = useCrew.getState().cursors[others[Math.floor(Math.random() * others.length)]].at
      return { x: at.x + rand(-120, 120), y: at.y + rand(50, 110) * (Math.random() < 0.5 ? -1 : 1) }
    }
    const cards = song().nodes.filter((n) => n.type !== 'take' || Math.random() < 0.4)
    const pick = cards[Math.floor(Math.random() * cards.length)]
    return pick ? onNode(pick.id, rand(0.2, 0.85), rand(0.25, 0.8))() : null
  }
  const wander = async (who: Who) => {
    await sleep(rand(600, 1400))
    while (looking && !stopped()) {
      if (!busy[who]) {
        const p = look(who)
        // Only where the canvas can be seen (not under the timeline once it's open).
        const view = document.querySelector('.react-flow')?.getBoundingClientRect()
        const inside = p && view && p.x > view.left + 60 && p.x < view.right - 40 && p.y > view.top + 60 && p.y < view.bottom - 70
        if (inside) await move(who, () => p, rand(1.3, 1.8))
      }
      await sleep(rand(1400, 2800))
    }
  }
  /** Someone at work: they stop looking around until it's done. */
  const work = async <T,>(who: Who, task: () => Promise<T>) => {
    busy[who] = true
    try {
      return await task()
    } finally {
      busy[who] = false
    }
  }

  /** Someone carries a card in from off their side of the screen and sets it down at `at` (its centre, on the canvas). */
  const bring = (who: Who, kind: AnySongNode['type'], at: () => P, data: Record<string, unknown>) =>
    work(who, async () => {
      const from = off(who)
      await move(who, () => from)
      await sleep(rand(150, 400))
      await move(who, () => screen(at()))
      await click()
      return song().addNode(kind, at(), data)
    })
  /** Someone pulls a wire from a card's connector into a socket: a section's (by role) or a take's own. */
  const wire = (who: Who, card: string, into: string, role: Role, socket: string = role) =>
    work(who, async () => {
      await move(who, handle(card, 'source', 'port'))
      await click()
      const from = handle(card, 'source', 'port')()
      if (!from) return
      put(who, { wire: { from, color: `var(--soft-role-${role})` } })
      await move(who, handle(into, 'target', socket), 1.15)
      put(who, { wire: null })
      song().connect(card, into, role)
      await click()
    })
  const press = (who: Who, nodeId: string, label: RegExp, then: () => void) =>
    work(who, async () => {
      await move(who, () => rect(buttonIn(nodeId, label)))
      await click()
      then()
    })

  // ---- they join: their faces in the stack, their cursors in from the right, each their own way, and settle near the Verse
  const songId = useCrew.getState().songId
  if (!songId) return
  useWorkspace.getState().joinSong(songId, [...CREW])
  const verse = song().nodes.find((n) => n.type === 'section' && /verse/i.test(n.data.name)) ?? song().nodes.find((n) => n.type === 'section')
  const verseTake = () =>
    song().nodes.find((n) => n.type === 'take' && n.data.sectionId === verse?.id && n.data.version === 'A' && !n.data.branchOf)
  const vt = verseTake()
  // Each settles somewhere of their own around the Verse: Thashin above its takes, Naziat by the Verse, Tory below.
  const spots: Record<Who, [number, number]> = { thashin: [0.75, -0.35], naziat: [-0.9, 0.5], tory: [0.4, 2.4] }
  const fallback: Record<Who, [number, number]> = { thashin: [0.62, 0.22], naziat: [0.3, 0.5], tory: [0.55, 0.75] }
  for (const who of CREW) {
    put(who, { at: off(who), shown: true })
    const near = vt ? onNode(vt.id, ...spots[who]) : null
    void move(who, () => near?.() ?? { x: window.innerWidth * fallback[who][0], y: window.innerHeight * fallback[who][1] })
    await sleep(rand(150, 450))
  }
  await sleep(500)
  if (stopped()) return

  // ---- first, Naziat brings a sound and plugs it straight into the Verse's Take A, which makes it again with it in
  if (vt) {
    const take = node(vt.id)
    const left = take?.internals.positionAbsolute.x ?? vt.position.x - 140
    const topY = take?.internals.positionAbsolute.y ?? vt.position.y - 70
    // Up and to the left, so its wire runs across and drops in clear of the take's own wire in.
    const crickets = await bring('naziat', 'sound', () => ({ x: left - 270, y: topY - 95 }), { label: 'Crickets at night', duration: 64 })
    // Tory comes over to watch it happen.
    void work('tory', () => move('tory', onNode(vt.id, 0.55, 0.15)))
    await wire('naziat', crickets, vt.id, 'texture', 'add')
    await sleep(2600)
    if (stopped()) return
    // Once it's back, it goes in the song if it wasn't already.
    const again = verseTake()
    if (again?.type === 'take' && !again.data.added) {
      await press('tory', again.id, /Add to timeline/, () => song().addToTimeline(again.id))
      await sleep(600)
    }
  }
  looking = true
  for (const who of CREW) void wander(who)

  // ---- then they build off it: Thashin starts a Chorus to the right and carries the Verse on into it
  const nodes = song().nodes.map((n) => node(n.id)).filter((n): n is InternalNode<AnySongNode> => !!n)
  const right = Math.max(...nodes.map((n) => n.internals.positionAbsolute.x + (n.measured.width ?? 260)), 0)
  const sections = nodes.filter((n) => n.type === 'section')
  const top = sections.length ? Math.min(...sections.map((n) => n.internals.positionAbsolute.y)) : Math.min(...nodes.map((n) => n.internals.positionAbsolute.y), 0)
  // Far enough right that the cards they bring in fit between what's there and the Chorus, wired in from its left.
  const chorusAt = { x: right + 640, y: top + 200 }
  let chorus = ''
  // A column in the gap left of the Chorus, clear of its lanes (centres; the cards are about 270 wide). Fixed to where the
  // Chorus was put, not its corner, which rises as it grows with each thing plugged in.
  const cardAt = (dy: number) => () => ({ x: chorusAt.x - 410, y: chorusAt.y - 50 + dy })
  const made = work('thashin', async () => {
    await move('thashin', () => screen(chorusAt))
    await click()
    chorus = song().addNode('section', chorusAt, { ...structuredClone(STARTING_DATA.section), name: 'Chorus' })
    await sleep(250)
    fit()
    await sleep(500)
    const from = verseTake()
    if (from?.type === 'take' && from.data.added) await wire('thashin', from.id, chorus, 'follows')
  })
  const joyP = (async () => {
    await sleep(rand(600, 900))
    return bring('naziat', 'feeling', cardAt(0), { name: 'Joy', amount: 0.7 })
  })()
  const drumsP = (async () => {
    await sleep(rand(1300, 1700))
    return bring('tory', 'instrument', cardAt(130), { tab: 'Drums', name: 'Brushed drums', detail: 'soft, behind the beat', thumb: INSTRUMENT_PHOTOS['Brushed drums'] })
  })()
  if (stopped()) return

  // ---- each plugs theirs in as soon as it's down; Naziat goes back for Strings while Tory's still wiring
  const joy = await joyP
  await made
  const joyIn = wire('naziat', joy, chorus, 'mood')
  const drums = await drumsP
  fit()
  await joyIn
  const drumsIn = wire('tory', drums, chorus, 'instruments')
  const strings = await bring('naziat', 'instrument', cardAt(270), { tab: 'Strings', name: 'Strings', detail: 'slow and swelling', thumb: INSTRUMENT_PHOTOS.Strings })
  await drumsIn
  fit()
  await sleep(450)
  // Thashin's already on his way to Hear 2 ideas while the last wire goes in.
  const toHear = work('thashin', () => move('thashin', () => rect(buttonIn(chorus, /Hear 2 ideas/))))
  await wire('naziat', strings, chorus, 'instruments')
  await toHear
  if (stopped()) return

  // ---- Thashin hears two ideas for it
  await work('thashin', async () => {
    await sleep(rand(200, 400))
    await click()
    song().makeTakes(chorus)
  })
  await sleep(500)
  fit()
  await sleep(3200)
  if (stopped()) return

  // ---- Tory plays the Chorus's Take A, and a moment in Naziat puts it in the song (it keeps playing)
  const takeA = song().nodes.find((n) => n.type === 'take' && n.data.sectionId === chorus && n.data.version === 'A')?.id
  if (!takeA) return
  const toAdd = (async () => {
    await sleep(500)
    await work('naziat', () => move('naziat', () => rect(buttonIn(takeA, /Add to timeline/))))
  })()
  await press('tory', takeA, /^Play take A/, () => song().setPlaying(takeA))
  await toAdd
  await sleep(900)
  await press('naziat', takeA, /Add to timeline/, () => {
    song().addToTimeline(takeA)
    song().setPlaying(takeA)
  })
  // The timeline rises and the canvas gives it room: frame everything again once it has.
  await sleep(700)
  fit()
  await sleep(800)
  if (stopped()) return

  // ---- and they leave notes on the timeline at once: Naziat on the Chorus, Thashin on the hum at the start
  const s = song()
  const items = clipsOf(s.nodes, s.songId ? s.arrangements[s.songId] : undefined)
  const startOf = (i: number) => items.slice(0, i).reduce((t, it) => t + playTime(it.clip), 0)
  const ci = items.findIndex((it) => it.take.id === takeA)
  const note = (who: Who, clipIndex: number, into: number, text: string) =>
    work(who, async () => {
      const clip = items[clipIndex]
      if (!clip) return
      await move(who, () => {
        const r = document.querySelector(`[data-clip="${clip.clip.id}"]`)?.getBoundingClientRect()
        return r ? { x: r.left + 24 + into * 14, y: r.top + 12 } : null
      })
      await click()
      put(who, { typing: true })
      await sleep(rand(1100, 1600))
      put(who, { typing: false })
      useSong.getState().addComment({ t: startOf(clipIndex) + into }, text, who, true)
    })
  await Promise.all([
    note('naziat', ci, 2, 'this part made me cry 🥹'),
    (async () => {
      await sleep(rand(500, 900))
      await note('thashin', 0, 1, 'the hum at the start 😭')
    })(),
  ])
  // They keep looking around a little longer, then settle.
  await sleep(6000)
  looking = false
}
