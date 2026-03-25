# Artifact Studio

Full artifact authoring, refinement, and rendering pipeline.

## Key Files
- `src/renderer/src/features/artifacts/` — Core (50+ files)
- `src/renderer/src/pages/artifacts/` — Page components
- `src/renderer/src/store/artifacts.ts` — Redux state

## Subsystems
- **Agent** — PMPO refinement engine, artifact designer prompt
- **Renderer** — Multi-format (HTML, React, SVG, Mermaid, HTMX)
- **Services** — Runtime, package management, conversation summarizer
- **DB** — Dexie (IndexedDB) for artifact persistence

## Upstream Impact
- Modifies: `store/settings.ts` (artifact settings)
- Deps: `@codesandbox/sandpack-react`, `@codesandbox/sandpack-themes`
