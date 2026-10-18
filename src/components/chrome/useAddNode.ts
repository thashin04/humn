import { useReactFlow, useStoreApi } from '@xyflow/react'
import type { NodeKind } from '@/data/nodes'
import { useSong } from '@/store/song'

/** Drops a new node in the middle of what's on screen, stepping down-right if that spot is taken. */
export function useAddNode() {
  const { screenToFlowPosition } = useReactFlow()
  const store = useStoreApi()
  const addNode = useSong((s) => s.addNode)

  return (kind: NodeKind, data?: Record<string, unknown>) => {
    const box = store.getState().domNode?.getBoundingClientRect()
    if (!box) return
    const at = screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
    const taken = (x: number, y: number) =>
      useSong.getState().nodes.some((n) => Math.abs(n.position.x - x) < 12 && Math.abs(n.position.y - y) < 12)
    let step = 0
    while (taken(at.x + step * 28, at.y + step * 28)) step++
    addNode(kind, { x: at.x + step * 28, y: at.y + step * 28 }, data)
  }
}
