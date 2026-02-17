## Why

Artifact Studio currently has critical reliability gaps between intended behavior and runtime behavior:
- the Artifact Studio agent is not guaranteed to be stable/idempotent across startup cycles,
- Artifact Studio refinement can bypass the agent/session runtime and call LLM APIs directly,
- chat/code stream separation is not consistently cumulative and protocol-enforced,
- compile/HTMX recovery and version-navigation UX are split across inactive vs active Studio surfaces,
- refinement chat history and version-linked navigation state are not durably restored.

These gaps prevent Artifact Studio from behaving like a production-grade visual code designer workflow and break the expectation that users can reliably configure and persist agent/runtime strategy choices.

## What Changes

- Stabilize Artifact Studio agent initialization with deterministic identity, API visibility, and persisted editable defaults.
- Bind `artifact-refiner` as the default skill for the Artifact Studio agent.
- Route Artifact Studio refinement through agent/session runtime instead of direct LLM calls.
- Enforce strict `<cs-studio-code>` protocol behavior for code-vs-chat stream routing and reflection validation.
- Wire compile and HTMX error recovery in the active Studio page, with bounded auto-fix retries and visible status.
- Persist refinement chat + version-linked history durably and restore on reopen.
- Guarantee React (TSX) and XHTML refinement/validation parity.
- Capture research-backed design evidence (Tavily + local bolt.diy) with explicit decision traceability.

## Scope Notes

- In scope: behavior, contracts, persistence, runtime routing, and verification for Artifact Studio agent-driven refinement.
- In scope: API and startup guarantees for `artifact-studio` agent identity and configuration persistence.
- Out of scope: unrelated assistant/agent UX outside Artifact Studio.
- Out of scope: replacing all legacy `<cs-artifact>` support; legacy compatibility may remain as bounded fallback.

## Capabilities

1. `artifact-studio-agent-definition`
- Built-in Artifact Studio agent is deterministic, idempotent, API-visible, and editable.
- Artifact Studio agent has default runtime values and default `artifact-refiner` binding.

2. `artifact-studio-agent-runtime-execution`
- Artifact Studio prompts execute via agent/session runtime and persist runtime strategy choices.

3. `artifact-studio-stream-protocol`
- Strict code/chat stream partitioning and cumulative streaming behavior using `<cs-studio-code>`.
- Reflection validates studio protocol output as primary contract.

4. `artifact-studio-compile-recovery-ui`
- Active Studio route provides compile/HTMX recovery, bounded auto-fix support, and integrated timeline/status UX.

5. `artifact-studio-persistence-history`
- Durable persistence and restoration of refinement chat, versions, and version-linked navigation.

6. `artifact-studio-format-parity`
- React (TSX) and XHTML refinement paths are both fully supported and validated.

7. `artifact-studio-research-traceability`
- Design decisions are backed by documented research evidence and mapped implementation choices.

## Impact

- Affected specs:
  - `artifact-studio-agent-definition`
  - `artifact-studio-agent-runtime-execution`
  - `artifact-studio-stream-protocol`
  - `artifact-studio-compile-recovery-ui`
  - `artifact-studio-persistence-history`
  - `artifact-studio-format-parity`
  - `artifact-studio-research-traceability`
- Primary code areas (planned):
  - `src/main/services/agents/services/initializeArtifactStudioAgent.ts`
  - `src/main/services/agents/services/AgentService.ts`
  - `src/main/services/SkillService.ts`
  - `src/main/apiServer/routes/agents/**`
  - `src/renderer/src/features/artifacts/hooks/useArtifactRefinement.ts`
  - `src/renderer/src/features/artifacts/utils/studioStreamParser.ts`
  - `src/renderer/src/features/artifacts/hooks/useCompilationErrorHandler.ts`
  - `src/renderer/src/pages/artifacts/ArtifactPage.tsx`
  - `src/renderer/src/pages/artifacts/components/ArtifactPreviewPane.tsx`
  - `src/renderer/src/features/artifacts/db/artifactDb.ts`
  - `src/renderer/src/store/artifacts.ts`
