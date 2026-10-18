# humn

A shared, node-based canvas that turns everyday expression into music. See `CLAUDE.md` for the product brief.

## Run it

```sh
npm install
npm run dev
```

## Stack

- **Vite + React + TypeScript**
- **React Flow** (`@xyflow/react`): the canvas, nodes and connections
- **Tone.js**: sound, generated live in the browser
- **Zustand**: app state
- **Tailwind CSS + shadcn/ui**: styling and components (`npx shadcn@latest add <component>`)
- **Motion**: animation
- **wavesurfer.js**: audio waveforms

No backend; data will be mocked.
