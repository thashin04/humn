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
 * and Tory join: their cursors come in and, as in the demo video, they build a
 * Chorus together, bringing in a Feeling, Brushed drums and Strings and wiring
 * each in, make its takes, play one, put it in the song, and leave notes on the
 * timeline. Everything they do goes through the app's own actions, so it's all
 * real once they've done it: undo, play, move, unplug.
 */

const put = (who: Who, patch: Partial<Cursor>) =>
  useCrew.setState((s) => ({ cursors: { ...s.cursors, [who]: { ...s.cursors[who], ...patch } } }))
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
const ease = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2)

/** Moves a cursor to wherever `to` is (asked every frame, so it follows the canvas as it moves), with a slight arc. */
function move(who: Who, to: () => P | null, ms = 700) {
  return new Promise<void>((done) => {
    const from = { ...useCrew.getState().cursors[who].at }
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      const target = to() ?? from
      const e = ease(k)
      const arc = Math.sin(Math.PI * e) * Math.min(28, Math.hypot(target.x - from.x, target.y - from.y) * 0.06)
      put(who, { at: { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e - arc } })
      if (k < 1) requestAnimationFrame(step)
      else done()
    }
    requestAnimationFrame(step)
  })
}

/** A click: the cursor dips and springs back. */
async function click(who: Who) {
  put(who, { press: 1 })
  await sleep(140)
  put(who, { press: 0 })
}

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
          const to = { x: c.at.x - 2, y: c.at.y - 2 }
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

/** Figma's cursor: a tilted arrowhead in the person's colour with a white rim, and their name. */
function FigmaCursor({ who, cursor }: { who: Who; cursor: Cursor }) {
  const c = collaborator(who)
  return (
    <div
      className="absolute top-0 left-0 transition-opacity duration-300"
      style={{ transform: `translate(${cursor.at.x}px, ${cursor.at.y}px) scale(${1 - 0.14 * cursor.press})`, transformOrigin: '0 0', opacity: cursor.shown ? 1 : 0 }}
    >
      <svg width={30} height={34} viewBox="-3 -3 30 34" className="absolute -top-[3px] -left-[3px] overflow-visible drop-shadow-[0_2px_3px_rgb(0_0_0/0.22)]">
        <path
          d="M0.6 0.4L24.3 13.6Q25.6 14.4 24.2 14.9L13.6 18.2Q12.6 18.5 12.1 19.3L6.4 28Q5.6 29.1 5.3 27.8L0 1.1Q-0.2 -0.1 0.6 0.4Z"
          fill={c.color}
          stroke="white"
          strokeWidth={2.6}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </svg>
      <div className="absolute top-[27px] left-[19px] flex items-center gap-1 rounded-[5px] px-[7px] pt-[3px] pb-1 text-[13px] leading-[15px] font-medium whitespace-nowrap text-white" style={{ background: c.color }}>
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
  const fit = () => rf.fitView({ padding: 0.16, maxZoom: 1, duration: 700 })
  const off = (y: number) => ({ x: window.innerWidth + 60, y: window.innerHeight * y })

  /** Someone carries a card in from off to the right and sets it down at `at` (its centre, on the canvas). */
  const bring = async (who: Who, kind: AnySongNode['type'], at: P, data: Record<string, unknown>) => {
    await move(who, () => off(0.5 + Math.random() * 0.3), 350)
    await move(who, () => screen(at), 900)
    await click(who)
    return song().addNode(kind, at, data)
  }
  /** Someone pulls a wire from a card's connector into a section's socket. */
  const wire = async (who: Who, card: string, section: string, role: Role) => {
    await move(who, handle(card, 'source', 'port'), 650)
    await click(who)
    const from = handle(card, 'source', 'port')()
    if (!from) return
    put(who, { wire: { from, color: `var(--soft-role-${role})` } })
    await move(who, handle(section, 'target', role), 750)
    put(who, { wire: null })
    song().connect(card, section, role)
    await click(who)
  }

  // ---- they join: their faces in the stack, their cursors in from the right
  const songId = useCrew.getState().songId
  if (!songId) return
  useWorkspace.getState().joinSong(songId, [...CREW])
  for (const [i, who] of CREW.entries()) {
    put(who, { at: off(0.3 + 0.2 * i), shown: true })
    void move(who, () => ({ x: window.innerWidth * (0.55 + 0.1 * i), y: window.innerHeight * (0.3 + 0.15 * i) }), 900)
    await sleep(250)
  }
  await sleep(1000)
  if (stopped()) return

  // ---- Thashin starts a Chorus to the right of everything on the canvas
  const nodes = song().nodes.map((n) => node(n.id)).filter((n): n is InternalNode<AnySongNode> => !!n)
  const right = Math.max(...nodes.map((n) => n.internals.positionAbsolute.x + (n.measured.width ?? 260)), 0)
  const sections = nodes.filter((n) => n.type === 'section')
  const top = sections.length ? Math.min(...sections.map((n) => n.internals.positionAbsolute.y)) : Math.min(...nodes.map((n) => n.internals.positionAbsolute.y), 0)
  // Far enough right that the cards they bring in fit between what's there and the Chorus, wired in from its left.
  const chorusAt = { x: right + 640, y: top + 200 }
  await move('thashin', () => screen(chorusAt), 900)
  await click('thashin')
  const chorus = song().addNode('section', chorusAt, { ...structuredClone(STARTING_DATA.section), name: 'Chorus' })
  await sleep(250)
  fit()
  await sleep(800)
  if (stopped()) return

  // ---- Naziat brings a Feeling and plugs it in; Tory brings Brushed drums; Naziat, Strings
  // A column in the gap left of the Chorus, clear of its lanes (centres; the cards are about 270 wide).
  const cardAt = (dy: number) => {
    const c = node(chorus)
    const x = (c?.internals.positionAbsolute.x ?? chorusAt.x - 160) - 250
    const y = (c?.internals.positionAbsolute.y ?? chorusAt.y - 170) + 120 + dy
    return { x, y }
  }
  const joy = await bring('naziat', 'feeling', cardAt(0), { name: 'Joy', amount: 0.7 })
  const drumsP = bring('tory', 'instrument', cardAt(130), { tab: 'Drums', name: 'Brushed drums', detail: 'soft, behind the beat', thumb: INSTRUMENT_PHOTOS['Brushed drums'] })
  await sleep(400)
  fit()
  await wire('naziat', joy, chorus, 'mood')
  const drums = await drumsP
  await sleep(200)
  const stringsP = bring('naziat', 'instrument', cardAt(270), { tab: 'Strings', name: 'Strings', detail: 'slow and swelling', thumb: INSTRUMENT_PHOTOS.Strings })
  await wire('tory', drums, chorus, 'instruments')
  const strings = await stringsP
  fit()
  await sleep(500)
  await wire('naziat', strings, chorus, 'instruments')
  if (stopped()) return

  // ---- Thashin hears two ideas for it
  await move('thashin', () => rect(buttonIn(chorus, /Hear 2 ideas/)), 900)
  await click('thashin')
  song().makeTakes(chorus)
  await sleep(500)
  fit()
  await sleep(3400)
  if (stopped()) return

  // ---- Tory plays the Chorus's Take A, then puts it in the song
  const takeA = song().nodes.find((n) => n.type === 'take' && n.data.sectionId === chorus && n.data.version === 'A')?.id
  if (!takeA) return
  await move('tory', () => rect(buttonIn(takeA, /^Play take A/)), 900)
  await click('tory')
  song().setPlaying(takeA)
  await sleep(4200)
  await move('tory', () => rect(buttonIn(takeA, /Add to timeline/)), 700)
  await click('tory')
  song().addToTimeline(takeA)
  // The timeline rises and the canvas gives it room: frame everything again once it has.
  await sleep(700)
  fit()
  await sleep(800)
  if (stopped()) return

  // ---- and they leave notes on the timeline: Naziat on the Chorus, Thashin on the hum at the start
  const s = song()
  const items = clipsOf(s.nodes, s.songId ? s.arrangements[s.songId] : undefined)
  const startOf = (i: number) => items.slice(0, i).reduce((t, it) => t + playTime(it.clip), 0)
  const ci = items.findIndex((it) => it.take.id === takeA)
  const note = async (who: Who, clipIndex: number, into: number, text: string) => {
    const clip = items[clipIndex]
    if (!clip) return
    await move(who, () => {
      const el = document.querySelector(`[data-clip="${clip.clip.id}"]`)
      const r = el?.getBoundingClientRect()
      return r ? { x: r.left + 24 + into * 14, y: r.top + 12 } : null
    }, 900)
    await click(who)
    put(who, { typing: true })
    await sleep(1300)
    put(who, { typing: false })
    useSong.getState().addComment({ t: startOf(clipIndex) + into }, text, who, true)
  }
  await note('naziat', ci, 2, 'this part made me cry 🥹')
  await sleep(500)
  await note('thashin', 0, 1, 'the hum at the start 😭')
  await sleep(800)
  // Then they drift off to the side, still here.
  void move('thashin', () => ({ x: window.innerWidth * 0.72, y: window.innerHeight * 0.38 }), 1200)
  void move('naziat', () => ({ x: window.innerWidth * 0.8, y: window.innerHeight * 0.5 }), 1200)
  void move('tory', () => ({ x: window.innerWidth * 0.66, y: window.innerHeight * 0.55 }), 1200)
}
