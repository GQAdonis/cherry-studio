## Context
Current implementation already provides:
- Artifact detection/rendering in chat via `<cs-artifact>`.
- Full-screen artifact modal with chat + workspace split.
- React Sandpack rendering with configurable dependencies and bundler URL.
- Artifact persistence/version history in IndexedDB.
- Partial stream chunk support for `skill.activation` and `context.action` in chunk adapter.

Gaps relative to the requested target:
- No dedicated artifact-first workspace model independent from originating conversation.
- No explicit PMPO orchestration contract for artifact creation/refinement.
- No end-to-end requirement that all skills/context actions are always surfaced as stream chunks in artifact flows.
- No XHTML-specific editing/validation lifecycle requirements.
- Limited product-level requirements for packaging and delivery-ready artifacts.

## Goals
- Make artifacts a first-class product surface (not only a chat byproduct).
- Provide novice-to-advanced runtime capabilities with safe defaults.
- Make agentic actions explicit and inspectable during artifact creation/refinement.
- Preserve portability: artifacts can be reopened, iterated, tested, and delivered later.

## Non-Goals
- Replacing existing chat-based artifact creation.
- Defining one immutable UX mock; implementation may iterate as long as requirements hold.
- Full redesign of unrelated non-artifact settings areas.

## Proposed Architecture
### 1. Artifact Studio Workspace Model
- Introduce an Artifact Studio surface with explicit `artifactProject` identity.
- Support entry points from chat artifact, library item, or blank artifact template.
- Persist studio sessions independent of conversation lifecycle.

### 2. Runtime Profiles (Novice -> Advanced)
- Add runtime profiles with increasing control:
  - Basic: safe defaults, managed dependencies.
  - Standard: dependency and preview controls.
  - Advanced: custom bundler/runtime controls, package registry mapping, diagnostics.
- Keep guarded defaults for network and external resource behavior.

### 3. XHTML Capability Layer
- Add XHTML artifact type profile with explicit MIME/doctype/validation behavior.
- Validate well-formedness and report actionable errors before publish/package.
- Preserve editable source and metadata in library for subsequent refinement.

### 4. PMPO Artifact Agent
- Standardize orchestration phases:
  - `spec`: clarify intent/constraints/success criteria.
  - `plan`: produce structured implementation/testing plan.
  - `execute`: generate/apply changes with tool orchestration.
  - `reflect`: evaluate output against constraints and run validation/test loops.
- Enable skill and context strategy usage in each phase with deterministic phase transitions.

### 5. Stream Observability Contract
- Require explicit chunks when orchestration uses:
  - skills (`skill.activation`)
  - context management actions (`context.action`)
  - artifact lifecycle milestones (`artifact.lifecycle` proposed)
- Ensure same visibility guarantees for assistant and agent execution paths.

### 6. Library + Delivery Pipeline
- Treat library item as durable artifact asset, not only saved chat output.
- Add explicit packaging/export model (downloadable deliverables with metadata manifest).
- Preserve provenance: source artifact, revisions, validation status, delivery bundle info.

## Trade-offs
- Increased orchestration transparency raises stream/event volume.
  - Mitigation: event aggregation and compact UI rendering modes.
- Advanced runtime controls increase security risk.
  - Mitigation: scoped capability flags + secure defaults + admin governance.
- PMPO loops may increase latency.
  - Mitigation: profile-based behavior and optional fast path for simple edits.

## Validation Strategy
- Integration-first verification across renderer/main/agent boundaries.
- Add artifact-flow integration tests for chunk visibility and PMPO phase sequencing.
- Add runtime tests for XHTML validation and Sandpack advanced controls.
- Add regression tests for cases where skill/context actions happened but were not surfaced in stream.

## Research References
- Claude Artifacts: https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them
- Claude artifact publishing/sharing: https://support.claude.com/en/articles/9547008-publishing-and-sharing-artifacts
- ChatGPT Canvas: https://help.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt-and-how-do-i-use-it
- Sandpack usage: https://sandpack.codesandbox.io/docs/getting-started/usage
- Sandpack bundler hosting: https://sandpack.codesandbox.io/docs/guides/hosting-the-bundler
- Replit Agent: https://docs.replit.com/replitai/agent
- Replit App Testing: https://docs.replit.com/replitai/app-testing
- Replit checkpoints/rollbacks: https://docs.replit.com/replitai/checkpoints-and-rollbacks
- Replit preview tooling: https://docs.replit.com/replit-workspace/workspace-features/preview
- v0 docs/FAQ: https://v0.app/docs/faqs
- Bolt.new repo: https://github.com/stackblitz/bolt.new
- Lovable visual edits: https://lovable.dev/blog/introducing-visual-edits
- Lovable implementation details: https://lovable.dev/blog/visual-edits
