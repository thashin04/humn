import { nameOf } from './library'
import { DEFAULT_ROLE, ROLES, type AnySongNode, type Kind, type Role } from './nodes'

export type Reading = { line: string; role: Role; energy: number }

// Words people use, and the feel they suggest. A stand-in for the model's reading.
const FEELS: { words: RegExp; feel: string; energy: number }[] = [
  { words: /\b(slow|warm|soft|gentle|sleep|lullaby|quiet|calm|night|nana|grand)/i, feel: 'slow, warm', energy: 0.25 },
  { words: /\b(sad|miss|lost|rain|goodbye|alone|remember|memor)/i, feel: 'tender, a little wistful', energy: 0.3 },
  { words: /\b(road|trip|drive|summer|beach|sun|windows)/i, feel: 'easy, open-road', energy: 0.6 },
  { words: /\b(party|birthday|dance|happy|celebrat|friends|loud)/i, feel: 'bright, bouncing', energy: 0.8 },
]

/**
 * A short, plain-language read of what someone contributed, so the first part
 * suggested from it shows its working: what it heard, and where it plugs in.
 */
export function interpret(node: AnySongNode): Reading {
  const role = DEFAULT_ROLE[node.type as Kind] ?? 'intent'
  const said = nameOf(node.data as Record<string, unknown>).trim()
  const feel = FEELS.find((f) => f.words.test(said)) ?? { feel: 'simple, open', energy: 0.45 }
  const quote = said.length > 34 ? `${said.slice(0, 32).trimEnd()}…` : said
  const roleName = ROLES.find((r) => r.id === role)!.name.toLowerCase()
  return {
    line: quote ? `A ${feel.feel} opening built around “${quote}”, with it as the ${roleName}.` : `A ${feel.feel} opening, with this as the ${roleName}.`,
    role,
    energy: feel.energy,
  }
}
