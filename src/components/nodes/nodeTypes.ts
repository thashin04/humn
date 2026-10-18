import type { NodeTypes } from '@xyflow/react'
import {
  ChordsNode,
  ColorNode,
  FeelingNode,
  InstrumentNode,
  PhotoNode,
  SectionNode,
  SoundNode,
  VoiceNode,
  WordsNode,
} from './nodes'
import { TakeNode } from './take'

export const nodeTypes: NodeTypes = {
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
