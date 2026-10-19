import { createContext } from 'react'

/**
 * Inside this, nodes are drawn as examples (the empty canvas's fan) rather than
 * living on the canvas: no React Flow node around them, so nothing to wire up.
 */
export const Preview = createContext(false)
