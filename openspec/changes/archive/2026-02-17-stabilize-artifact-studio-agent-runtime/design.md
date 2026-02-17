## Overview

This change refactors Artifact Studio into an agent-driven workflow with strict protocol separation between chat and code streams, deterministic built-in agent identity, compile/HTMX recovery, durable history, and React/XHTML parity.

Target outcomes:
- align runtime behavior to modern visual coding workflows (chat + code + live preview),
- enforce a deterministic protocol for what reaches code view vs chat view,
- preserve user-edited agent strategy/model settings across sessions,
- provide durable history and version navigation with restart-safe persistence,
- make implementation decisions traceable to explicit external and local evidence.

## Research Notes

### External product evidence

1. v0 (Vercel)
- v0 documents an integrated code editor + preview workflow with diff view, inline editing, and direct file edits in the same session: [v0 Code editing](https://vercel.com/docs/v0/code-editing).
- v0 positions real-time preview and rich agent action feedback as core UX: [What is v0](https://vercel.com/docs/v0).
- v0 engineering describes reliability strategy using dynamic system prompts, streaming-time manipulation, and deterministic/model-driven autofix passes: [How we made v0 an effective coding agent](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent).

2. Lovable
- Lovable Code Mode provides direct source editing and file-referenced chat targeting (`@file`) in one project context: [Code mode](https://docs.lovable.dev/features/code-mode).
- Lovable 2.0 separates planning/debug chat agent behavior from direct code-edit mode, showing explicit workflow boundaries between chat and edit paths: [Lovable 2.0](https://lovable.dev/blog/lovable-2-0).

3. OpenAI Canvas
- Canvas uses a dedicated editing surface beside chat, supports direct edits, inline suggestions, and version navigation/restore: [Introducing canvas](https://openai.com/index/introducing-canvas/) and [Canvas help](https://help.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt-and-how-do-i-use-it).
- Canvas documents React/HTML sandbox rendering and explicit version history controls (back/restore/show-changes), validating compile/render parity and timeline UX as first-class behavior.

4. Claude Artifacts
- Claude artifacts are rendered in a dedicated side window, separate from chat, with version selector and “Try fixing with Claude” recovery loop: [What are artifacts](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them).
- Claude also documents persistent storage concepts for artifact state and multi-version iteration.

5. Bolt / Bolt.diy
- Bolt prompt contract requires structured artifact/action tags and full updated file content (not deltas/partials): [bolt.new prompt source](https://github.com/stackblitz/bolt.new/blob/main/app/lib/.server/llm/prompts.ts).
- Open-source bolt.diy prompt text repeats strict full-file and artifact tag requirements: [bolt.diy prompts.ts](https://github.com/stackblitz-labs/bolt.diy/blob/main/app/lib/common/prompts/prompts.ts).

### Local bolt.diy code evidence (filesystem)

Local reference repo: `/Users/gqadonis/Projects/prometheus/bolt.diy`

- `app/lib/common/prompts/prompts.ts:37` states no diff/patch editing and requires full code output.
- `app/lib/common/prompts/prompts.ts:45` enforces mandatory artifact wrapper format.
- `app/lib/runtime/message-parser.ts:30` defines streaming callbacks for open/stream/close events.
- `app/lib/runtime/message-parser.ts:98` parses incrementally and strips artifact payload from chat output.
- `app/lib/runtime/message-parser.spec.ts:26` and `:53` validate incremental chunk parsing behavior.
- `app/lib/runtime/enhanced-message-parser.ts:39` shows fallback wrapping behavior when model output is not properly tagged.

Inference from the above: robust studio behavior requires a strict streaming parser boundary plus a compatibility fallback path for imperfect model outputs.

## Behavior Matrix

| Source | Verified behavior | Decision in this change |
| --- | --- | --- |
| v0 docs + code editing | Dedicated code/preview workflow with direct edits and diff visibility | Keep Artifact Studio code-view authoritative for protocol-tagged code; keep chat separate and cumulative |
| v0 engineering blog | Streaming-time cleanup + deterministic autofix improves success rates | Add bounded compile/HTMX auto-fix pipeline on active route |
| Lovable docs/blog | Explicit separation between chat planning mode and direct code editing mode | Route Studio prompts through agent/session runtime while preserving separate code/render surface |
| Bolt prompt + parser | Strict tag contract and full-file outputs; incremental parser strips tool payload from chat | Use `<cs-studio-code>` as primary contract, stream code only to code pane, keep non-targeted content in chat |
| OpenAI Canvas | Side-by-side editing + version history/restore + sandbox rendering | Add timeline controls and version restore context in active Studio route |
| Claude Artifacts | Dedicated artifact pane, iterative versions, error-fix loop | Keep artifact content isolated from chat and wire error-to-fix workflow |

## Decisions

1. Deterministic built-in Artifact Studio agent identity
- Decision: upsert one stable id (`artifact-studio`) at startup; never random-create duplicates.
- Evidence: runtime agents must be addressable and stable across sessions (v0/Lovable/Canvas workflows).
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/main/services/agents/services/initializeArtifactStudioAgent.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/main/services/agents/services/AgentService.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/main/index.ts`

2. Editable defaults with persistent strategy/model configuration
- Decision: initialize defaults once but preserve user edits for model/strategy settings.
- Evidence: Lovable/Canvas/Artifacts workflows assume iterative project memory and controllable behavior.
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/main/services/agents/services/initializeArtifactStudioAgent.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/store/__tests__/settings.artifact-studio.test.ts`

3. Default skill binding for artifact refinement
- Decision: bind `artifact-refiner` by default to `artifact-studio` and ensure enabled resolution includes it.
- Evidence: user requirement + skill-centric orchestration model.
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/main/services/agents/services/initializeArtifactStudioAgent.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/main/services/SkillService.ts`

4. Agent/session runtime execution path (no direct completion bypass)
- Decision: Studio refinement executes via runtime session APIs so agent settings are authoritative.
- Evidence: v0/Lovable/Canvas all center stateful iterative runtime behavior rather than isolated single-call completion.
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/services/ArtifactStudioRuntimeService.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/hooks/useArtifactRefinement.ts`

5. Strict stream partition with `<cs-studio-code>` contract
- Decision: only `<cs-studio-code>` blocks feed code view/compile input; all non-targeted chunks stay in chat; chat streams cumulatively.
- Evidence: bolt parser pattern + dedicated canvas/artifact panes in OpenAI/Anthropic products.
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/utils/studioStreamParser.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/hooks/useArtifactRefinement.ts`

6. Legacy compatibility fallback after studio-first extraction
- Decision: prefer `<cs-studio-code>` reflection/extraction first, then bounded legacy fallback if absent.
- Evidence: enhanced parser fallback pattern in bolt.diy (`enhanced-message-parser.ts`).
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/hooks/useArtifactRefinement.ts`

7. Stream skill activation blocks into Artifact Studio chat
- Decision: emit and render `SKILL_ACTIVATION` chunks in chat pane (not code pane) during runtime turns.
- Evidence: requirement for actionable runtime transparency and product parity with rich agent-action feedback.
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/aiCore/chunk/AiSdkToChunkAdapter.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/hooks/useArtifactRefinement.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/pages/artifacts/components/ArtifactChatPanel.tsx`

8. Compile and HTMX recovery on active Studio route
- Decision: auto-fix retries and status must be wired where users actually work (active page route), including `htmx:error` routing.
- Evidence: v0 autofix reliability pattern and Claude “fix with Claude” loop.
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/pages/artifacts/components/ArtifactPreviewPane.tsx`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/pages/artifacts/ArtifactPage.tsx`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/components/ArtifactRenderer.tsx`

9. Durable chat + version history persistence
- Decision: persist refinement messages and version-linked snapshots in Dexie and rehydrate Redux on reopen.
- Evidence: Canvas/Artifacts version-navigation expectations and persistent artifact memory model.
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/db/artifactDb.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/store/artifacts.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/pages/artifacts/ArtifactPage.tsx`

10. React + XHTML parity with validation
- Decision: keep full-file React generation rules and enforce XHTML well-formedness in refine/delivery paths.
- Evidence: canvas/artifacts both support code rendering loops; user requirement explicitly needs React + XHTML parity.
- Implementation:
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/agent/artifactStudioPrompt.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/utils/xhtmlValidation.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/features/artifacts/services/ArtifactPackageService.ts`

## Risks and Mitigations

1. Risk: model outputs malformed or missing `<cs-studio-code>` markers.
- Mitigation: studio-first parser validation plus bounded legacy fallback and explicit reflection failure diagnostics.

2. Risk: auto-fix loops can oscillate on persistent compile/runtime errors.
- Mitigation: bounded retry counts with visible status and max-attempt termination.

3. Risk: persisted history growth impacts local storage over time.
- Mitigation: keep schema/versioning explicit and enforce pragmatic storage policy boundaries in DB layer.

4. Risk: protocol drift between system prompt contract and parser behavior.
- Mitigation: parser unit tests + runtime routing tests + explicit protocol language in prompt artifact.

5. Risk: skill visibility regressions (missing activation blocks in UI).
- Mitigation: dedicated adapter and chat-panel tests for `SKILL_ACTIVATION` chunk rendering.
