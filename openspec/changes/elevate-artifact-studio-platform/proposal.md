## Why
Artifact support in the current product is strong inside conversations (modal workspace, inline rendering, library persistence), but it is not yet a first-class, standalone build environment with agentic orchestration, advanced runtime controls, and explicit lifecycle telemetry.

Recent production issues also showed that hidden orchestration behavior (skills/context actions) can occur without reliable user-visible streaming evidence. For an S-tier artifact creator/editor, artifact generation and refinement must be transparent, debuggable, and reusable outside the originating chat.

## What Changes
- Introduce a dedicated Artifact Studio workflow that supports creating and editing artifacts independently from conversations.
- Add advanced runtime tiers for artifacts (novice to advanced), including expanded Sandpack controls and hardened sandbox governance.
- Add XHTML-first authoring and rendering support with validation and long-lived editable storage.
- Add PMPO-based artifact orchestration (spec -> plan -> execute -> reflect) with explicit skill/context usage integration.
- Add explicit stream chunk requirements for artifact lifecycle, skill activation, and context-management actions in both chat and studio flows.
- Extend artifact library and packaging capabilities for delivery-ready outputs.

## Scope Notes
- This proposal defines behavior and quality expectations only; implementation is deferred to apply stage.
- This proposal extends existing skills reliability work in `audit-skills-integration-reliability` without replacing it.
- `openspec/project.md` is currently missing, and there are no baseline specs under `openspec/specs`; this change establishes new capability baselines.

## Research Basis (External)
This proposal is informed by product and documentation research across leading artifact/canvas/app-builder implementations:
- Claude Artifacts (dedicated artifact space, versioned iteration, publishing/customizing, persistent storage, MCP access).
- ChatGPT Canvas (sandboxed React/HTML rendering, version history, code execution controls, sharing).
- Sandpack docs (custom setup, hosted bundler patterns, dependency and registry controls, security/performance model).
- Replit Agent/Preview/App Testing (autonomous test loops, checkpoints/rollback, live preview + devtools).
- v0 (prompt->iterate->integrate->ship lifecycle, design mode, project/workspace model, git/PR loop, production-like preview).
- Bolt.new and Lovable (browser-native full-stack execution and visual edit loops).

## Impact
- Affected specs:
  - `artifact-studio-workspace`
  - `artifact-runtime-and-xhtml`
  - `artifact-agent-orchestration`
  - `artifact-library-and-delivery`
  - `artifact-observability-chunks`
- Primary planned code areas:
  - `src/renderer/src/features/artifacts/**`
  - `src/renderer/src/store/artifacts.ts`
  - `src/renderer/src/store/settings.ts`
  - `src/renderer/src/aiCore/**`
  - `src/main/services/ArtifactServerService.ts`
  - `src/main/services/agents/**`
  - settings UI pages and assistant/agent/conversation configuration surfaces
