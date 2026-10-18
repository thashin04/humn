import birthday from '@/assets/photos/template-birthday.jpg'
import redHouse from '@/assets/photos/template-photo.jpg'
import type { AnySongNode, Pipe, Role } from './nodes'

export type TemplateId = 'photo' | 'birthday'

export type Template = {
  id: TemplateId
  name: string
  /** What it's made of, as on the card ("photo + feeling + words"). */
  ingredients: string
  description: string
  image: string
}

export const templates: Template[] = [
  {
    id: 'photo',
    name: 'Song from a photo',
    ingredients: 'photo + feeling + words',
    description: 'Start from one picture. Say how it feels and what it was, and hear it back.',
    image: redHouse,
  },
  {
    id: 'birthday',
    name: 'Birthday song',
    ingredients: 'words + photo + a voice',
    description: 'For someone you love. A few words, a photo of them, and a voice they know.',
    image: birthday,
  },
]

type Seed = { id: string; role?: Role; node: Omit<AnySongNode, 'id' | 'origin'> }

/**
 * What each template puts on the canvas: its pieces on the left, already
 * plugged into a Verse on the right.
 */
const SEEDS: Record<TemplateId, Seed[]> = {
  photo: [
    { id: 'words', role: 'intent', node: { type: 'words', position: { x: 0, y: -230 }, data: { text: 'the summers we spent at the red house' } } },
    { id: 'photo', role: 'mood', node: { type: 'photo', position: { x: 0, y: 10 }, data: { caption: 'The red house, 1997', src: redHouse } } },
    { id: 'feeling', role: 'mood', node: { type: 'feeling', position: { x: 0, y: 205 }, data: { name: 'Nostalgia', amount: 0.7 } } },
  ],
  birthday: [
    { id: 'words', role: 'intent', node: { type: 'words', position: { x: 0, y: -230 }, data: { text: "for Nana's 80th, warm and slow" } } },
    { id: 'photo', role: 'mood', node: { type: 'photo', position: { x: 0, y: 10 }, data: { caption: 'Rain on the lake', src: birthday } } },
    { id: 'voice', role: 'melody', node: { type: 'voice', position: { x: 0, y: 200 }, data: { label: 'Nana humming', duration: 47 } } },
  ],
}

/** Fresh nodes for a template, already piped into a Verse; ids are prefixed so a song can hold more than one. */
export function templateNodes(id: TemplateId, prefix: string): { nodes: AnySongNode[]; edges: Pipe[] } {
  const sectionId = `${prefix}-section`
  const edges: Pipe[] = []
  const nodes = SEEDS[id].map((s) => {
    const nodeId = `${prefix}-${s.id}`
    if (s.role) edges.push(pipe(nodeId, sectionId, s.role))
    return { ...structuredClone(s.node), id: nodeId, origin: [0.5, 0.5] } as AnySongNode
  })
  const section = {
    id: sectionId,
    type: 'section',
    position: { x: 420, y: 0 },
    origin: [0.5, 0.5],
    data: { name: 'Verse', length: 30 },
  } as AnySongNode
  return { nodes: [...nodes, section], edges }
}

export function pipe(source: string, target: string, role?: Role): Pipe {
  return {
    id: `${source}>${target}:${role ?? 'take'}`,
    type: 'pipe',
    source,
    sourceHandle: 'out',
    target,
    targetHandle: role ?? 'in',
    data: { role },
  }
}
