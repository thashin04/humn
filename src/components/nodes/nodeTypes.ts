import type { NodeTypes } from '@xyflow/react'
import {
  ChordsNode,
  ColorNode,
  FeelingNode,
  InstrumentNode,
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
