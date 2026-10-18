import type { NodeTypes } from '@xyflow/react'
import {
  ChordsNode,
  ColorNode,
  FeelingNode,
  InstrumentNode,
  LyricsNode,
  PhotoNode,
  SoundNode,
  VoiceNode,
  WordsNode,
} from './nodes'
import { TakeNode } from './take'

import { GhostNode } from './ghost'
import { SectionNode } from './section'

export const nodeTypes: NodeTypes = {
  ghost: GhostNode,
  words: WordsNode,
  lyrics: LyricsNode,
  voice: VoiceNode,
  photo: PhotoNode,
  feeling: FeelingNode,
  sound: SoundNode,
  color: ColorNode,
  instrument: InstrumentNode,
  chords: ChordsNode,
  section: SectionNode,
  take: TakeNode,
}
