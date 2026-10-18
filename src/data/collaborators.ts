export type Collaborator = { id: string; name: string; initial: string; color: string }

// From the Figma Avatar component (Ines, Kofi, Sol, Ada).
export const collaborators: Collaborator[] = [
  { id: 'ines', name: 'Ines Chow', initial: 'I', color: '#3c3c40' },
  { id: 'kofi', name: 'Kofi', initial: 'K', color: '#d2622e' },
  { id: 'sol', name: 'Sol', initial: 'S', color: '#3e7f5e' },
  { id: 'ada', name: 'Ada', initial: 'A', color: '#7a5af8' },
]

export const ME = 'ines'

export const collaborator = (id: string) => collaborators.find((c) => c.id === id)!
