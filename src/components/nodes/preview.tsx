import { Handle, type HandleProps } from '@xyflow/react'
import { useContext, type CSSProperties } from 'react'
import { Preview } from './previewContext'

/** A Handle on the canvas; nothing in a preview. */
export function NodeHandle({ className, style, ...props }: HandleProps & { className?: string; style?: CSSProperties }) {
  // An example doesn't connect to anything, so it shows no connectors.
  if (useContext(Preview)) return null
  return <Handle className={className} style={style} {...props} />
}
