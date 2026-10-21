import { useReactFlow, useViewport, type InternalNode } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { INSTRUMENT_PHOTOS } from '@/data/library'
import { clipsOf, playTime } from '@/data/clips'
import { collaborator } from '@/data/collaborators'
import { STARTING_DATA, type AnySongNode, type Role, type SongNode } from '@/data/nodes'
import { useSong } from '@/store/song'
import { useWorkspace } from '@/store/workspace'
import { CREW, useCrew, type Cursor, type P, type Who } from './store'

/**
 * The team, live (demo: a soundtrack for the game Mosswood). Once the song is
 * shared to "Team 😎", Thashin, Naziat and Tory join: their cursors come in
 * and they build a Chorus off the Verse. Thashin carries the Verse on into it,
 * they bring in the game's art (the village and the woods), Strings, Brushed
 * drums and a night sound and wire each in, make its takes and put Take A in
 * the song. Then they keep going off that: a Bridge carried on from the Chorus,
 * with the world art and a piano, and two ideas for it; then they remake the
 * Bridge's ideas with a guitar and a music box plugged straight in, start a
 * Verse 2 with lines and the character art, and near the end open the
 * timeline (if it's closed) and leave notes on it. They play nothing themselves: if the song's playing, the
 * Chorus is heard when the playhead gets to it. They work at once, each moving
 * their own way, and look around while the others are busy. Everything they do
 * goes through the app's own actions, so it's all real once they've done it:
 * undo, play, move, unplug.
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

/** Between the screen and the canvas (set while the crew is on the canvas). */
let canvas: { toFlow: (p: P) => P; toScreen: (p: P) => P } | null = null
/** Where a cursor is on the screen now: if it's pinned to the canvas, wherever that spot has moved to. */
const where = (c: Cursor): P => (c.pin && canvas ? canvas.toScreen(c.pin) : c.at)
const onCanvas = (p: P) => {
  const r = document.querySelector('.react-flow')?.getBoundingClientRect()
  return !!r && p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom
}

/**
 * Moves a cursor to wherever `to` is (asked every frame, so it follows the canvas as it moves): along a curve
 * that bends their way, as long as the distance asks for, a little past the mark, then settling back onto it.
 */
function move(who: Who, to: () => P | null, slow = 1) {
  const id = ++moves[who]
  return new Promise<void>((done) => {
    const hand = HANDS[who]
    const from = where(useCrew.getState().cursors[who])
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
      if (k < 1) {
        put(who, { at, pin: null })
        requestAnimationFrame(step)
      } else {
        // Come to rest: on the canvas, it stays with what it's on as the canvas moves.
        put(who, { at, pin: canvas && onCanvas(at) ? canvas.toFlow(at) : null })
        done()
      }
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
  // Drawn again whenever the canvas moves, so a pinned cursor goes with it.
  useViewport()
  useEffect(() => {
    canvas = { toFlow: (p) => rf.screenToFlowPosition(p), toScreen: (p) => rf.flowToScreenPosition(p) }
    return () => {
      canvas = null
    }
  }, [rf])

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
          const at = where(c)
          const to = { x: at.x - 1, y: at.y - 1 }
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
  const at = where(cursor)
  return (
    <div
      className="absolute top-0 left-0 transition-opacity duration-300"
      style={{ transform: `translate(${at.x}px, ${at.y}px)`, opacity: cursor.shown ? 1 : 0 }}
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
  /** How far down the canvas a card's connector is (where a wire from it runs across). */
  const portY = (id: string | undefined) => {
    const n = id ? node(id) : undefined
    const h = n?.internals.handleBounds?.source?.find((b) => b.id === 'port')
    return n && h ? n.internals.positionAbsolute.y + h.y + h.height / 2 : null
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
      const at = where(useCrew.getState().cursors[others[Math.floor(Math.random() * others.length)]])
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
    await sleep(rand(150, 350))
  }
  await sleep(300)
  if (stopped()) return
  looking = true
  for (const who of CREW) void wander(who)

  // ---- they build the next part off the Verse: Thashin starts a Chorus to the right and carries the Verse on into it.
  // (They don't play anything: what's heard is the song in the timeline, and the Chorus comes in when it gets there.)
  const nodes = song().nodes.map((n) => node(n.id)).filter((n): n is InternalNode<AnySongNode> => !!n)
  const right = Math.max(...nodes.map((n) => n.internals.positionAbsolute.x + (n.measured.width ?? 260)), 0)
  const sections = nodes.filter((n) => n.type === 'section')
  const top = sections.length ? Math.min(...sections.map((n) => n.internals.positionAbsolute.y)) : Math.min(...nodes.map((n) => n.internals.positionAbsolute.y), 0)
  // Far enough right that the cards they bring in fit between what's there and the Chorus, wired in from its left.
  const chorusAt = { x: right + 640, y: top + 200 }
  let chorus = ''
  // A column in the gap left of the Chorus (centres, `dy` below the wire the Verse carries on into it along), in the
  // order of the sockets they plug into, so no wire crosses another. Fixed to where the Chorus was put, not its corner,
  // which rises as it grows with each thing plugged in. (An image card is about 220 tall, the others about 90.)
  const verseLine = portY(vt?.id) ?? chorusAt.y - 105
  const cardAt = (dy: number) => () => ({ x: chorusAt.x - 410, y: verseLine + dy })
  // The game's art (demo: a game soundtrack, for Mosswood).
  const art = {
    village: { caption: 'Willow Village', src: '/game/village.jpg' },
    woods: { caption: 'The Whispering Woods', src: '/game/woods.jpg' },
    world: { caption: 'Mosswood, world exploration', src: '/game/world.jpg' },
    character: { caption: 'Mosswood, character sheet', src: '/game/character.jpg' },
  }
  const placed = work('thashin', async () => {
    await move('thashin', () => screen(chorusAt))
    await click()
    chorus = song().addNode('section', chorusAt, { ...structuredClone(STARTING_DATA.section), name: 'Chorus' })
    await sleep(200)
    fit()
  })
  const made = placed.then(() => work('thashin', async () => {
    await sleep(400)
    const from = verseTake()
    if (from?.type === 'take' && from.data.added) await wire('thashin', from.id, chorus, 'follows')
    // Then a sound to sit underneath it.
    const night = await bring('thashin', 'sound', cardAt(563), { label: 'Night in the woods', duration: 64 })
    await wire('thashin', night, chorus, 'texture')
  }))
  // Naziat brings the village and then Strings; Tory, the woods at night and then Brushed drums.
  const naziat = (async () => {
    await sleep(rand(300, 500))
    const village = await bring('naziat', 'photo', cardAt(150), art.village)
    await placed
    await wire('naziat', village, chorus, 'mood')
    const strings = await bring('naziat', 'instrument', cardAt(805), { tab: 'Strings', name: 'Strings', detail: 'slow and swelling', thumb: INSTRUMENT_PHOTOS.Strings })
    await wire('naziat', strings, chorus, 'instruments')
  })()
  const tory = (async () => {
    await sleep(rand(700, 1000))
    const woods = await bring('tory', 'photo', cardAt(385), art.woods)
    await placed
    await wire('tory', woods, chorus, 'mood')
    const drums = await bring('tory', 'instrument', cardAt(680), { tab: 'Drums', name: 'Brushed drums', detail: 'soft, behind the beat', thumb: INSTRUMENT_PHOTOS['Brushed drums'] })
    await wire('tory', drums, chorus, 'instruments')
  })()
  await sleep(1200)
  fit()
  await Promise.all([naziat, tory, made])
  if (stopped()) return

  // ---- Thashin hears two ideas for it, and as soon as they're made, puts Take A in the song after the Verse
  fit()
  await press('thashin', chorus, /Hear 2 ideas/, () => song().makeTakes(chorus))
  await sleep(400)
  fit()
  const takeA = () => song().nodes.find((n): n is SongNode<'take'> => n.type === 'take' && n.data.sectionId === chorus && n.data.version === 'A')
  // Over to where Take A's button will be while it's made.
  const id = takeA()?.id
  if (!id || stopped()) return
  await work('thashin', () => move('thashin', () => rect(buttonIn(id, /Add to timeline/))))
  while (takeA()?.data.state !== 'done' && !stopped()) await sleep(120)
  await sleep(250)
  // (Without raising the timeline: if it's closed it stays closed until they go to leave their notes, near the end.)
  await press('thashin', id, /Add to timeline/, () => song().addToTimeline(id, false))
  const takeAId = id
  await sleep(700)
  fit()
  await sleep(800)
  if (stopped()) return

  // ---- notes on the timeline, for near the end: Naziat on the Chorus, Thashin on the hum at the start
  const s = song()
  const items = clipsOf(s.nodes, s.songId ? s.arrangements[s.songId] : undefined)
  const startOf = (i: number) => items.slice(0, i).reduce((t, it) => t + playTime(it.clip), 0)
  const ci = items.findIndex((it) => it.take.id === takeAId)
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

  // ---- and they keep going off it: Thashin starts a Bridge past the Chorus's takes and carries the Chorus on into it,
  // Tory brings an Upright piano and Naziat the world art, and Thashin hears two ideas for it.
  // (Its takes stay proposed, so the song that's playing doesn't change.)
  const now = song().nodes.map((n) => node(n.id)).filter((n): n is InternalNode<AnySongNode> => !!n)
  const bridgeAt = { x: Math.max(...now.map((n) => n.internals.positionAbsolute.x + (n.measured.width ?? 260))) + 640, y: chorusAt.y }
  let bridge = ''
  // Below the wire the Chorus carries on along, in socket order (the Feeling, then the piano), as for the Chorus.
  const chorusLine = portY(takeAId) ?? bridgeAt.y - 105
  const bridgeCardAt = (dy: number) => () => ({ x: bridgeAt.x - 410, y: chorusLine + dy })
  const bridgeCards: string[] = []
  // Just this part in view: the Chorus take it carries on from, the Bridge, and what's brought to it.
  const frameBridge = () =>
    rf.fitView({
      nodes: [takeAId, bridge, ...bridgeCards, ...song().nodes.filter((n) => n.type === 'take' && n.data.sectionId === bridge).map((n) => n.id)]
        .filter(Boolean)
        .map((id) => ({ id })),
      padding: 0.2,
      maxZoom: 0.9,
      duration: 700,
    })
  const started = work('thashin', async () => {
    await move('thashin', () => screen(bridgeAt))
    await click()
    bridge = song().addNode('section', bridgeAt, { ...structuredClone(STARTING_DATA.section), name: 'Bridge' })
    await sleep(200)
    frameBridge()
    await sleep(500)
    await wire('thashin', takeAId, bridge, 'follows')
  })
  const piano = (async () => {
    await sleep(rand(500, 800))
    const id = await bring('tory', 'instrument', bridgeCardAt(340), { tab: 'Keyboard', name: 'Upright piano', detail: 'a bit out of tune', thumb: INSTRUMENT_PHOTOS['Upright piano'] })
    bridgeCards.push(id)
    await started
    await wire('tory', id, bridge, 'instruments')
  })()
  const longing = (async () => {
    await sleep(rand(200, 400))
    const id = await bring('naziat', 'photo', bridgeCardAt(150), art.world)
    bridgeCards.push(id)
    await started
    await wire('naziat', id, bridge, 'mood')
  })()
  await started
  frameBridge()
  await Promise.all([piano, longing])
  if (stopped()) return
  frameBridge()
  await sleep(400)
  await press('thashin', bridge, /Hear 2 ideas/, () => song().makeTakes(bridge))
  if (stopped()) return

  /** Frames these cards and the spots around `extra` (where cards are about to go), so where they're working is in view. */
  const frameAround = (ids: string[], extra: P[] = []) => {
    const boxes = ids.flatMap((id) => {
      const n = node(id)
      if (!n) return []
      const { x, y } = n.internals.positionAbsolute
      return [{ x0: x, y0: y, x1: x + (n.measured.width ?? 260), y1: y + (n.measured.height ?? 120) }]
    })
    for (const p of extra) boxes.push({ x0: p.x - 150, y0: p.y - 60, x1: p.x + 150, y1: p.y + 60 })
    if (!boxes.length) return
    const x0 = Math.min(...boxes.map((b) => b.x0))
    const y0 = Math.min(...boxes.map((b) => b.y0))
    void rf.fitBounds({ x: x0, y: y0, width: Math.max(...boxes.map((b) => b.x1)) - x0, height: Math.max(...boxes.map((b) => b.y1)) - y0 }, { padding: 0.12, duration: 700 })
  }
  const takesOf = (section: string) => song().nodes.filter((n): n is SongNode<'take'> => n.type === 'take' && n.data.sectionId === section)

  // ---- while the Bridge's ideas are made, Thashin starts a second verse under it; once they're made, Naziat plugs an
  // Acoustic guitar straight into its Take A and Tory a Music box into Take B (each is made again with it in, still
  // proposed, so the song that's playing doesn't change), then they bring Verse 2 its lines and the character art
  await sleep(400)
  const bA = takesOf(bridge).find((t) => t.data.version === 'A')?.id
  const bB = takesOf(bridge).find((t) => t.data.version === 'B')?.id
  if (!bA || !bB) return
  const edges = (id: string) => {
    const n = node(id)
    const y = n?.internals.positionAbsolute.y ?? 0
    return { left: n?.internals.positionAbsolute.x ?? 0, top: y, bottom: y + (n?.measured.height ?? 150) }
  }
  // Above Take A and below Take B, each to the left, so their wires run in clear of the takes' own wires (and clear of
  // the Bridge, which is as tall as what's plugged into it).
  const guitarAt = { x: edges(bA).left - 270, y: Math.min(edges(bA).top, edges(bridge).top) - 75 }
  const musicBoxAt = { x: edges(bB).left - 290, y: Math.max(edges(bB).bottom, edges(bridge).bottom) + 75 }
  const bridgeIds = () => [bridge, ...bridgeCards, ...takesOf(bridge).map((t) => t.id)]
  const verse2At = { x: bridgeAt.x, y: bridgeAt.y + 700 }
  const v2Cards: string[] = []
  const v2CardAt = (dy: number) => () => ({ x: verse2At.x - 410, y: verse2At.y - 50 + dy })
  // Where Verse 2's cards and takes will be.
  const v2Spots = [{ x: verse2At.x - 545, y: verse2At.y - 200 }, { x: verse2At.x + 560, y: verse2At.y + 230 }]
  let verse2 = ''
  const v2Ids = () => [verse2, ...v2Cards, ...takesOf(verse2).map((t) => t.id)].filter(Boolean)
  // Both in view: the Bridge and where its new cards go, and where Verse 2 will be.
  const frameBoth = () => frameAround([...bridgeIds(), ...v2Ids()], [guitarAt, musicBoxAt, ...v2Spots])
  frameBoth()
  await sleep(600)
  const v2Started = work('thashin', async () => {
    await move('thashin', () => screen(verse2At))
    await click()
    verse2 = song().addNode('section', verse2At, { ...structuredClone(STARTING_DATA.section), name: 'Verse 2' })
  })
  const bridgeMade = async () => {
    while (takesOf(bridge).some((t) => t.data.state !== 'done') && !stopped()) await sleep(120)
  }
  const naziatOn = (async () => {
    await bridgeMade()
    const guitar = await bring('naziat', 'instrument', () => guitarAt, { tab: 'Strings', name: 'Acoustic guitar', detail: 'fingerpicked', thumb: INSTRUMENT_PHOTOS['Acoustic guitar'] })
    await wire('naziat', guitar, bA, 'instruments', 'add')
    const lyrics = await bring('naziat', 'lyrics', v2CardAt(0), { text: 'through the mossy gate' })
    v2Cards.push(lyrics)
    await v2Started
    await wire('naziat', lyrics, verse2, 'lyrics')
  })()
  const toryOn = (async () => {
    await bridgeMade()
    await sleep(rand(400, 700))
    const box = await bring('tory', 'instrument', () => musicBoxAt, { tab: 'Keyboard', name: 'Music box', detail: 'small and bright', thumb: INSTRUMENT_PHOTOS['Music box'] })
    await wire('tory', box, bB, 'instruments', 'add')
    const character = await bring('tory', 'photo', v2CardAt(185), art.character)
    v2Cards.push(character)
    await v2Started
    await wire('tory', character, verse2, 'mood')
  })()
  await Promise.all([v2Started, naziatOn, toryOn])
  if (stopped()) return
  frameBoth()
  await sleep(300)
  await press('thashin', verse2, /Hear 2 ideas/, () => song().makeTakes(verse2))
  if (stopped()) return

  // ---- and while Verse 2's ideas are made, Thashin opens the timeline (if it isn't up) and they leave their notes on it
  const timelineButton = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Timeline')
  if (!song().timelineOpen) {
    await work('thashin', async () => {
      await move('thashin', () => rect(timelineButton()))
      await click()
      if (!song().timelineOpen) song().toggleTimeline()
    })
    // The canvas gives the timeline room: once it has, frame Verse 2 and its ideas again in what's left.
    await sleep(850)
    frameAround(v2Ids(), v2Spots)
    await sleep(500)
  }
  await Promise.all([
    note('naziat', ci, 2, 'the village theme is so cozy 🥹'),
    (async () => {
      await sleep(rand(400, 700))
      await note('thashin', 0, 1, 'this hum is so mosswood 🌿')
    })(),
  ])
  if (stopped()) return

  // They stay a beat, still, then head off their own way one after another, fading as they go.
  looking = false
  await sleep(1800)
  for (const who of CREW) {
    if (stopped()) return
    // One spot off their side to head for (not a new one every frame).
    const away = off(who)
    void move(who, () => away, 1.4)
    window.setTimeout(() => put(who, { shown: false }), 450)
    await sleep(rand(300, 550))
  }
}
