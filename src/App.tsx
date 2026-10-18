import { ReactFlowProvider } from '@xyflow/react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { SongCanvas } from '@/components/SongCanvas'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Workspace } from '@/pages/workspace/Workspace'

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delay={300}>
        <Routes>
          <Route path="/" element={<Workspace />} />
          <Route
            path="/song/:songId"
            element={
              <ReactFlowProvider>
                <SongCanvas />
              </ReactFlowProvider>
            }
          />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  )
}
