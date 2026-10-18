# humn

A collaborative, AI-assisted music creation tool that turns everyday forms of expression into musical stories.

> Brand note: the product name is always lowercase: **humn**.

## Project context

- Portfolio project responding to a design challenge: build for a specific, niche audience, centered on the theme of **storytelling**.
- Built by a small team. Design-led, with a working prototype in this repo.

## The problem

Music is universal, but making it isn't.

- **Traditional DAWs** (e.g. GarageBand) assume knowledge of tracks, timelines, MIDI, mixing, and music theory.
- **AI generators** (e.g. Suno) remove the technical barrier but reduce people to writing prompts, producing finished songs with little hands-on exploration, decision-making, or collaboration.

**How might we** make music creation accessible to people without formal musical experience, while preserving the experimentation, collaboration, and human expression that make creativity meaningful?

## Point of view

AI belongs in music, but human expression stays at the center. AI handles the technical translation into sound; people make the creative decisions.

## Target user

Creatively curious young adults who love music but have little or no production experience, especially **friends who want to make something together**. They already express themselves through playlists, photos, journaling, videos, and shared memories.

## The product

A **shared, node-based infinite canvas**. Users add media as nodes, connect them, and hear how those relationships shape the music.

### Core actions

1. **Contribute anything**: a word, emotion, color, photo, video, voice recording, audio sample, or memory can become a node.
2. **Connect and experiment**: arrange nodes spatially and link them. Different combinations and relationships change the sound. Collaborators build on each other in real time.
3. **Listen to your story**: AI interprets the connected inputs into a composition. Users listen, rearrange, refine, and keep iterating.

Music should emerge from human decisions over many iterations, not from a single prompt.

## Inspiration / landscape

| Category | Example | Takeaway |
| --- | --- | --- |
| Traditional DAW | GarageBand | Powerful but built on musician mental models |
| AI generation | Suno | Accessible via natural language, but passive |
| Node-based creative tools | Figma Weave | Flexible and expressive, but technical node types add their own learning curve |

**Opportunity:** reinterpret the node-based model for non-technical users, using familiar creative inputs and intuitive connections instead of specialized audio-processing components.

## Open design questions

These are actively being explored. Don't treat any one answer as final.

1. **Mental model**: timeline vs. node canvas vs. hybrid. Can users explore spatially and still understand how music unfolds over time?
2. **Meaningful connections**: does a connection mean sequence, influence, or blending? How do users know what connecting two nodes does?
3. **Expression to control**: mood rings, gradients, sliders, descriptive language, or direct audio manipulation.
4. **Narrative structure**: free sound collage vs. emotional arc vs. beginning/middle/end.
5. **Guidance level**: empty canvas vs. presets vs. contextual suggestions with progressive disclosure.

## Guardrails for building

- Keep it approachable. Avoid exposing audio-engineering jargon (MIDI, BPM, EQ, tracks) in the UI unless deliberately disclosed.
- An earlier version drifted too technical. When in doubt, favor the non-musician's mental model.
- AI is a supporting tool, never the author. Every output should trace back to something a person contributed or decided.
- Collaboration is core, not an add-on.
