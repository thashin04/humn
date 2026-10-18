import {
  AlignLeft,
  Emoji,
  FavouriteBook,
  MediaImage,
  Microphone,
  MusicDoubleNote,
  ViewColumns3,
  Voice,
} from 'iconoir-react'
import type { ComponentType, SVGProps } from 'react'
import type { Kind } from '@/data/nodes'

/** Iconoir icon per kind, shared by the rail and its drawer tiles. */
export const KIND_ICONS: Record<Kind, ComponentType<SVGProps<SVGSVGElement>>> = {
  words: AlignLeft,
  voice: Microphone,
  photo: MediaImage,
  feeling: Emoji,
  sound: Voice,
  color: FavouriteBook,
  instrument: ViewColumns3,
  chords: MusicDoubleNote,
}
