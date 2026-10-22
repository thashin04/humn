export type Collaborator = { id: string; name: string; initial: string; color: string; photo?: string }

// Demo collaborators use colored initials instead of profile photos.
export const collaborators: Collaborator[] = [
  { id: 'ines', name: 'Alex Smith', initial: 'A', color: '#3c3c40' },
  { id: 'kofi', name: 'Kofi', initial: 'K', color: '#d2622e' },
  { id: 'sol', name: 'Sol', initial: 'S', color: '#3e7f5e' },
  { id: 'ada', name: 'Ada', initial: 'A', color: '#7a5af8' },
  // The team who join when the song is shared to them (demo).
  { id: 'thashin', name: 'Thashin', initial: 'T', color: '#d9622b' },
  { id: 'naziat', name: 'Naziat', initial: 'N', color: '#c2417a' },
  { id: 'tory', name: 'Tory', initial: 'T', color: '#3e7f5e' },
  // Who the team's notes on the timeline are from (demo): with matching collaborator colors.
  { id: 'daniel', name: 'Daniel', initial: 'D', color: '#d9622b' },
  { id: 'maya', name: 'Maya', initial: 'M', color: '#c2417a' },
]

/** Who's in each group chat a song can be shared to (demo). */
export const CHATS: { id: string; name: string; members: string[] }[] = [
  { id: 'team', name: 'Team 😎', members: ['thashin', 'naziat', 'tory'] },
  { id: 'nana', name: 'Nana’s 80th', members: ['kofi', 'sol'] },
  { id: 'ada', name: 'Ada', members: ['ada'] },
]

export const ME = 'ines'

export const collaborator = (id: string) => collaborators.find((c) => c.id === id)!
