import { nameOf } from './library'
import { DEFAULT_ROLE, type AnySongNode, type Kind, type Role } from './nodes'

export type Reading = { role: Role; energy: number }

// Words people use, and the feel they suggest. A stand-in for the model's reading.
const FEELS: { words: RegExp; feel: string; energy: number }[] = [
  { words: /\b(slow|warm|soft|gentle|sleep|lullaby|quiet|calm|night|nana|grand)/i, feel: 'slow, warm', energy: 0.25 },
  { words: /\b(sad|miss|lost|rain|goodbye|alone|remember|memor)/i, feel: 'tender, a little wistful', energy: 0.3 },
  { words: /\b(road|trip|drive|summer|beach|sun|windows)/i, feel: 'easy, open-road', energy: 0.6 },
  { words: /\b(party|birthday|dance|happy|celebrat|friends|loud)/i, feel: 'bright, bouncing', energy: 0.8 },
]

/** Where someone's first contribution plugs in, and how lively it sounds, for the verse suggested from it. */
export function interpret(node: AnySongNode): Reading {
  const said = nameOf(node.data as Record<string, unknown>).trim()
  return {
    role: DEFAULT_ROLE[node.type as Kind] ?? 'intent',
    energy: (FEELS.find((f) => f.words.test(said)) ?? { energy: 0.45 }).energy,
  }
}

/** What someone said a plugged-in card should do, kept with the slot it was said for. */
export type Influence = { role: Role; text: string }

/**
 * A plain-language reading of what a plugged-in card does to the music, so a
 * photo in Harmony or a gradient in Melody says what it means. People can
 * replace it with their own words; this is the starting point.
 */
export function purposeOf(node: AnySongNode, role: Role): string {
  const d = node.data as Record<string, unknown>
  const said = nameOf(d).trim()
  const name = said.length > 26 ? `${said.slice(0, 24).trimEnd()}…` : said
  const feel = FEELS.find((f) => f.words.test(said))?.feel
  switch (role) {
    case 'melody':
      return node.type === 'voice' ? 'The verse follows the shape of your hum' : `A tune drawn from ${name ? `“${name}”` : 'this'}`
    case 'harmony':
      return node.type === 'chords' ? 'These chords sit underneath' : `Chords that feel ${feel ?? 'like this looks'}`
    case 'mood':
      if (node.type === 'feeling') return `${name}, at ${Math.round(Number(d.amount ?? 0.5) * 100)}%`
      return `${feel ? cap(feel) : node.type === 'color' ? 'The colours set the feel' : 'Sets the feel'}${name ? `, like “${name}”` : ''}`
    case 'lyrics':
      return 'Sung in the verse'
    case 'texture':
      return name ? `“${name}” sits quietly underneath` : 'Sits quietly underneath'
    case 'instruments':
      return name ? `${name} plays the verse` : 'Chooses what plays'
    default:
      return 'Shapes what the verse is about'
  }
}

/** The card's reading for `role`: what someone wrote for that slot, or the default. */
export function readingFor(node: AnySongNode, role: Role): string {
  const own = (node.data as { influence?: Influence }).influence
  return own?.role === role && own.text.trim() ? own.text : purposeOf(node, role)
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

const join = (names: string[]) =>
  names.length <= 2 ? names.join(' + ') : `${names.slice(0, 2).join(' + ')} + ${names.length - 2} more`

/** One line for everything plugged into a slot, read as a sentence about the verse ("Nana humming guides the tune"). */
export function slotSentence(cards: AnySongNode[], role: Role): string {
  const names = cards.map((c) => {
    const n = nameOf(c.data as Record<string, unknown>).trim()
    return n.length > 22 ? `${n.slice(0, 20).trimEnd()}…` : n || 'This'
  })
  const one = cards.length === 1
  const text = cards[0] && cards[0].type === 'words' ? nameOf(cards[0].data as Record<string, unknown>).trim() : ''
  const line = (nameOf((cards[0]?.data ?? {}) as Record<string, unknown>).trim().split('\n')[0] ?? '').trim()

  return {
    intent: text ? `About ${text.length > 52 ? `${text.slice(0, 50).trimEnd()}…` : text}` : `${join(names)} sets what it's about`,
    lyrics: line ? `“${line.length > 40 ? `${line.slice(0, 38).trimEnd()}…` : line}” gets sung` : 'Words to sing',
    melody: `${join(names)} guide${one ? 's' : ''} the tune`,
    harmony: `${join(names)} shape${one ? 's' : ''} the chords`,
    mood: `${join(names)} set${one ? 's' : ''} the feeling`,
    texture: `${join(names)} sit${one ? 's' : ''} underneath`,
    instruments: `${join(names)} play${one ? 's' : ''} it`,
  }[role]
}
